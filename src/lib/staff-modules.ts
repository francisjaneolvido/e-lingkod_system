// These are the only permission keys accepted by the API and stored in MySQL.
// JOBS authorizes vacancy maintenance; it does not grant census/analytics access.
// COMMUNITY_DATA is retained for legacy compatibility; census imports require CENSUS.
// CENSUS authorizes protected records, imports and analytics within explicit record scope.
export const STAFF_MODULES = ["REPORTS", "SERVICES", "EMERGENCY", "PROJECTS", "JOBS", "CENSUS", "COMMUNITY_DATA"] as const;
export type StaffModule = (typeof STAFF_MODULES)[number];
export const STAFF_MODULE_LABELS: Record<StaffModule, string> = {
  REPORTS: "Civic Reports",
  SERVICES: "Online LGU Services",
  EMERGENCY: "Emergency & Alerts",
  PROJECTS: "Municipal Projects",
  JOBS: "Employment Opportunities",
  CENSUS: "Protected Census Records",
  COMMUNITY_DATA: "Legacy Data Management",
};

export function isStaffModule(value: string): value is StaffModule {
  return STAFF_MODULES.some(module => module === value);
}
