export const REPORT_CATEGORIES = [
  { value: "ROADS_DRAINAGE", label: "Roads & drainage", detail: "Potholes, canals, flooding", icon: "road" },
  { value: "STREETLIGHTS", label: "Streetlights", detail: "Broken or unlit streetlights", icon: "light" },
  { value: "WASTE_SANITATION", label: "Waste & sanitation", detail: "Garbage and cleanliness", icon: "waste" },
  { value: "PUBLIC_FACILITIES", label: "Public facilities", detail: "Parks, signs, shared spaces", icon: "building" },
  { value: "ENVIRONMENT", label: "Environment", detail: "Trees, waterways, hazards", icon: "tree" },
  { value: "OTHER", label: "Other concern", detail: "Something else needs attention", icon: "other" },
] as const;

export const REPORT_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "PENDING_VERIFICATION", "RESOLVED", "REJECTED", "REOPENED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]["value"];

export const STATUS_META: Record<ReportStatus, { label: string; short: string; description: string; tone: string }> = {
  SUBMITTED: { label: "Submitted", short: "Received", description: "Your concern has reached the community action desk.", tone: "blue" },
  UNDER_REVIEW: { label: "Under review", short: "Review", description: "The desk is checking the details and the appropriate action.", tone: "amber" },
  IN_PROGRESS: { label: "In progress", short: "Action", description: "The assigned office is working on the concern.", tone: "purple" },
  PENDING_VERIFICATION: { label: "Pending verification", short: "Verify", description: "The assigned office submitted proof and is awaiting LGU review. This is not yet a confirmed resolution.", tone: "amber" },
  RESOLVED: { label: "Resolved", short: "Resolved", description: "An outcome has been recorded by the action desk.", tone: "green" },
  REJECTED: { label: "Not accepted", short: "Closed", description: "Read the desk remarks for the reason and guidance.", tone: "red" },
  REOPENED: { label: "Reopened · awaiting review", short: "Reopened", description: "The citizen requested another review of the resolution. The LGU action desk will assess the feedback.", tone: "amber" },
};

export const STATUS_STEPS: ReportStatus[] = ["SUBMITTED", "UNDER_REVIEW", "IN_PROGRESS", "PENDING_VERIFICATION", "RESOLVED"];
export const TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["PENDING_VERIFICATION", "UNDER_REVIEW"],
  PENDING_VERIFICATION: [], // Only the dedicated Super Admin approval API can leave this status.
  RESOLVED: [], // The citizen feedback endpoint alone can reopen a verified resolution.
  REJECTED: ["UNDER_REVIEW"],
  REOPENED: ["UNDER_REVIEW"], // Only Super Admin may re-triage citizen disputes.
};
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 10 * 1024 * 1024;
export const TRACKING_PATTERN = /^ELB-\d{4}-[A-F0-9]{12}$/;

export function categoryLabel(value: string) {
  return REPORT_CATEGORIES.find(category => category.value === value)?.label ?? "Community concern";
}

export function formatReportDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
    ...(withTime ? { hour: "numeric" as const, minute: "2-digit" as const } : {}),
  }).format(new Date(value));
}
