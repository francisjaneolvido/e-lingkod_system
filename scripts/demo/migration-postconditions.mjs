import fs from 'node:fs';
import { snapshot, digest, identifier } from './database.mjs';

// Explicitly reviewed postconditions: additive DDL must not adopt manual data
// in tables/columns which did not exist in the pre-migration snapshot.
const contracts = {
  '20261024080000_census_records_imports': {
    tables: ['census_review', 'census_staff_scope', 'census_assistance_roster', 'census_assistance_member', 'census_audit', 'census_source_record', 'census_import_lock'],
    columns: {
      community_import_batch: { reviewNeededCount: 0, skippedCount: 0, sourceKey: null, surveyYear: null },
      community_import_record: { contentHash: null, outcome: 'ACCEPTED', outcomeReason: null, sourceKey: null, surveyYear: null },
    },
  },
  '20261024090000_spes_source_year': { tables: [], columns: { spes_import_batch: { surveyYear: null }, spes_survey_record: { originalRowNumber: null } } },
  '20261024100000_census_ignored_provenance': { tables: [], columns: {}, removeIgnoredRaw: true },
};
const failure = reason => { throw new Error('Demo migration preservation conflict: ' + reason + '; manual records preserved, checkpoint not adopted.'); };
const migrationHash = name => digest(fs.readFileSync('prisma/migrations/' + name + '/migration.sql', 'utf8'));
export async function preparePostconditions(db, pending, before) {
  const columns = {};
  for (const table of Object.keys(before)) columns[table] = (await db.query('SHOW COLUMNS FROM ' + identifier(table))).map(c => c.Field);
  const migrations = pending.map(name => {
    if (!contracts[name]) failure('unreviewed migration ' + name);
    return { name, hash: migrationHash(name), contract: contracts[name] };
  });
  return { version: 2, columns, migrations };
}
export function validateUpgradeJournal(journal, pending) {
  const conditions = journal.postconditions;
  if (conditions?.version !== 2) failure('interrupted legacy checkpoint lacks new-table/column preconditions');
  for (const m of conditions.migrations) {
    if (!contracts[m.name] || m.hash !== migrationHash(m.name) || digest(m.contract) !== digest(contracts[m.name])) failure('migration contract changed');
  }
  if (pending.some(name => !conditions.migrations.some(m => m.name === name))) failure('additional migration appeared during recovery');
}
export async function assertPostconditions(db, journal) {
  const after = await snapshot(db), before = journal.before, conditions = journal.postconditions;
  const newTables = new Set(conditions.migrations.flatMap(m => m.contract.tables));
  const additions = {};
  for (const m of conditions.migrations) for (const [table, cols] of Object.entries(m.contract.columns)) additions[table] = { ...additions[table], ...cols };
  for (const table of Object.keys(after)) {
    if (table in before) continue;
    if (!newTables.has(table) || after[table].length) failure('unexpected data in new table ' + table);
  }
  for (const table of newTables) if (!(table in after)) failure('missing migrated table ' + table);
  const removeIgnored = conditions.migrations.some(m => m.contract.removeIgnoredRaw);
  for (const [table, oldRows] of Object.entries(before)) {
    if (table === '_prisma_migrations') continue;
    if (!(table in after) || after[table].length !== oldRows.length) failure('existing row count changed in ' + table);
    const oldColumns = conditions.columns[table], extra = additions[table] ?? {};
    const privacyRows = new Set(removeIgnored && table === 'community_import_record' ? oldRows.flatMap(value => {
      const row = JSON.parse(value);
      try { return Object.hasOwn(JSON.parse(row.rawJson), 'IGNORE') ? [row.id] : []; } catch { return []; }
    }) : []);
    const currentColumns = (await db.query('SHOW COLUMNS FROM ' + identifier(table))).map(c => c.Field);
    if (JSON.stringify([...currentColumns].sort()) !== JSON.stringify([...oldColumns, ...Object.keys(extra)].sort())) failure('unexpected columns in ' + table);
    const projected = after[table].map(value => {
      const row = JSON.parse(value);
      for (const [column, expected] of Object.entries(extra)) if (row[column] !== expected) failure('unexpected value in new column ' + table + '.' + column);
      return JSON.stringify(Object.fromEntries(oldColumns.map(column => [column, row[column]])));
    }).sort();
    const expected = oldRows.map(value => {
      const row = JSON.parse(value);
      if (removeIgnored && table === 'community_import_record') {
        try { const raw = JSON.parse(row.rawJson); if (Object.hasOwn(raw, 'IGNORE')) { delete raw.IGNORE; row.rawJson = JSON.stringify(raw); } } catch { /* Invalid legacy JSON is unchanged. */ }
      }
      return JSON.stringify(Object.fromEntries(oldColumns.map(column => [column, row[column]])));
    }).sort();
    // MySQL may canonicalize whitespace in JSON_REMOVE's string result.
    const normalize = values => values.map(value => {
      const row = JSON.parse(value);
      if (privacyRows.has(row.id)) { try { row.rawJson = JSON.stringify(JSON.parse(row.rawJson)); } catch { /* Preserve invalid JSON. */ } }
      return JSON.stringify(row);
    }).sort();
    if (JSON.stringify(normalize(projected)) !== JSON.stringify(normalize(expected))) failure('existing values changed in ' + table);
  }
  return after;
}
