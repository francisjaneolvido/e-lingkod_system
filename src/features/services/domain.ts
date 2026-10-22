import { CivicError } from "@/features/civic/validation";
import {
  activeServiceFields,
  activeServiceRequirements,
  serviceByKey,
  serviceNeedsAppointment,
  type OnlineServiceDefinition,
  type ServiceField,
} from "./catalog";

export const SERVICE_REQUEST_STATUSES = [
  "DRAFT", "FOR_TRIAGE", "FORM_OPEN", "SUBMITTED", "ASSIGNED", "UNDER_REVIEW", "ACTION_REQUIRED", "VALIDATED",
  "SCHEDULED", "APPOINTMENT_CONFIRMED", "APPOINTMENT_COMPLETED", "FOR_FINAL_VERIFICATION", "READY_FOR_RELEASE", "COMPLETED", "DECLINED", "CANCELLED",
] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

export const DOCUMENT_VERIFICATION_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type DocumentVerificationStatus = (typeof DOCUMENT_VERIFICATION_STATUSES)[number];

export const SERVICE_STATUS_META: Record<ServiceRequestStatus, { label: string; citizenLabel: string; tone: string }> = {
  DRAFT: { label: "Draft", citizenLabel: "Draft", tone: "bg-slate-100 text-slate-700" },
  FOR_TRIAGE: { label: "For screening", citizenLabel: "Submitted for screening", tone: "bg-sky-50 text-sky-700" },
  FORM_OPEN: { label: "Full form opened", citizenLabel: "Action required", tone: "bg-amber-50 text-amber-800" },
  SUBMITTED: { label: "Submitted", citizenLabel: "Submitted", tone: "bg-sky-50 text-sky-700" },
  ASSIGNED: { label: "Assigned", citizenLabel: "Under review", tone: "bg-blue-50 text-blue-700" },
  UNDER_REVIEW: { label: "Under review", citizenLabel: "Under review", tone: "bg-blue-50 text-blue-700" },
  ACTION_REQUIRED: { label: "Citizen action required", citizenLabel: "Action required", tone: "bg-amber-50 text-amber-800" },
  VALIDATED: { label: "Validated", citizenLabel: "Validated", tone: "bg-emerald-50 text-emerald-700" },
  SCHEDULED: { label: "Schedule options sent", citizenLabel: "Choose schedule", tone: "bg-violet-50 text-violet-700" },
  APPOINTMENT_CONFIRMED: { label: "Schedule confirmed", citizenLabel: "Scheduled", tone: "bg-violet-50 text-violet-700" },
  APPOINTMENT_COMPLETED: { label: "Scheduled activity completed", citizenLabel: "LGU processing", tone: "bg-cyan-50 text-cyan-700" },
  FOR_FINAL_VERIFICATION: { label: "For final verification", citizenLabel: "Final review", tone: "bg-indigo-50 text-indigo-700" },
  READY_FOR_RELEASE: { label: "Ready for release", citizenLabel: "Ready for release", tone: "bg-emerald-50 text-emerald-700" },
  COMPLETED: { label: "Completed", citizenLabel: "Completed", tone: "bg-emerald-100 text-emerald-800" },
  DECLINED: { label: "Declined / referred", citizenLabel: "Unable to proceed", tone: "bg-rose-50 text-rose-700" },
  CANCELLED: { label: "Cancelled", citizenLabel: "Cancelled", tone: "bg-slate-100 text-slate-700" },
};


export function citizenServiceStatusLabel(status: ServiceRequestStatus, service?: Pick<OnlineServiceDefinition, "appointmentMode" | "completionMode" | "outcomeLabel">) {
  if (!service) return SERVICE_STATUS_META[status].citizenLabel;
  if (status === "SCHEDULED") return `Choose ${appointmentStageLabel(service).toLowerCase()} time`;
  if (status === "APPOINTMENT_CONFIRMED") return `${appointmentStageLabel(service)} scheduled`;
  if (status === "APPOINTMENT_COMPLETED") return `${appointmentStageLabel(service)} completed`;
  if (status === "READY_FOR_RELEASE") return service.outcomeLabel ? `${service.outcomeLabel} ready` : "Ready for release";
  return SERVICE_STATUS_META[status].citizenLabel;
}

