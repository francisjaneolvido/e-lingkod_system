import "server-only";
import { unstable_rethrow } from "next/navigation";
import { CivicError } from "../validation";

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: PRIVATE_HEADERS });
}

export function apiFailure(error: unknown) {
  unstable_rethrow(error);
  if (error instanceof CivicError) return json({ error: error.message }, error.status);
  // Never echo database URLs, queries, stack traces, or submitted personal data.
  console.error("[civic] Request failed", error instanceof Error ? error.name : "UnknownError");
  return json({ error: "The action desk is unavailable right now. Please try again shortly. If setup is new, check that the Civic Reporting migration has been applied." }, 503);
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
  if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new CivicError("Please submit from your E-Lingkod Bayan browser tab.", 403);
  }
}

export async function readLimitedBody(request: Request, limit: number) {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > limit) throw new CivicError("Upload is too large. Reduce the photo file sizes.", 413);
  if (!request.body) throw new CivicError("The request is empty.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new CivicError("Upload is too large. Reduce the photo file sizes.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function readMultipart(request: Request, limit: number) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new CivicError("Choose photos and submit the report form.");
  const bytes = await readLimitedBody(request, limit);
  try {
    return await new Response(new Uint8Array(bytes), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
  } catch { throw new CivicError("The uploaded form could not be read. Please try again."); }
}

export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new CivicError("Invalid update format.");
  try { return JSON.parse((await readLimitedBody(request, 12_000)).toString("utf8")) as unknown; }
  catch (error) { if (error instanceof CivicError) throw error; throw new CivicError("Invalid update format."); }
}
