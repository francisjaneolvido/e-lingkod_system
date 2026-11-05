// Direct auth.handler calls have no Next request scope. Keep the production
// callback intact while native DB tests explicitly own and drain every task.
export function installNativeAuthBackground(auth) {
  const original = auth.options.advanced?.backgroundTasks;
  const pending = new Set();
  auth.options.advanced ??= {};
  auth.options.advanced.backgroundTasks = { handler: promise => {
    const tracked = Promise.resolve(promise);
    pending.add(tracked);
    tracked.finally(() => pending.delete(tracked)).catch(() => {});
  } };
  return {
    async drain() { while (pending.size) await Promise.all([...pending]); },
    async restore() {
      try { while (pending.size) await Promise.allSettled([...pending]); }
      finally { auth.options.advanced.backgroundTasks = original; }
    },
  };
}
