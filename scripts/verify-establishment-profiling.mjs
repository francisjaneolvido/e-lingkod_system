// Reuse the guarded disposable database / server / build runner.
process.argv.push("--establishments");
await import("./verify-citizen-profiling.mjs");
