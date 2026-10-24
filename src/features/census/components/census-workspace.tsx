'use client';

import Link from 'next/link';
import { CensusScopeEditor } from './census-scope-editor';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { EMPLOYMENT_LABELS, EMPLOYMENT_STATUSES } from '@/features/community/domain';
import { INDUSTRIES } from '@/features/establishments/domain';

const endpoint = '/api/admin/census/records';
const control = 'min-h-11 w-full rounded-xl border border-[#DFE9F2] bg-white px-3 py-2 text-sm text-[#103C64] focus-visible:outline-2 focus-visible:outline-[#1A78B4]';
const button = 'min-h-11 rounded-xl bg-[#153F67] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';
const panel = 'rounded-[22px] border border-[#DFE9F2] bg-white p-5 sm:p-7';
export async function censusApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init }); const result = await response.json();
  if (!response.ok) throw Error(result.error || 'The census request failed.'); return result as T;
}
type Item = { view?: string; id: string; name: string; email: string; surveyYear: number; status: string; barangay: string | null; category: string | null };
type List = { items: Item[]; total: number; page: number; pageSize: number };
type Review = { id: string; actorId: string; action: string; note: string | null; createdAt: string; actor: { name: string } };
type Revision = { id: string; revision: number; action: string; createdAt: string; answersJson: string; reviews: Review[] };
type Detail = { record: Record<string, unknown> | null; draft: Record<string, unknown> | null; workspace?: Record<string, unknown>; history: { total: number; page: number; pageSize: number; items: Revision[] } };
type Roster = { needsConfirmation: boolean; barangay: string; count: number | null; version: number; confirmedAt: string | null; maintainedBy?: string | null; members: { id: string; name: string }[] };
type Staff = { id: string; name: string; department: string | null; censusScope: { version: number; barangaysJson: string } | null; staffPermissions: { module: string }[] };
const date = (value: string) => new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) + ' PHT';

