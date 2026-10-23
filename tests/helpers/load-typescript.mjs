import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

// Load actual server modules in Node without a Next.js build. Only the
// server-only environment marker is substituted; database/auth code is real.
export function loadServerTypescript() {
  return registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") return { url: "data:text/javascript,export%20%7B%7D", shortCircuit: true };
      if (["next/headers", "next/navigation", "next/server"].includes(specifier)) specifier += ".js";
      if (specifier.startsWith("@/")) specifier = pathToFileURL(path.resolve("src", specifier.slice(2))).href;
      if (specifier.startsWith("file:") || specifier.startsWith(".")) {
        const url = new URL(specifier, context.parentURL);
        if (url.protocol === "file:" && !path.extname(fileURLToPath(url)) && fs.existsSync(fileURLToPath(url) + ".ts")) {
          return { url: url.href + ".ts", shortCircuit: true };
        }
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.endsWith(".ts")) {
        const source = ts.transpileModule(fs.readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
        return { format: "module", source, shortCircuit: true };
      }
      return nextLoad(url, context);
    },
  });
}
