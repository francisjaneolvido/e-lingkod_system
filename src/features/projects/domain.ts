/** Pure input rules for the LGU project transparency module. No demo project is published by default. */
import { LGU_OFFICES } from "@/lib/lgu-offices";
import { LOS_BANOS_BARANGAYS } from "@/features/emergency/domain";
import { projectPhotoPath } from "@/features/projects/demo-assets";
export const PROJECT_PHASES = ["PLANNED", "ONGOING", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
export const PROJECT_CATEGORIES = ["Infrastructure", "Environment", "Health", "Education", "Social welfare", "Livelihood", "Disaster preparedness", "Other"] as const;
export const PROJECT_STATUSES = ["DRAFT", "PENDING_REVIEW", "RETURNED", "PUBLISHED", "ARCHIVED"] as const;
export const PHASE_LABELS: Record<string, string> = { PLANNED: "Planned", ONGOING: "Ongoing", ON_HOLD: "On hold", COMPLETED: "Completed", CANCELLED: "Cancelled" };
export function projectText(input: unknown, field: string, max: number, required = true) {
  if (typeof input !== "string") throw new Error(`${field} must be text.`);
  const text = input.trim();
  if ((required && !text) || text.length > max) throw new Error(`${field} must be ${required ? "1–" : "at most "}${max} characters.`);
  return text;
}
export function officialProjectSource(value: unknown) {
  const text = projectText(value, "Official source URL", 500);
  try {
    const u = new URL(text);
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) throw new Error();
    return u.toString();
  } catch { throw new Error("Provide an official, publicly accessible HTTPS source URL for this project or milestone."); }
}
export function projectBarangays(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some(x => typeof x !== "string" || !LOS_BANOS_BARANGAYS.includes(x as typeof LOS_BANOS_BARANGAYS[number]))) throw new Error("Select at least one valid Los Baños barangay.");
  return [...new Set(value)];
}
export function projectOffice(value: unknown) {
  const office = projectText(value, "Lead LGU office", 160);
  if (!LGU_OFFICES.some(x => x.name === office)) throw new Error("Choose an office from the LGU office directory.");
  return office;
}
export function projectChoice<T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) throw new Error(`Select a valid ${field}.`);
  return value as T[number];
}
export function projectPercent(value: unknown): number | null {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) throw new Error("Progress must be a whole number between 0 and 100.");
  return value;
}
export function projectStaffMayEdit(department: string | null | undefined, leadOffice: string) {
  // The coordinating MPDO and PIO may prepare records across departments, but cannot approve publishing.
  return department === leadOffice || department === "Municipal Planning and Development Office (MPDO)" || department === "Public Information Office (PIO)";
}

/** Only values supported by a public official reference may be published. */
export function projectDisclosure(body: Record<string, unknown>) {
  const rawBudget = body.budgetPhp;
  const amount = rawBudget === null || rawBudget === undefined || rawBudget === "" ? null : Number(rawBudget);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 999999999999.99 || !/^\d{1,12}(?:\.\d{1,2})?$/.test(String(rawBudget)))) {
    throw new Error("Budget must be a valid non-negative peso amount with up to two decimal places.");
  }
  const budgetSourceUrl = body.budgetSourceUrl ? officialProjectSource(body.budgetSourceUrl) : null;
  if (amount !== null && !budgetSourceUrl) throw new Error("An official budget source URL is required when an amount is entered.");
  const targetDate = body.targetCompletion ? projectText(body.targetCompletion, "Target completion date", 10) : null;
  if (targetDate && (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(Date.parse(`${targetDate}T00:00:00Z`)) || new Date(`${targetDate}T00:00:00Z`).toISOString().slice(0,10) !== targetDate)) {
    throw new Error("Provide a valid target completion date in YYYY-MM-DD format.");
  }
  return {
    budgetPhp: amount === null ? null : amount.toFixed(2),
    budgetSourceUrl,
    fundingSource: projectText(body.fundingSource ?? "", "Funding source", 180, false) || null,
    contractor: projectText(body.contractor ?? "", "Contractor / implementer", 180, false) || null,
    procurementUrl: body.procurementUrl ? officialProjectSource(body.procurementUrl) : null,
    targetCompletion: targetDate ? new Date(`${targetDate}T00:00:00Z`) : null,
  };
}

export function officeContactInput(value: Record<string, unknown>) {
  const officeName = projectOffice(value.officeName);
  const phone = projectText(value.phone ?? "", "Office phone", 35, false);
  const extension = projectText(value.extension ?? "", "Phone extension", 15, false);
  const email = projectText(value.email ?? "", "Office email", 190, false).toLowerCase();
  const officeHours = projectText(value.officeHours ?? "", "Office hours", 160, false);
  const address = projectText(value.address ?? "", "Office address", 220, false);
  const notes = projectText(value.notes ?? "", "Office service notes", 350, false);
  if (!phone && !email) throw new Error("Provide an official office phone or email.");
  if (phone && !/^[+()0-9\-\s]{5,35}$/.test(phone)) throw new Error("Office phone contains unsupported characters.");
  if (extension && !/^\d{1,15}$/.test(extension)) throw new Error("Phone extension must contain digits only.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Provide a valid office email.");
  return { officeName, phone: phone || null, extension: extension || null, email: email || null,
    officeHours: officeHours || null, address: address || null, notes: notes || null,
    sourceUrl: officialProjectSource(value.sourceUrl) };
}

/** Demo photos cannot be mistaken for verified LGU evidence. */
export function demoProjectInput(body: Record<string, unknown>, enabled: boolean) {
  const isDemo = body.isDemo === true;
  if (body.isDemo !== undefined && typeof body.isDemo !== "boolean") throw new Error("Demo flag must be boolean.");
  if (isDemo && !enabled) throw new Error("DEMO mode is disabled. Set PROJECTS_DEMO_MODE=true for local demos.");
  const photoPath = projectPhotoPath(body.photoPath);
  if (photoPath && !isDemo) throw new Error("Generated sample photos are for fictional DEMO projects only.");
  return { isDemo, photoPath, sourceUrl: isDemo ? null : officialProjectSource(body.sourceUrl) };
}
