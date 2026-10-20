// These are the only permission keys accepted by the API and stored in MySQL.
export const STAFF_MODULES = ["REPORTS", "SERVICES", "EMERGENCY", "PROJECTS", "JOBS", "CENSUS"] as const;
export type StaffModule = (typeof STAFF_MODULES)[number];
export const STAFF_MODULE_LABELS: Record<StaffModule, string> = {
  REPORTS: "Civic Reports",
  SERVICES: "Online LGU Services",
  EMERGENCY: "Emergency & Alerts",
  PROJECTS: "Municipal Projects",
  JOBS: "Job Matching",
  CENSUS: "Worker Census",
};

export function isStaffModule(value: string): value is StaffModule {
  return STAFF_MODULES.some(module => module === value);
}
