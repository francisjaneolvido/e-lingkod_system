import { REPORT_CATEGORIES, type ReportCategory } from "./config";

export type EvidenceResult = { status: "ACCEPTED" | "REJECTED" | "UNCERTAIN"; score: number; observations: string; feedback: string; validatedAt: Date };

const examples: Record<ReportCategory, string> = {
  ROADS_DRAINAGE: "road damage, potholes, blocked drainage, canals or actual flooding (match the specific described issue)",
  STREETLIGHTS: "a streetlight and visible damage or the reported unlit situation; an ordinary daylight street view alone is insufficient",
  WASTE_SANITATION: "garbage, dumping, sanitation problems or visibly affected surroundings",
  PUBLIC_FACILITIES: "visible damage or a problem involving the specifically described public facility",
  ENVIRONMENT: "fallen trees, damaged branches, waterways or the specifically described environmental hazard",
  OTHER: "visible evidence of the specific problem described in the title and description",
};

export function evidenceContext(category: string, title: string, description: string) {
  const selected = REPORT_CATEGORIES.find(item => item.value === category);
  if (!selected) throw new Error("Unknown civic report category");
  return `Category: ${selected.label}. Visible evidence expected: ${examples[selected.value]}. Citizen title: ${title.slice(0, 120)}. Citizen description: ${description.slice(0, 2000)}.`;
}

export function parseEvidenceResponse(input: unknown): EvidenceResult {
  if (!input || typeof input !== "object") throw new Error("Invalid AI evidence response");
  const data = input as Record<string, unknown>;
  if (typeof data.relevant !== "boolean" || typeof data.safe !== "boolean" || typeof data.score !== "number" || !Number.isFinite(data.score) || data.score < 0 || data.score > 1 || typeof data.observations !== "string" || !data.observations.trim() || data.observations.length > 500 || typeof data.feedback !== "string" || !data.feedback.trim() || data.feedback.length > 500) throw new Error("Invalid AI evidence response");
  return { status: !data.safe || !data.relevant ? "REJECTED" : data.score < .75 ? "UNCERTAIN" : "ACCEPTED", score: data.score, observations: data.observations.trim(), feedback: data.feedback.trim(), validatedAt: new Date() };
}
