/**
 * Manually checked against Municipality of Los Baños official Contact Us page.
 * Source: https://losbanos.gov.ph/sendmail, checked 2026-10-23.
 * These are published contact details, NOT live availability or a guarantee of office hours.
 * Any unlisted office deliberately has no phone/email in the public UI.
 */
export const LOS_BANOS_OFFICE_DIRECTORY_SOURCE = "https://losbanos.gov.ph/sendmail";
export const LOS_BANOS_OFFICE_DIRECTORY_CHECKED = "2026-10-23";
export type OfficeContact = {
  officeName: string;
  phone: string | null;
  extension: string | null;
  email: string | null;
  officeHours: string | null;
  address: string | null;
  notes: string | null;
  sourceUrl: string;
  verifiedAt: string | null;
  verifiedBy: "OFFICIAL_WEBSITE" | "LGU_ADMIN" | "UNVERIFIED";
};
const trunk = "(049) 530-2981";
const source = LOS_BANOS_OFFICE_DIRECTORY_SOURCE;
const verifiedAt = LOS_BANOS_OFFICE_DIRECTORY_CHECKED;
const official: Array<[string, string | null, string | null]> = [
  ["Municipal Mayor's Office", "3000", "mayorsoffice@losbanos.gov.ph"],
  ["Municipal Planning and Development Office (MPDO)", "1005", "mpdo@losbanos.gov.ph"],
  ["Municipal Engineering Office (MEO)", "1007", "meo@losbanos.gov.ph"],
  ["Municipal Environment and Natural Resources Office (MENRO)", "2015", "menro@losbanos.gov.ph"],
  ["Municipal Health Office (MHO)", "4004", "rhu@losbanos.gov.ph"],
  ["Municipal Social Welfare and Development Office (MSWDO)", "1016", "mswdo@losbanos.gov.ph"],
  ["Public Employment Service Office (PESO)", "4008", "peso@losbanos.gov.ph"],
  ["Public Information Office (PIO)", "3017", "pio@losbanos.gov.ph"],
  ["Municipal General Services Office (GSO)", "4002", "gso@losbanos.gov.ph"],
  ["Local Civil Registry Office (LCRO)", "1003", "mcr@losbanos.gov.ph"],
  ["Municipal Assessor's Office", "1014", "assessor@losbanos.gov.ph"],
  ["Municipal Treasurer's Office (MTO)", "1011", null],
  ["Municipal Accounting Office", "3008", "omacc@losbanos.gov.ph"],
  ["Municipal Budget Office", "3006", "ombo@losbanos.gov.ph"],
  ["Municipal Human Resource Management Office (HRMO)", "3015", "hrmo@losbanos.gov.ph"],
  ["Persons with Disability Affairs Office (PDAO)", "1004", "pdao@losbanos.gov.ph"],
  ["Municipal Nutrition Office", "3011", "lbnutritionoffice@gmail.com"],
  ["Office for Senior Citizens Affairs (OSCA)", null, null],
  ["Municipal Agriculture Office (MAO)", null, null],
  ["Municipal Tourism and Cultural Affairs Office", "4000", "tourism@losbanos.gov.ph"],
];
export const LOS_BANOS_OFFICIAL_CONTACTS: Record<string, OfficeContact> = Object.fromEntries(
  official.filter(([, ext, email]) => ext || email).map(([officeName, extension, email]) => [officeName, {
    officeName, phone: extension ? trunk : null, extension, email,
    officeHours: null, address: null, notes: null, sourceUrl: source,
    verifiedAt, verifiedBy: "OFFICIAL_WEBSITE" as const,
  }]),
);
