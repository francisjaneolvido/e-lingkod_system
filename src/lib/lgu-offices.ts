/**
 * Common Philippine municipal LGU offices for selecting staff responsibility.
 * These are suggested functional offices, not a claim that every LGU uses the
 * same organizational chart. An admin must decide the actual authorized office.
 * Values remain human-readable to support existing saved staff departments.
 */
import type { StaffModule } from "@/lib/staff-modules";

export type LGUOfficeGroup = "Public service & permits" | "Infrastructure & environment" | "Community welfare & safety" | "Administration & governance";
export type LGUOffice = { name: string; group: LGUOfficeGroup; recommendedModules: StaffModule[]; summary: string };

export const LGU_OFFICE_GROUPS: LGUOfficeGroup[] = [
  "Public service & permits",
  "Infrastructure & environment",
  "Community welfare & safety",
  "Administration & governance",
];

export const LGU_OFFICES: LGUOffice[] = [
  { name: "Business Permits and Licensing Office (BPLO)", group: "Public service & permits", recommendedModules: ["SERVICES"], summary: "Business permits and business clearances" },
  { name: "Office of the Building Official (OBO)", group: "Public service & permits", recommendedModules: ["SERVICES", "REPORTS"], summary: "Building permits and related inspections" },
  { name: "Public Employment Service Office (PESO)", group: "Public service & permits", recommendedModules: ["JOBS", "COMMUNITY_DATA", "SERVICES"], summary: "Employment opportunities, jobs and labor programs" },
  { name: "Local Civil Registry Office (LCRO)", group: "Public service & permits", recommendedModules: ["SERVICES"], summary: "Birth, death and marriage records" },
  { name: "Municipal Treasurer's Office (MTO)", group: "Public service & permits", recommendedModules: ["SERVICES"], summary: "Local taxes, revenue and payment coordination" },
  { name: "Municipal Assessor's Office", group: "Public service & permits", recommendedModules: ["SERVICES"], summary: "Real property tax declaration and assessment" },
  { name: "Office for Senior Citizens Affairs (OSCA)", group: "Public service & permits", recommendedModules: ["SERVICES"], summary: "Senior citizens' programs and records" },
  { name: "Persons with Disability Affairs Office (PDAO)", group: "Public service & permits", recommendedModules: ["SERVICES"], summary: "PWD services and assistance" },
  { name: "Municipal Engineering Office (MEO)", group: "Infrastructure & environment", recommendedModules: ["REPORTS", "SERVICES", "PROJECTS"], summary: "Roads, drainage, streetlights and public works" },
  { name: "Municipal Environment and Natural Resources Office (MENRO)", group: "Infrastructure & environment", recommendedModules: ["REPORTS"], summary: "Solid waste, sanitation and environment" },
  { name: "Municipal Planning and Development Office (MPDO)", group: "Infrastructure & environment", recommendedModules: ["PROJECTS", "REPORTS"], summary: "Land-use, planning and development projects" },
  { name: "Municipal General Services Office (GSO)", group: "Infrastructure & environment", recommendedModules: ["REPORTS", "PROJECTS"], summary: "Public facilities, maintenance and properties" },
  { name: "Municipal Transport and Traffic Management Office", group: "Infrastructure & environment", recommendedModules: ["REPORTS"], summary: "Traffic and local transport concerns" },
  { name: "Municipal Agriculture Office (MAO)", group: "Infrastructure & environment", recommendedModules: ["REPORTS", "PROJECTS"], summary: "Agriculture, farming and local food programs" },
  { name: "Municipal Veterinary Office", group: "Infrastructure & environment", recommendedModules: ["REPORTS"], summary: "Animals and veterinary services" },
  { name: "Municipal Disaster Risk Reduction and Management Office (MDRRMO)", group: "Community welfare & safety", recommendedModules: ["REPORTS", "EMERGENCY"], summary: "Disaster preparedness, hazards and coordination" },
  { name: "Municipal Operations Center (OpCen)", group: "Community welfare & safety", recommendedModules: ["EMERGENCY", "REPORTS"], summary: "Emergency coordination and hotline updates" },
  { name: "Municipal Health Office (MHO)", group: "Community welfare & safety", recommendedModules: ["REPORTS", "SERVICES", "EMERGENCY"], summary: "Public health, sanitation and local health services" },
  { name: "Municipal Social Welfare and Development Office (MSWDO)", group: "Community welfare & safety", recommendedModules: ["SERVICES", "REPORTS", "EMERGENCY"], summary: "Social assistance and vulnerable-sector support" },
  { name: "Municipal Nutrition Office", group: "Community welfare & safety", recommendedModules: ["REPORTS", "PROJECTS"], summary: "Local nutrition and related health programs" },
  { name: "Municipal Mayor's Office", group: "Administration & governance", recommendedModules: ["REPORTS", "SERVICES"], summary: "Executive and general administrative concerns" },
  { name: "Municipal Administrator's Office", group: "Administration & governance", recommendedModules: ["REPORTS"], summary: "Coordination across municipal departments" },
  { name: "Public Information Office (PIO)", group: "Administration & governance", recommendedModules: ["PROJECTS", "EMERGENCY"], summary: "Public announcements and information" },
  { name: "Municipal Human Resource Management Office (HRMO)", group: "Administration & governance", recommendedModules: ["PROJECTS"], summary: "Personnel administration" },
  { name: "Municipal Budget Office", group: "Administration & governance", recommendedModules: ["PROJECTS"], summary: "Budget planning and appropriations" },
  { name: "Municipal Accounting Office", group: "Administration & governance", recommendedModules: ["PROJECTS"], summary: "Accounting and financial records" },
  { name: "Municipal Legal Office", group: "Administration & governance", recommendedModules: ["REPORTS"], summary: "Legal support and referral" },
  { name: "Sangguniang Bayan Office", group: "Administration & governance", recommendedModules: ["PROJECTS"], summary: "Local legislative affairs" },
  { name: "Municipal Tourism and Cultural Affairs Office", group: "Administration & governance", recommendedModules: ["PROJECTS"], summary: "Tourism and cultural activities" },
];

export function suggestedModulesForOffice(office: string): StaffModule[] {
  return [...(LGU_OFFICES.find(item => item.name === office)?.recommendedModules ?? [])];
}

/** Suggestions only; never auto-route reports or grant access based on category. */
export const CIVIC_OFFICE_SUGGESTIONS: Record<string, readonly string[]> = {
  ROADS_DRAINAGE: ["Municipal Engineering Office (MEO)", "Municipal Disaster Risk Reduction and Management Office (MDRRMO)"],
  STREETLIGHTS: ["Municipal Engineering Office (MEO)", "Municipal General Services Office (GSO)"],
  WASTE_SANITATION: ["Municipal Environment and Natural Resources Office (MENRO)", "Municipal Health Office (MHO)"],
  PUBLIC_FACILITIES: ["Municipal General Services Office (GSO)", "Municipal Engineering Office (MEO)"],
  ENVIRONMENT: ["Municipal Environment and Natural Resources Office (MENRO)", "Municipal Disaster Risk Reduction and Management Office (MDRRMO)"],
  OTHER: [],
};