export function appointmentStageLabel(service: Pick<OnlineServiceDefinition, "appointmentMode">) {
  if (service.appointmentMode === "INSPECTION") return "Inspection";
  if (service.appointmentMode === "INTERVIEW") return "Interview";
  if (service.appointmentMode === "PICKUP") return "Pickup";
  return "Schedule";
}

export function serviceStageLabels(service: Pick<OnlineServiceDefinition, "appointmentMode" | "completionMode">, status?: ServiceRequestStatus) {
  const appointmentActive = serviceNeedsAppointment(service) || ["SCHEDULED", "APPOINTMENT_CONFIRMED", "APPOINTMENT_COMPLETED"].includes(status || "DRAFT");
  return [
    "Request",
    "Submission",
    "LGU review",
    ...(appointmentActive ? [appointmentStageLabel(service)] : []),
    "Final check",
    service.completionMode === "RELEASE" ? "Release" : "Completion",
  ];
}

export function serviceStage(status: ServiceRequestStatus, service: Pick<OnlineServiceDefinition, "appointmentMode" | "completionMode">) {
  const labels = serviceStageLabels(service, status);
  const hasAppointment = labels.length === 6;
  if (["DRAFT", "FOR_TRIAGE", "FORM_OPEN"].includes(status)) return 0;
  if (status === "SUBMITTED") return 1;
  if (["ASSIGNED", "UNDER_REVIEW", "ACTION_REQUIRED", "VALIDATED"].includes(status)) return 2;
  if (["SCHEDULED", "APPOINTMENT_CONFIRMED", "APPOINTMENT_COMPLETED"].includes(status)) return hasAppointment ? 3 : 2;
  if (status === "FOR_FINAL_VERIFICATION") return hasAppointment ? 4 : 3;
  if (["READY_FOR_RELEASE", "COMPLETED"].includes(status)) return hasAppointment ? 5 : 4;
  return 0;
}

export function citizenStatusGuidance(status: ServiceRequestStatus, service?: Pick<OnlineServiceDefinition, "appointmentMode" | "completionMode" | "outcomeLabel">) {
  switch (status) {
    case "DRAFT": return { title: "Draft saved", detail: "You can leave and come back. Complete the required fields and documents only when you are ready to submit.", action: "Finish request" };
    case "FOR_TRIAGE": return { title: "Initial screening", detail: "The responsible office is checking your intake before opening the complete form or providing the next instruction.", action: "No action needed" };
    case "FORM_OPEN": return { title: "Complete the full form", detail: "Your intake passed initial screening. Complete the remaining details and upload the requested documents.", action: "Complete form" };
    case "SUBMITTED": return { title: "Request submitted", detail: "The LGU received your form and documents. It will be routed to the correct office or staff member.", action: "No action needed" };
    case "ASSIGNED": return { title: "Assigned for review", detail: "An authorized staff member or office now has your request.", action: "No action needed" };
    case "UNDER_REVIEW": return { title: "Requirements are being checked", detail: "Staff is validating your information and uploaded documents. You will be notified if anything needs correction.", action: "No action needed" };
    case "ACTION_REQUIRED": return { title: "Action required", detail: "Check the latest LGU note, update the affected information or document, then submit again.", action: "Fix request" };
    case "VALIDATED": {
      if (service && serviceNeedsAppointment(service)) return { title: `Validated — waiting for ${appointmentStageLabel(service).toLowerCase()} options`, detail: "Your requirements passed staff validation. The LGU will send available schedule options for you to choose from.", action: "Wait for slots" };
      if (service?.appointmentMode === "OPTIONAL") return { title: "Validated", detail: "Your requirements passed staff validation. The office may continue directly or offer a schedule if an in-person step is needed.", action: "No action needed" };
      return { title: "Validated", detail: "Your requirements passed staff validation and can proceed to staff recommendation and final checking.", action: "No action needed" };
    }
    case "SCHEDULED": return { title: "Choose a schedule", detail: "The LGU sent available slots. Choose the date and time that works for you, or request a new set of options.", action: "Choose a slot" };
    case "APPOINTMENT_CONFIRMED": return { title: "Schedule confirmed", detail: `Attend the confirmed ${service ? appointmentStageLabel(service).toLowerCase() : "appointment"}. The LGU will record the outcome after it is conducted.`, action: "Attend schedule" };
    case "APPOINTMENT_COMPLETED": return { title: `${service ? appointmentStageLabel(service) : "Appointment"} completed`, detail: "The LGU recorded the scheduled activity. Staff is preparing the recommendation or next processing step.", action: "No action needed" };
    case "FOR_FINAL_VERIFICATION": return { title: "Final verification", detail: "Staff processing is complete and the request is waiting for Super Admin verification.", action: "No action needed" };
    case "READY_FOR_RELEASE": return service?.completionMode === "RELEASE" ? { title: "Document approved for pickup", detail: "Wait for the releasing office to offer pickup dates, then choose an available slot. Bring your tracking ID and valid identification. Interview and inspection schedules are separate.", action: "Choose pickup schedule" } : { title: "Ready for release", detail: "Follow the release instruction recorded by the LGU.", action: "Follow release instruction" };
    case "COMPLETED": return { title: "Request completed", detail: "The LGU verified that the transaction is complete. Keep the tracking ID for your records.", action: "Completed" };
    case "DECLINED": return { title: "Request could not proceed", detail: "Read the latest LGU note for the reason, referral, or recommended next step.", action: "Review reason" };
    case "CANCELLED": return { title: "Request cancelled", detail: "This request was cancelled and any active schedule options were closed.", action: "Closed" };
  }
}

