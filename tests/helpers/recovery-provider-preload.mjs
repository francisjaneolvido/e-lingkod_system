// Explicit test-process preload only. Production transport has no bypass.
import fs from "node:fs/promises";
import path from "node:path";

const configured = process.env.ELB_RECOVERY_PROVIDER_CONTROL_FILE;
if (configured) {
  const target = new URL(process.env.DATABASE_URL || "missing:");
  const control = path.resolve(configured);
  const scratch = path.resolve(".scratch/site-release") + path.sep;
  if (process.env.ELB_SITE_RELEASE_TEST_DATABASE !== "true"
    || target.protocol !== "mysql:"
    || !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)
    || !/^elb_site_release_test_[a-z0-9_]+$/.test(target.pathname.slice(1))
    || !control.startsWith(scratch)
    || process.env.PASSWORD_RESET_CAPTURE_DIR
    || process.env.RESEND_API_KEY !== "elb-disposable-provider") {
    throw new Error("Controlled recovery provider requires an explicit disposable test process.");
  }
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url !== "https://api.resend.com/emails") return realFetch(input, init);
    // Never send the synthetic key or message outside this process, including on setup errors.
    const message = JSON.parse(init?.body || "{}");
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    if (init?.method !== "POST" || recipients.length !== 1 || !/^browser\.[a-z]+@example\.test$/.test(recipients[0])) {
      throw new Error("Controlled recovery provider refused a non-synthetic message.");
    }
    const state = JSON.parse(await fs.readFile(control, "utf8"));
    if (!/^[a-f0-9-]{36}$/.test(state.id) || !["success", "failure"].includes(state.result)) {
      throw new Error("Invalid controlled recovery provider state.");
    }
    const prefix = path.join(path.dirname(control), state.id);
    await fs.writeFile(prefix + ".started", "started", { flag: "wx" });
    const deadline = Date.now() + 10000;
    for (;;) {
      init?.signal?.throwIfAborted();
      if (Date.now() > deadline) throw new Error("Controlled recovery provider was not released.");
      try { await fs.access(prefix + ".release"); break; }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    await fs.writeFile(prefix + ".finished", "finished");
    return new Response("{}", { status: state.result === "success" ? 200 : 503, headers: { "content-type": "application/json" } });
  };
}