export function CensusWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const [filter, setFilter] = useState({ kind: 'INDIVIDUAL', year: '', barangay: '', employment: '', industry: '', status: '', search: '', page: '1' });
  const [query, setQuery] = useState(filter), [rows, setRows] = useState<List | null>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Item | null>(null), [historyPage, setHistoryPage] = useState(1), [detail, setDetail] = useState<Detail | null>(null);
  const [rosters, setRosters] = useState<Roster[]>([]), [staff, setStaff] = useState<Staff[]>([]);
  const [editRoster, setEditRoster] = useState<Roster | null>(null), [designated, setDesignated] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    void censusApi<List>(endpoint + '?' + new URLSearchParams(query), { signal: abort.signal }).then(setRows).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [query, refresh]);
  useEffect(() => {
    const abort = new AbortController();
    void Promise.all([censusApi<Roster[]>(endpoint + '?view=roster', { signal: abort.signal }), isAdmin ? censusApi<Staff[]>(endpoint + '?view=authority', { signal: abort.signal }) : Promise.resolve([])]).then(([r, s]) => { setRosters(r); setStaff(s); }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [isAdmin, refresh]);
  useEffect(() => {
    if (!selected) return;
    const abort = new AbortController();
    void censusApi<Detail>(endpoint + '?' + new URLSearchParams({ kind: query.kind, id: selected.id, page: String(historyPage) }), { signal: abort.signal }).then(value => { setDetail(value); if (!dialog.current?.open) dialog.current?.showModal(); }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [selected, query.kind, historyPage, refresh]);
  async function mutate(input: Record<string, unknown>) {
    setBusy(true); setError(''); setMessage('');
    try { await censusApi(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }); setMessage('Saved. The authenticated actor and Philippine display time are recorded.'); setRefresh(n => n + 1); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.'); return false; } finally { setBusy(false); }
  }
  const change = (key: keyof typeof filter, value: string) => setFilter(previous => ({ ...previous, [key]: value, page: '1', ...(key === 'kind' ? { employment: '', industry: '' } : {}) }));
  function search(event: FormEvent) { event.preventDefault(); setSelected(null); setError(''); setRows(null); setQuery({ ...filter, page: '1' }); }
  return <div className="space-y-6 text-[#56718B]">
    <header className={panel}><p className="text-xs font-bold uppercase tracking-wider text-[#1A78B4]">Worker Census &amp; Social Profiling</p><h1 className="mt-3 text-3xl font-extrabold text-[#103C64]">Protected census records</h1><p className="mt-3 max-w-3xl text-sm leading-6">Review individual and establishment survey records, working drafts and protected history within your authorized barangays. Organizational worker counts and imported activity rows are separate from individual respondents.</p><Link className="mt-4 inline-block font-semibold text-[#1A78B4] underline" href="/admin/census/imports">Open validated imports and source history →</Link></header>
    {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}{message && <p role="status" className="rounded-2xl bg-[#EAF5FD] p-4 text-sm">{message}</p>}
    <section className={panel}><h2 className="text-lg font-bold text-[#103C64]">Find survey records</h2><form onSubmit={search} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Record type<select aria-label="Record type" className={control} value={filter.kind} onChange={e => change('kind', e.target.value)}><option value="INDIVIDUAL">Individual surveys</option><option value="ESTABLISHMENT">Establishment surveys</option></select></label>
      <label className="text-sm">Survey year<input className={control} type="number" min="2020" max={new Date().getFullYear() + 1} placeholder="All years" value={filter.year} onChange={e => change('year', e.target.value)} /></label>
      <label className="text-sm">Barangay<select className={control} value={filter.barangay} onChange={e => change('barangay', e.target.value)}><option value="">All authorized barangays</option>{rosters.map(r => <option key={r.barangay}>{r.barangay}</option>)}</select></label>
      <label className="text-sm">Visible response status<select className={control} value={filter.status} onChange={e => change('status', e.target.value)}><option value="">All statuses</option>{['DRAFT', 'SUBMITTED', 'WITHDRAWN'].map(s => <option key={s}>{s}</option>)}</select></label>
      {filter.kind === 'INDIVIDUAL' ? <label className="text-sm">Employment category<select className={control} value={filter.employment} onChange={e => change('employment', e.target.value)}><option value="">All categories</option>{EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{EMPLOYMENT_LABELS[s]}</option>)}</select></label> : <label className="text-sm">Industry<select className={control} value={filter.industry} onChange={e => change('industry', e.target.value)}><option value="">All industries</option>{INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}</select></label>}
      <label className="text-sm">Name or account email<input className={control} value={filter.search} maxLength={180} onChange={e => change('search', e.target.value)} /></label><button className={button}>Apply filters</button>
    </form><p className="my-4 text-sm" role="status">{rows ? `${rows.total} annual records · page ${rows.page} of ${Math.max(1, Math.ceil(rows.total / rows.pageSize))}` : 'Loading records…'}</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows?.items.map(row => <article key={row.id} className="min-w-0 rounded-2xl border border-[#DFE9F2] p-4"><h3 className="break-words font-bold text-[#103C64]">{row.name}</h3><p className="mt-1 break-all text-xs">{row.email}</p><p className="mt-3 text-sm">{row.surveyYear} · {row.status} · {row.barangay || 'Unknown barangay'}</p><p className="mt-2 text-xs">{row.view === 'HISTORY' ? 'Historical revision match' : row.view === 'DRAFT' ? 'Authorized working draft' : 'Authorized retained response'}</p><p className="mt-1 text-xs">{row.category || 'Category unknown'}</p><button className={button + ' mt-4'} onClick={() => { setHistoryPage(1); setDetail(null); setSelected(row); }}>View details and history</button></article>)}</div>
      {rows?.total === 0 && <p className="py-6">No authorized records match these filters.</p>}<div className="mt-5 flex gap-3"><button className={button} disabled={!rows || rows.page <= 1} onClick={() => setQuery(q => ({ ...q, page: String(Number(q.page) - 1) }))}>Previous records</button><button className={button} disabled={!rows || rows.page * rows.pageSize >= rows.total} onClick={() => setQuery(q => ({ ...q, page: String(Number(q.page) + 1) }))}>Next records</button></div>
    </section>
    <section className={panel}><h2 className="text-lg font-bold text-[#103C64]">Designated survey-assistance staff</h2><p className="mt-2 text-sm">Admin-maintained designations, not real-time availability. Roster membership does not grant CENSUS access.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rosters.map(r => <article key={r.barangay} className="rounded-2xl border border-[#DFE9F2] p-4"><h3 className="font-bold text-[#103C64]">{r.barangay}</h3><p className="mt-2">{r.count === null ? r.needsConfirmation ? 'Needs roster confirmation' : 'Not configured' : `${r.count} designated staff`}</p><p className="mt-2 text-xs">{r.members.map(s => s.name).join(', ')}</p>{r.needsConfirmation && <p className="mt-2 text-xs">A designated account is no longer active Staff. Admin confirmation is needed.</p>}{r.confirmedAt && <p className="mt-2 text-xs">Confirmed {date(r.confirmedAt)}{r.maintainedBy ? ` by ${r.maintainedBy}` : ''}</p>}{isAdmin && <button className={button + ' mt-3'} onClick={() => { setEditRoster(r); setDesignated(r.members.map(s => s.id)); }}>Maintain {r.barangay} roster</button>}</article>)}</div>
      {isAdmin && editRoster && <form className="mt-6 rounded-2xl bg-[#F8FBFE] p-5" onSubmit={async e => { e.preventDefault(); if (await mutate({ operation: 'ASSISTANCE_ROSTER', barangay: editRoster.barangay, staffIds: designated, expectedVersion: editRoster.version })) setEditRoster(null); }}><h3 className="font-bold text-[#103C64]">Confirm {editRoster.barangay} assistance roster</h3><p className="my-2 text-sm">An empty selection explicitly confirms zero designated staff.</p><fieldset className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">Designated existing Staff accounts</legend>{staff.map(s => <label key={s.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={designated.includes(s.id)} onChange={e => setDesignated(v => e.target.checked ? [...v, s.id] : v.filter(id => id !== s.id))} />{s.name} · {s.department || 'No department'}</label>)}</fieldset><div className="mt-4 flex flex-wrap gap-3"><button disabled={busy} className={button}>Confirm assistance roster</button><button type="button" className={button} onClick={() => setEditRoster(null)}>Cancel roster edit</button></div></form>}
    </section>
    {isAdmin && <CensusScopeEditor staff={staff} busy={busy} save={mutate} />}
    <dialog ref={dialog} onCancel={() => setSelected(null)} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(960px,94vw)] overflow-y-auto rounded-[22px] border border-[#DFE9F2] bg-white p-5 text-[#56718B] shadow-xl backdrop:bg-[#103C64]/40 sm:p-8"><div className="flex items-start justify-between gap-3"><h2 className="text-xl font-bold text-[#103C64]">Survey details and history</h2><button className={button} onClick={() => { dialog.current?.close(); setSelected(null); }}>Close details</button></div><p className="my-3 break-words text-sm">{selected?.name} · {selected?.surveyYear}</p>{error && <p role="alert" className="my-3 text-red-800">{error}</p>}{message && <p role="status" className="my-3">{message}</p>}
      {detail && <><h3 className="mt-5 font-bold text-[#103C64]">Current submitted / retained record</h3><AnswerFields value={detail.record} /><h3 className="mt-5 font-bold text-[#103C64]">Separate working draft</h3><AnswerFields value={detail.draft} /><h3 className="mt-6 font-bold text-[#103C64]">Immutable history · {detail.history.total} revisions</h3><p className="my-2 text-sm">Only answers within your record scope are shown. Review events apply only to their exact submitted revision. An earlier approval does not approve later edits.</p>{detail.history.items.map(revision => <article key={revision.id} className="my-4 rounded-2xl border border-[#DFE9F2] p-4"><h4 className="font-bold text-[#103C64]">Revision {revision.revision} · {revision.action}</h4><p className="text-xs">{date(revision.createdAt)}</p><details className="my-3"><summary className="cursor-pointer text-sm font-semibold">Complete revision answers</summary><AnswerFields value={JSON.parse(revision.answersJson)} /></details>{revision.reviews.length === 0 && <p className="text-sm">No assessment, verification or approval recorded for this revision.</p>}{revision.reviews.map(review => <p key={review.id} className="my-2 break-words text-sm">{review.action} · {review.actor.name} · {date(review.createdAt)}{review.note ? ` · ${review.note}` : ''}</p>)}{revision.action === 'SUBMITTED' && <ReviewForm busy={busy} isAdmin={isAdmin} save={input => mutate({ ...input, kind: query.kind, revisionId: revision.id })} />}</article>)}<div className="mt-4 flex gap-3"><button className={button} disabled={historyPage <= 1} onClick={() => setHistoryPage(p => p - 1)}>Previous history</button><button className={button} disabled={historyPage * detail.history.pageSize >= detail.history.total} onClick={() => setHistoryPage(p => p + 1)}>Next history</button></div></>}
    </dialog>
  </div>;
}
function ReviewForm({ busy, isAdmin, save }: { busy: boolean; isAdmin: boolean; save: (input: Record<string, unknown>) => Promise<boolean> }) {
  const [action, setAction] = useState('ASSESSED'), [note, setNote] = useState(''), pending = useRef<{ key: string; payload: string } | null>(null);
  return <form className="mt-4 space-y-3 border-t border-[#DFE9F2] pt-4" onSubmit={async e => { e.preventDefault(); const payload = JSON.stringify({ action, note }); if (!pending.current || pending.current.payload !== payload) pending.current = { key: crypto.randomUUID(), payload }; if (await save({ action, note, requestKey: pending.current.key })) { pending.current = null; setNote(''); } }}><label className="block text-sm">Review action<select aria-label="Review action" className={control} value={action} onChange={e => setAction(e.target.value)}><option value="ASSESSED">Record assessment</option><option value="VERIFIED">Record verification</option>{isAdmin && <option value="APPROVED">Record Admin approval</option>}</select></label><label className="block text-sm">Review note (optional)<textarea maxLength={1000} className={control} value={note} onChange={e => setNote(e.target.value)} /></label><button className={button} disabled={busy}>Record review event</button></form>;
}
export function AnswerFields({ value }: { value: Record<string, unknown> | null }) {
  if (!value) return <p className="my-3 text-sm">None recorded.</p>;
  return <dl className="my-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">{Object.entries(value).filter(([key]) => !['id', 'userId', 'establishmentId', 'identityKey', 'ownerId', 'requestKey', 'payloadHash'].includes(key)).map(([key, raw]) => {
    let answer = raw; if (typeof raw === 'string' && key.endsWith('Json')) { try { answer = JSON.parse(raw); } catch { /* Legacy text remains visible. */ } }
    const display = answer === null || answer === undefined || answer === '' ? 'Unknown / not answered' : typeof answer === 'boolean' ? answer ? 'Yes' : 'No' : Array.isArray(answer) ? answer.length ? answer.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ') : 'None recorded' : typeof answer === 'object' ? JSON.stringify(answer) : String(answer);
    return <div key={key} className="min-w-0"><dt className="font-semibold text-[#103C64]">{key.replace(/Json$/, '').replace(/([A-Z])/g, ' $1').replace(/^./, x => x.toUpperCase())}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{display}</dd></div>;
  })}</dl>;
}