function cleanText(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").replace(/\s{3,}/g, "  ").trim();
}

function string(value: unknown, label: string, max = 2000, required = true, min = required ? 1 : 0) {
  if (value === null || value === undefined) value = "";
  if (typeof value !== "string") throw new CivicError(`${label} is invalid.`);
  const v = cleanText(value);
  if (required && !v) throw new CivicError(`${label} is required.`);
  if (v && v.length < min) throw new CivicError(`${label} must be at least ${min} characters.`);
  if (v.length > max) throw new CivicError(`${label} must be ${max} characters or fewer.`);
  return v;
}

function validateField(field: ServiceField, raw: unknown, forceOptional = false) {
  const defaultMax = field.type === "textarea" ? 2000 : 300;
  const required = forceOptional ? false : field.required !== false;
  const value = string(raw, field.label, field.maxLength ?? defaultMax, required, field.minLength ?? (required ? 1 : 0));
  if (!value) return "";
  if (field.type === "select" && field.options && !field.options.includes(value)) throw new CivicError(`Choose a valid ${field.label.toLowerCase()}.`);
  if (field.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new CivicError(`Enter a valid ${field.label.toLowerCase()}.`);
    if (field.min !== undefined && number < field.min) throw new CivicError(`${field.label} must be at least ${field.min}.`);
    if (field.max !== undefined && number > field.max) throw new CivicError(`${field.label} must be ${field.max} or less.`);
    if (field.validation === "POSITIVE_INTEGER" && !Number.isInteger(number)) throw new CivicError(`${field.label} must be a whole number.`);
  }
  if (field.type === "date") {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) throw new CivicError(`Enter a valid ${field.label.toLowerCase()}.`);
    if (date.getTime() > Date.now()) throw new CivicError(`${field.label} cannot be in the future.`);
    if (field.validation === "SENIOR_BIRTHDATE") {
      const today = new Date();
      let age = today.getFullYear() - date.getFullYear();
      const month = today.getMonth() - date.getMonth();
      if (month < 0 || (month === 0 && today.getDate() < date.getDate())) age -= 1;
      if (age < 60) throw new CivicError("Senior citizen date of birth must indicate an age of at least 60 years.");
    }
  }
  if (field.validation === "TIN" && !/^\d{3}[- ]?\d{3}[- ]?\d{3}(?:[- ]?\d{3})?$/.test(value)) {
    throw new CivicError("Enter a valid TIN format, for example 123-456-789 or 123-456-789-000.");
  }
  if (field.validation === "YEAR") {
    const year = Number(value);
    const current = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1900 || year > current) throw new CivicError(`Enter a valid year from 1900 to ${current}.`);
  }
  return value;
}

