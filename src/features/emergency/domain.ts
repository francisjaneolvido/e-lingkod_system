// Shared pure-domain definitions. These are not live emergency announcements.
export const LOS_BANOS_BARANGAYS = [
  "Anos", "Bagong Silang", "Bambang", "Batong Malake", "Baybayin", "Bayog",
  "Lalakay", "Maahas", "Malinta", "Mayondon", "San Antonio", "Tadlac",
  "Timugan (Poblacion)", "Tuntungin-Putho",
] as const;
export const HOTLINE_CATEGORIES = ["POLICE", "FIRE", "MEDICAL", "RESCUE", "BARANGAY", "SOCIAL", "UTILITY", "OTHER"] as const;
export const ALERT_SEVERITIES = ["INFORMATION", "ADVISORY", "WARNING", "CRITICAL"] as const;
export type AlertSeverity = typeof ALERT_SEVERITIES[number];
export const OFFICIAL_NUMBERS = [
  { id: "national-911", title: "National Emergency Hotline", category: "RESCUE", office: "Philippine Emergency 911", phone: "911", extension: null, note: "For urgent police, fire, rescue or medical emergencies", sourceUrl: "https://ehotlines.e.gov.ph/", verifiedAt: null },
  { id: "red-cross-143", title: "Philippine Red Cross", category: "MEDICAL", office: "Philippine Red Cross", phone: "143", extension: null, note: "National Red Cross emergency hotline", sourceUrl: "https://redcross.org.ph/contact-us/", verifiedAt: null },
] as const;

export function normalizedPhone(raw: string) {
  const phone = raw.replace(/[\s().-]/g, "");
  // Tel destinations may only contain a legitimate dialable number, never arbitrary schemes.
  if (!/^\+?[0-9]{3,15}$/.test(phone)) throw new Error("Enter a valid Philippine phone number, including area code when needed.");
  return phone;
}
export function acceptedSourceUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.href.length > 500) throw new Error();
    return url.href;
  } catch { throw new Error("Provide a public https:// source confirming this contact or alert."); }
}
export function validBarangays(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > LOS_BANOS_BARANGAYS.length ||
    input.some(value => typeof value !== "string" || !LOS_BANOS_BARANGAYS.includes(value as typeof LOS_BANOS_BARANGAYS[number])))
    throw new Error("Select one or more valid Los Baños barangays.");
  return [...new Set(input)];
}
export function safeText(input: unknown, label: string, max: number, required = true) {
  if (typeof input !== "string") throw new Error(`${label} must be text.`);
  const value = input.trim();
  if (value.length > max || (required && !value)) throw new Error(`${label} must be ${required ? `1–${max}` : `at most ${max}`} characters.`);
  return value;
}
export function parseFutureWindow(starts: unknown, expires: unknown, now = new Date()) {
  if (typeof starts !== "string" || typeof expires !== "string") throw new Error("Choose a start and expiry date.");
  const startsAt = new Date(starts), expiresAt = new Date(expires);
  if (Number.isNaN(startsAt.valueOf()) || Number.isNaN(expiresAt.valueOf()) ||
    expiresAt <= startsAt || expiresAt <= now || expiresAt.getTime() - startsAt.getTime() > 30 * 86400000)
    throw new Error("Expiry must be after the start time, in the future and within 30 days.");
  return { startsAt, expiresAt };
}
export function belongsToEmergencyOffice(department: string | null | undefined) {
  const office = (department || "").toLowerCase();
  return /mdrrmo|disaster risk|public information|operations center|operation center|municipal health|social welfare/.test(office);
}
