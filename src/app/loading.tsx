export default function Loading(){
 return <main className="mx-auto grid min-h-[65vh] max-w-3xl content-center gap-5 px-6 py-12" role="status" aria-label="Loading page"><p className="elb-context-label">eLingkod Bayan</p><p className="text-2xl font-semibold text-foreground">Opening your workspace…</p><div className="grid gap-3" aria-hidden="true"><div className="h-3 w-3/4 rounded-full bg-muted"/><div className="h-3 w-full rounded-full bg-muted"/><div className="h-3 w-1/2 rounded-full bg-muted"/></div><p className="elb-help">Your current work stays in place while the page loads.</p></main>;
}
