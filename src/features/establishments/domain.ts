import { CivicError } from "@/features/civic/validation";
import { LOS_BANOS_BARANGAYS } from "@/features/emergency/domain";

export { LOS_BANOS_BARANGAYS };
export const INDUSTRY_VERSION = "ELB_INDUSTRY_V1";
// App vocabulary informed by PSA's broad section labels (checked 2026-10-24).
// https://psa.gov.ph/classification/psic/section — not detailed official PSIC codes.
export const INDUSTRIES = [
  { value: "AGRICULTURE", label: "Agriculture, forestry and fishing" },
  { value: "MINING", label: "Mining and quarrying" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "ENERGY", label: "Electricity, gas and energy supply" },
  { value: "WATER_WASTE", label: "Water, sewerage and waste services" },
  { value: "CONSTRUCTION", label: "Construction" },
  { value: "TRADE_REPAIR", label: "Wholesale, retail and vehicle repair" },
  { value: "TRANSPORT", label: "Transportation and storage" },
  { value: "FOOD_ACCOMMODATION", label: "Accommodation and food services" },
  { value: "INFORMATION", label: "Information and communication" },
  { value: "FINANCE", label: "Financial and insurance services" },
  { value: "REAL_ESTATE", label: "Real estate" },
  { value: "PROFESSIONAL", label: "Professional, scientific and technical services" },
  { value: "ADMIN_SUPPORT", label: "Administrative and support services" },
  { value: "PUBLIC_ADMIN", label: "Public administration" },
  { value: "EDUCATION", label: "Education" },
  { value: "HEALTH_SOCIAL", label: "Health and social work" },
  { value: "ARTS_RECREATION", label: "Arts, entertainment and recreation" },
  { value: "OTHER_SERVICES", label: "Other services" },
  { value: "HOUSEHOLD", label: "Household employer activities" },
  { value: "EXTRATERRITORIAL", label: "Extraterritorial organizations" },
] as const;
export const ORGANIZATION_TYPES = ["SOLE_PROPRIETORSHIP", "PARTNERSHIP", "CORPORATION", "COOPERATIVE", "GOVERNMENT", "NONPROFIT", "OTHER"] as const;
export const OPERATING_STATUSES = ["OPERATING", "TEMPORARILY_CLOSED", "CEASED", "NOT_YET_OPERATING"] as const;
export const MARKET_REACH = ["LOCAL", "NATIONAL", "INTERNATIONAL", "MIXED"] as const;
export type SurveyAction = "DRAFT" | "SUBMITTED" | "WITHDRAWN";
export function establishmentYear(value: unknown = new Date().getFullYear()): number {
  if ((typeof value !== "number" && typeof value !== "string") || !/^\d{4}$/.test(String(value))) throw new CivicError("Choose a valid survey year.", 400);
  const year = Number(value);
  if (year < 2020 || year > new Date().getFullYear() + 1) throw new CivicError("Choose a valid survey year.", 400);
  return year;
}
export function requestObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CivicError("Invalid establishment request.", 400);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number, required = false): string {
  if (value === null || value === undefined) value = "";
  if (typeof value !== "string") throw new CivicError(`${label} must be text.`, 400);
  const result = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (result.length > max || (required && !result)) throw new CivicError(`${label} ${required && !result ? "is required" : `must be at most ${max} characters`}.`, 400);
  return result;
}
function choice(value: unknown, label: string, choices: readonly string[], required: boolean): string {
  const result = text(value, label, 60, required);
  if (result && !choices.includes(result)) throw new CivicError(`Choose a valid ${label.toLowerCase()}.`, 400);
  return result;
}
function count(value: unknown, label: string, max = 1_000_000): number | null {
  if (value === null || value === undefined || value === "") return null;
  if ((typeof value !== "number" && typeof value !== "string") || !/^\d+$/.test(String(value))) throw new CivicError(`${label} must be a whole nonnegative number or blank if unknown.`, 400);
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result > max) throw new CivicError(`${label} is outside the allowed range.`, 400);
  return result;
}
export function parseEstablishmentAnswers(input: unknown, action: "DRAFT" | "SUBMITTED") {
  const raw = requestObject(input), required = action === "SUBMITTED", surveyYear = establishmentYear(raw.surveyYear);
  for (const [name, expected] of [["municipality", "Los Baños"], ["province", "Laguna"]]) {
    if (raw[name] !== undefined && raw[name] !== expected) throw new CivicError(`This municipal survey requires ${name} ${expected}.`, 400);
  }
  const identity = {
    businessName: text(raw.businessName, "Business name", 180, true),
    officeType: choice(raw.officeType, "Office type", ["MAIN", "BRANCH"], true),
    street: text(raw.street, "Street / building / village", 220, true),
    barangay: choice(raw.barangay, "Barangay", LOS_BANOS_BARANGAYS, true),
    municipality: "Los Baños", province: "Laguna",
  };
  const totalWorkers = count(raw.totalWorkers, "Total workers"), regularWorkers = count(raw.regularWorkers, "Regular workers"), nonRegularWorkers = count(raw.nonRegularWorkers, "Nonregular workers"), partTimeWorkers = count(raw.partTimeWorkers, "Part-time workers");
  if (totalWorkers !== null) {
    if ([regularWorkers, nonRegularWorkers, partTimeWorkers].some(n => n !== null && n > totalWorkers) || (regularWorkers !== null && nonRegularWorkers !== null && regularWorkers + nonRegularWorkers !== totalWorkers)) throw new CivicError("Worker breakdowns must agree with total workers.", 400);
  }
  // A known employment-type subtotal bounds overlapping part-time workers,
  // even when the respondent has left the separate total field unknown.
  const knownTotal = totalWorkers ?? (regularWorkers !== null && nonRegularWorkers !== null ? regularWorkers + nonRegularWorkers : null);
  if (knownTotal !== null && partTimeWorkers !== null && partTimeWorkers > knownTotal) throw new CivicError("Part-time workers cannot exceed the known total or regular/nonregular subtotal.", 400);
  const contactEmail = text(raw.contactEmail, "Contact email", 191);
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new CivicError("Enter a valid contact email.", 400);
  const contactPhone = text(raw.contactPhone, "Contact phone", 30);
  if (contactPhone && (!/^[+\d ()-]+$/.test(contactPhone) || contactPhone.replace(/\D/g, "").length < 7 || contactPhone.replace(/\D/g, "").length > 15)) throw new CivicError("Enter a valid contact phone.", 400);
  if (required && !contactEmail && !contactPhone) throw new CivicError("Provide a contact email or phone.", 400);
  const startYear = count(raw.startYear, "Start year", surveyYear);
  if (startYear !== null && startYear < 1800) throw new CivicError("Start year must be 1800 or later and no later than the survey year.", 400);
  return { ...identity, surveyYear, industryVersion: INDUSTRY_VERSION,
    tradeName: text(raw.tradeName, "Trade name", 180),
    employerType: choice(raw.employerType, "Employer type", ["PUBLIC", "PRIVATE"], required),
    organizationType: choice(raw.organizationType, "Organization type", ORGANIZATION_TYPES, required),
    industry: choice(raw.industry, "Line of business / industry", INDUSTRIES.map(x => x.value), required),
    productsServices: text(raw.productsServices, "Principal products / services", 500, required),
    operatingStatus: choice(raw.operatingStatus, "Operating status", OPERATING_STATUSES, required),
    marketReach: choice(raw.marketReach, "Market reach", MARKET_REACH, false),
    startYear, monthsOperated: count(raw.monthsOperated, "Months operated", 12), totalWorkers, regularWorkers, nonRegularWorkers, partTimeWorkers,
    workforceNotes: text(raw.workforceNotes, "Workforce notes", 500),
    ownerPresidentName: text(raw.ownerPresidentName, "Owner / president name", 180),
    contactName: text(raw.contactName, "Contact person", 180, required), contactPosition: text(raw.contactPosition, "Contact position", 120, required), contactEmail, contactPhone,
  };
}
export type EstablishmentAnswers = ReturnType<typeof parseEstablishmentAnswers>;
export function establishmentIdentity(value: Pick<EstablishmentAnswers, "businessName" | "officeType" | "street" | "barangay" | "municipality" | "province">) {
  return JSON.stringify([value.businessName, value.officeType, value.street, value.barangay, value.municipality, value.province].map(x => x.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en")));
}
