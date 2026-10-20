import { CivicError } from "./validation";

export function parseResolutionRemarks(value: unknown): string {
  if (typeof value !== "string") throw new CivicError("Describe the completed repair or action.");
  const remarks = value.trim();
  if (remarks.length < 20 || remarks.length > 1500) throw new CivicError("Resolution remarks must be 20–1500 characters.");
  return remarks;
}

export function parseResolutionVersion(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") throw new CivicError("Reload the case before submitting proof.");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new CivicError("Reload the case before submitting proof.");
  return number;
}

export function parseResolutionDecision(body: unknown): { submissionId: string; version: number; decision: "APPROVE" | "RETURN"; note: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new CivicError("Invalid verification request.");
  const data = body as Record<string, unknown>;
  if (data.decision !== "APPROVE" && data.decision !== "RETURN") throw new CivicError("Choose approve or return for rework.");
  if (typeof data.submissionId !== "string" || data.submissionId.length < 3 || data.submissionId.length > 191) throw new CivicError("Select a valid resolution submission.");
  const note = typeof data.note === "string" ? data.note.trim() : "";
  if (note.length > 1500 || (data.decision === "RETURN" && note.length < 10)) throw new CivicError("Explain why evidence must be revised (10–1500 characters).");
  return { submissionId: data.submissionId, version: parseResolutionVersion(data.version), decision: data.decision, note };
}
