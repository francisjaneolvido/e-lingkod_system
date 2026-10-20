import { REPORT_CATEGORIES, REPORT_STATUSES, TRANSITIONS, type ReportCategory, type ReportStatus } from "./config";

export class CivicError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); this.name = "CivicError"; }
}

function text(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "string") throw new CivicError(`${label} is required.`);
  const result = value.trim();
  if (result.length < min || result.length > max) throw new CivicError(`${label} must be ${min}–${max} characters.`);
  return result;
}

function coordinate(value: FormDataEntryValue | null, label: string, min: number, max: number) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !value.trim()) throw new CivicError(`Enter a valid ${label}.`);
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max) throw new CivicError(`Enter a valid ${label}.`);
  return result;
}

export function parseReportForm(data: FormData) {
  const category = text(data.get("category"), "Concern type", 1, 40);
  if (!REPORT_CATEGORIES.some(item => item.value === category)) throw new CivicError("Choose a valid concern type.");
  const submissionKey = text(data.get("submissionKey"), "Submission key", 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionKey)) throw new CivicError("Reload the page and try submitting again.");
  const latitude = coordinate(data.get("latitude"), "latitude", -90, 90);
  const longitude = coordinate(data.get("longitude"), "longitude", -180, 180);
  if ((latitude === null) !== (longitude === null)) throw new CivicError("Enter both latitude and longitude, or leave both blank.");
  const requestedSource = data.get("locationSource");
  if (!["GPS", "MANUAL", "ADDRESS"].includes(String(requestedSource))) throw new CivicError("Choose a valid location method.");
  const locationSource = latitude === null ? "ADDRESS" : requestedSource === "GPS" ? "GPS" : "MANUAL";
  const gpsAccuracy = locationSource === "GPS" ? coordinate(data.get("gpsAccuracy"), "GPS accuracy", 0, 1_000_000) : null;
  if (requestedSource === "GPS" && (latitude === null || gpsAccuracy === null)) throw new CivicError("Capture your GPS location again or use a manual location.");
  if (data.get("confirmed") !== "true") throw new CivicError("Confirm the report details before submitting.");
  return {
    category: category as ReportCategory, submissionKey,
    title: text(data.get("title"), "Report title", 8, 120),
    description: text(data.get("description"), "Description", 20, 2000),
    barangay: text(data.get("barangay"), "Barangay / area", 2, 100),
    address: text(data.get("address"), "Address / landmark", 8, 300),
    latitude, longitude, locationSource, gpsAccuracy,
  };
}

export function parseAdminUpdate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CivicError("Invalid update.");
  const data = value as Record<string, unknown>;
  const status = text(data.status, "Status", 1, 30);
  if (!(REPORT_STATUSES as readonly string[]).includes(status)) throw new CivicError("Choose a valid status.");
  if (!Number.isSafeInteger(data.version) || Number(data.version) < 1) throw new CivicError("Refresh the report before updating.");
  const assignedOffice = typeof data.assignedOffice === "string" ? data.assignedOffice.trim() : "";
  if (assignedOffice.length > 120) throw new CivicError("Office name must be 120 characters or fewer.");
  if (["IN_PROGRESS", "PENDING_VERIFICATION", "RESOLVED"].includes(status) && !assignedOffice) throw new CivicError("Assign an office before marking a report in progress or resolved.");
  const priority = data.priority === undefined ? undefined : data.priority;
  if (priority !== undefined && !["LOW", "NORMAL", "HIGH", "URGENT"].includes(String(priority))) throw new CivicError("Choose a valid priority.");
  const assignedStaffId = data.assignedStaffId === null || data.assignedStaffId === "" || data.assignedStaffId === undefined
    ? null : typeof data.assignedStaffId === "string" && data.assignedStaffId.length <= 191 ? data.assignedStaffId : false;
  if (assignedStaffId === false) throw new CivicError("Invalid assigned staff member.");
  if (data.visibleToCitizen !== undefined && typeof data.visibleToCitizen !== "boolean") throw new CivicError("Invalid update visibility.");
  return {
    status: status as ReportStatus, assignedOffice: assignedOffice || null,
    assignedStaffId, priority: priority as "LOW" | "NORMAL" | "HIGH" | "URGENT" | undefined,
    visibleToCitizen: data.visibleToCitizen === true,
    note: text(data.note, "Progress remarks", 10, 1500), version: Number(data.version),
  };
}

export function checkTransition(current: ReportStatus, next: ReportStatus) {
  if (current !== next && !TRANSITIONS[current].includes(next)) {
    throw new CivicError("That status change is unavailable. Follow the review workflow or reopen the report first.", 409);
  }
}
