import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import {ensurePrismaClient} from '../../scripts/lib/prisma-client.mjs';

// Load actual server modules in Node without a Next.js build. Only the
// server-only environment marker is substituted; database/auth code is real.
export function loadServerTypescript() {
  ensurePrismaClient();
  return registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") return { url: "data:text/javascript,export%20%7B%7D", shortCircuit: true };
      if (specifier === "next/image") {
        // Next's Image CommonJS entry needs its real default export in native ESM.
        const image = nextResolve("next/image.js", context).url;
        const source = `import image from ${JSON.stringify(image)}; export default image.default ?? image;`;
        return { url: "data:text/javascript;base64," + Buffer.from(source).toString("base64"), shortCircuit: true };
      }
      if (["next/headers", "next/navigation", "next/server", "next/link", "next/image"].includes(specifier)) specifier += ".js";
      if (specifier.startsWith("@/")) specifier = pathToFileURL(path.resolve("src", specifier.slice(2))).href;
      if (specifier.startsWith("file:") || specifier.startsWith(".")) {
        const url = new URL(specifier, context.parentURL);
        if (url.protocol === "file:" && !path.extname(fileURLToPath(url))) {
          for (const extension of [".ts", ".tsx"]) {
            if (fs.existsSync(fileURLToPath(url) + extension)) return { url: url.href + extension, shortCircuit: true };
          }
        }
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      // Node markup/domain tests do not render CSS; browser suites verify it.
      if (url.endsWith(".css")) return { format: "module", source: "export default {};", shortCircuit: true };
      if (/\.tsx?$/.test(url)) {
        const source = ts.transpileModule(fs.readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }, fileName: fileURLToPath(url) }).outputText;
        return { format: "module", source, shortCircuit: true };
      }
      return nextLoad(url, context);
    },
  });
}
