'use client';
import { useState } from 'react';
import { LOS_BANOS_BARANGAYS } from '@/features/emergency/domain';

type Staff = { id: string; name: string; censusScope: { version: number; barangaysJson: string } | null; staffPermissions: { module: string }[] };
type Edit = { staffId: string; barangays: string[]; version: number };
const control = 'min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground';
const button = 'min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';

export function CensusScopeEditor({ staff, busy, save }: { staff: Staff[]; busy: boolean; save: (input: Record<string, unknown>) => Promise<boolean> }) {
  // The edit values and the version they were observed with form one snapshot.
  // Refreshing authority after an unrelated action never updates this snapshot.
  const [edit, setEdit] = useState<Edit | null>(null);
  const target = staff.find(s => s.id === edit?.staffId);
  const stale = Boolean(edit && (!target || (target.censusScope?.version ?? 0) !== edit.version));
  function load(current: Staff | undefined) {
    setEdit(current ? { staffId: current.id, barangays: current.censusScope ? JSON.parse(current.censusScope.barangaysJson) : [], version: current.censusScope?.version ?? 0 } : null);
  }
  return <section className="rounded-[22px] border border-border bg-card p-5 sm:p-7">
    <h2 className="text-lg font-bold text-foreground">Staff record scope</h2>
    <p className="mt-2 text-sm">Assign authorized record barangays independently of the assistance roster. The existing CENSUS module grant is also required.</p>
    {stale && <div role="alert" className="mt-4 rounded-2xl bg-muted p-4 text-sm"><p>Record scope changed in another session. Reload before saving.</p><button type="button" className={button + ' mt-3'} onClick={() => load(target)}>Reload record scope</button></div>}
    <form className="mt-4 space-y-4" onSubmit={async event => {
      event.preventDefault();
      if (!edit || stale) return;
      if (await save({ operation: 'RECORD_SCOPE', staffId: edit.staffId, barangays: edit.barangays, expectedVersion: edit.version })) setEdit(null);
    }}>
      <label className="block text-sm">Staff account<select aria-label="Staff account" required className={control} value={edit?.staffId ?? ''} onChange={event => load(staff.find(s => s.id === event.target.value))}>
        <option value="">Choose Staff</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name} · {s.staffPermissions.length ? 'CENSUS granted' : 'CENSUS not granted'}</option>)}
      </select></label>
      <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><legend className="mb-3 text-sm">Authorized record barangays</legend>
        {LOS_BANOS_BARANGAYS.map(barangay => <label key={barangay} className="flex gap-2 text-sm"><input type="checkbox" disabled={!edit || busy} checked={edit?.barangays.includes(barangay) ?? false} onChange={event => setEdit(previous => previous ? { ...previous, barangays: event.target.checked ? [...previous.barangays, barangay] : previous.barangays.filter(b => b !== barangay) } : previous)} />{barangay}</label>)}
      </fieldset>
      <button disabled={busy || !edit || stale} className={button}>Save record scope</button>
    </form>
  </section>;
}
