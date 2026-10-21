import { CivicError } from "./validation";

export type CitizenFeedbackDecision = "CONFIRMED" | "DISPUTED";
export function parseCitizenFeedback(form: FormData) {
  const decision = form.get("decision");
  if (decision !== "CONFIRMED" && decision !== "DISPUTED") throw new CivicError("Choose whether the issue has been resolved.");
  const submissionId = form.get("submissionId");
  if (typeof submissionId !== "string" || submissionId.length < 12 || submissionId.length > 191) throw new CivicError("Reload the report to review the latest verified resolution.");
  const rawVersion = form.get("version");
  const version = typeof rawVersion === "string" && /^\d+$/.test(rawVersion) ? Number(rawVersion) : NaN;
  if (!Number.isSafeInteger(version) || version < 1) throw new CivicError("Reload the report before responding.");
  const rawReason = form.get("reason");
  if (rawReason !== null && typeof rawReason !== "string") throw new CivicError("Write your feedback as text.");
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  if (decision === "DISPUTED" && (reason.length < 20 || reason.length > 1500)) {
    throw new CivicError("Please describe why the concern is still unresolved (20–1500 characters).");
  }
  if (decision === "CONFIRMED" && reason) throw new CivicError("Confirmation does not need a reason.");
  const photos = form.getAll("photos");
  if (photos.length > 3) throw new CivicError("Attach at most 3 additional photos.");
  if (decision === "CONFIRMED" && photos.length > 0) throw new CivicError("Additional evidence is only needed when requesting another review.");
  const validatedDecision: CitizenFeedbackDecision = decision;
  return { decision: validatedDecision, submissionId, version, reason: decision === "DISPUTED" ? reason : null, photos };
}