type ParseMode = "FULL" | "PARTIAL" | "PRESCREEN";
export function parseCitizenServiceFormForService(input: unknown, service: OnlineServiceDefinition, modeOrLegacy: ParseMode | boolean = "FULL") {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CivicError("Invalid service request.");
  const data = input as Record<string, unknown>;
  const serviceKey = string(data.serviceKey ?? service.key, "Service", 80);
  if (serviceKey !== service.key) throw new CivicError("The selected service does not match this request.");
  const mode: ParseMode = typeof modeOrLegacy === "boolean" ? (modeOrLegacy ? "PARTIAL" : "FULL") : modeOrLegacy;
  const purposeRequired = mode !== "PARTIAL";
  const purpose = string(data.purpose, service.purposeLabel || "Purpose", 1200, purposeRequired, purposeRequired ? 4 : 0);
  if (purpose && service.purposeOptions && !service.purposeOptions.includes(purpose)) throw new CivicError(`Choose a valid ${service.purposeLabel.toLowerCase()}.`);
  const source = data.fields && typeof data.fields === "object" && !Array.isArray(data.fields) ? data.fields as Record<string, unknown> : {};
  const visible = activeServiceFields(service, Object.fromEntries(Object.entries(source).map(([key,value]) => [key, typeof value === "string" ? value : ""])));
  const prescreenKeys = new Set(service.prescreenFieldKeys || []);
  const fields: Record<string, string> = {};
  for (const field of service.fields) {
    const isActive = visible.some(active => active.key === field.key);
    if (!isActive) { fields[field.key] = ""; continue; }
    if (mode === "PARTIAL") fields[field.key] = validateField(field, source[field.key], true);
    else if (mode === "PRESCREEN") fields[field.key] = prescreenKeys.has(field.key) ? validateField(field, source[field.key]) : validateField(field, source[field.key], true);
    else fields[field.key] = validateField(field, source[field.key]);
  }
  return { service, purpose, fields };
}

/** Backward-compatible parser for the built-in catalog. Runtime-configured services use parseCitizenServiceFormForService. */
export function parseCitizenServiceForm(input: unknown, modeOrLegacy: ParseMode | boolean = "FULL") {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CivicError("Invalid service request.");
  const data = input as Record<string, unknown>;
  const serviceKey = string(data.serviceKey, "Service", 80);
  const service = serviceByKey(serviceKey);
  if (!service) throw new CivicError("Choose a valid LGU service.");
  return parseCitizenServiceFormForService(input, service, modeOrLegacy);
}

export function requiredDocumentsComplete(service: OnlineServiceDefinition, uploadedKeys: string[], values: Record<string,string> = {}) {
  const set = new Set(uploadedKeys);
  return activeServiceRequirements(service, values).filter(item => item.required).every(item => set.has(item.key));
}

export function requiredDocumentsSubmittable(service: OnlineServiceDefinition, documents: Array<{ requirementKey: string; verificationStatus: string }>, values: Record<string,string> = {}) {
  const byKey = new Map<string, string>();
  for (const document of documents) if (!byKey.has(document.requirementKey)) byKey.set(document.requirementKey, document.verificationStatus);
  return activeServiceRequirements(service, values).filter(item => item.required).every(item => {
    const status = byKey.get(item.key);
    return Boolean(status) && status !== "REJECTED";
  });
}

export function requiredDocumentsVerified(service: OnlineServiceDefinition, documents: Array<{ requirementKey: string; verificationStatus: string }>, values: Record<string,string> = {}) {
  const byKey = new Map<string, string>();
  for (const document of documents) if (!byKey.has(document.requirementKey)) byKey.set(document.requirementKey, document.verificationStatus);
  return activeServiceRequirements(service, values).filter(item => item.required).every(item => byKey.get(item.key) === "VERIFIED");
}

export function createTrackingId() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  return `ELS-${date}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
}

export function isServiceStatus(value: string): value is ServiceRequestStatus { return (SERVICE_REQUEST_STATUSES as readonly string[]).includes(value); }
export function isDocumentVerificationStatus(value: string): value is DocumentVerificationStatus { return (DOCUMENT_VERIFICATION_STATUSES as readonly string[]).includes(value); }
