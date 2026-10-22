// These are the only permission keys accepted by the API and stored in MySQL.
// JOBS covers the live Job Matching / Employment & Livelihood workspace.
// COMMUNITY_DATA is the narrower permission for historical employment activity imports/manual encoding.
// CENSUS remains a separate placeholder module and is not used by Job Matching analytics.
export const STAFF_MODULES = ["REPORTS", "SERVICES", "EMERGENCY", "PROJECTS", "JOBS", "CENSUS", "COMMUNITY_DATA"] as const;
export type StaffModule = (typeof STAFF_MODULES)[number];
export const STAFF_MODULE_LABELS: Record<StaffModule, string> = {
  REPORTS: "Civic Reports",
  SERVICES: "Online LGU Services",
  EMERGENCY: "Emergency & Alerts",
  PROJECTS: "Municipal Projects",
  JOBS: "Job Matching & Opportunities",
  CENSUS: "Community Census",
  COMMUNITY_DATA: "Job Matching Data Management",
};

export function isStaffModule(value: string): value is StaffModule {
  return STAFF_MODULES.some(module => module === value);
}
