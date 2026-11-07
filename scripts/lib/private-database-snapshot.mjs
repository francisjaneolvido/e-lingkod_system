import {tables,identifier} from '../demo/database.mjs';

// Private maintenance proof, deliberately distinct from sanitized demo exports.
// Keep sessions, auth tokens and binary/large-integer values; never log rows.
const encode=value=>Buffer.isBuffer(value)?{bufferHex:value.toString('hex')}:typeof value==='bigint'?{bigint:value.toString()}:value;
export async function privateSnapshot(db){const result={};for(const table of await tables(db)){result[table]=(await db.query('SELECT * FROM '+identifier(table))).map(row=>JSON.stringify(Object.fromEntries(Object.entries(row).map(([key,value])=>[key,encode(value)])))).sort();}return result;}
export const comparableDdl=ddl=>ddl.replace(/\bCHARACTER SET ([a-zA-Z0-9_]+) COLLATE (\1_[a-zA-Z0-9_]+)/g,'COLLATE $2');
export async function privateSchema(db){
  // A restored MySQL table can spell out a redundant column CHARACTER SET
  // before COLLATE. The collation already fixes that charset. Retain all other
  // DDL and independently compare native per-column charset/type/default data.
  const result={};for(const table of await tables(db)){
    const [row]=await db.query('SHOW CREATE TABLE '+identifier(table));
    const columns=await db.query('SELECT COLUMN_NAME,ORDINAL_POSITION,COLUMN_DEFAULT,IS_NULLABLE,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH,NUMERIC_PRECISION,NUMERIC_SCALE,DATETIME_PRECISION,CHARACTER_SET_NAME,COLLATION_NAME,COLUMN_TYPE,COLUMN_KEY,EXTRA,GENERATION_EXPRESSION,COLUMN_COMMENT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[table]);
    result[table]={ddl:comparableDdl(row['Create Table']),columns:columns.map(column=>Object.fromEntries(Object.entries(column).map(([key,value])=>[key,encode(value)])))};
  }return result;
}
export async function assertPrivateOriginalFields(db,before){const current=await privateSnapshot(db);for(const [table,rows]of Object.entries(before)){if(table==='_prisma_migrations')continue;const actual=(current[table]||[]).map(JSON.parse);for(const serialized of rows){const old=JSON.parse(serialized);if(!actual.some(row=>Object.keys(old).every(key=>JSON.stringify(row[key])===JSON.stringify(old[key]))))throw Error('Migration changed a pre-existing private field in '+table);}}}
