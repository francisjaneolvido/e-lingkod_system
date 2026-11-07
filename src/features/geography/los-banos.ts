/** Public boundary identifiers, never an authorization or permission crosswalk. */
export const LOS_BANOS_REGIONS = [
  { code: '0403411001', name: 'Anos', appName: 'Anos', center: [121.2326368, 14.17252087] },
  { code: '0403411002', name: 'Bagong Silang', appName: 'Bagong Silang', center: [121.22720994, 14.12657783] },
  { code: '0403411003', name: 'Bambang', appName: 'Bambang', center: [121.21040956, 14.15692158] },
  { code: '0403411004', name: 'Batong Malake', appName: 'Batong Malake', center: [121.23228004, 14.14871207] },
  { code: '0403411005', name: 'Baybayin', appName: 'Baybayin', center: [121.22381786, 14.18128056] },
  { code: '0403411006', name: 'Bayog', appName: 'Bayog', center: [121.25049261, 14.18972571] },
  { code: '0403411007', name: 'Lalakay', appName: 'Lalakay', center: [121.19344482, 14.15449277] },
  { code: '0403411008', name: 'Maahas', appName: 'Maahas', center: [121.25933476, 14.17176075] },
  { code: '0403411015', name: 'Malinta', appName: 'Malinta', center: [121.23191431, 14.18471925] },
  { code: '0403411010', name: 'Mayondon', appName: 'Mayondon', center: [121.23743248, 14.18993207] },
  { code: '0403411011', name: 'Putho Tuntungin', appName: 'Tuntungin-Putho', center: [121.25273651, 14.15233562] },
  { code: '0403411012', name: 'San Antonio', appName: 'San Antonio', center: [121.24979186, 14.17070454] },
  { code: '0403411013', name: 'Tadlak', appName: 'Tadlac', center: [121.20702303, 14.18015987] },
  { code: '0403411014', name: 'Timugan', appName: 'Timugan (Poblacion)', center: [121.21604625, 14.15190398] },
] as const;

export type LosBanosRegionCode = typeof LOS_BANOS_REGIONS[number]['code'];

const correspondenceCodes: Record<LosBanosRegionCode, string> = {
  '0403411001': '043411001', '0403411002': '043411002', '0403411003': '043411003',
  '0403411004': '043411004', '0403411005': '043411005', '0403411006': '043411006',
  '0403411007': '043411007', '0403411008': '043411008', '0403411010': '043411010',
  '0403411011': '043411011', '0403411012': '043411012', '0403411013': '043411013',
  '0403411014': '043411014', '0403411015': '043411015',
};
const additionalNames: Partial<Record<LosBanosRegionCode, readonly string[]>> = {
  '0403411005': ['Baybayin (Pob.)', 'Baybayin (Poblacion)'],
  '0403411011': ['Putho-Tuntungin'],
  '0403411014': ['Timugan (Pob.)'],
};
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const identifiers = new Map<string, LosBanosRegionCode>();
for (const region of LOS_BANOS_REGIONS) {
  for (const value of [region.code, `PH${region.code}`, correspondenceCodes[region.code], region.name, region.appName, ...(additionalNames[region.code] ?? [])]) {
    identifiers.set(normalize(value), region.code);
  }
}

/** Resolve only the verified identifiers. Authorize the original record key first. */
export function resolveBarangayCode(value: unknown): string | null {
  return typeof value === 'string' ? identifiers.get(normalize(value)) ?? null : null;
}
