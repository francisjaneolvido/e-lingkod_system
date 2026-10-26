import { CivicError } from "@/features/civic/validation";

export const PICKUP_TIME_ZONE = "Asia/Manila";
export const PICKUP_TIME_LABEL = "Philippine time (UTC+08:00)";
const display = new Intl.DateTimeFormat("en-PH", { timeZone: PICKUP_TIME_ZONE, dateStyle: "medium", timeStyle: "short" });

function validCalendar(parts: RegExpMatchArray) {
  const [year, month, day, hour, minute, second] = [parts[1], parts[2], parts[3], parts[4], parts[5], parts[6] ?? "0"].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second) throw new CivicError("Enter a valid pickup calendar date and time.", 400);
}

/** datetime-local is a Philippine wall clock, regardless of the browser's zone. */
export function manilaPickupInstant(value: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!parts) throw new CivicError(`Enter a pickup date and time in ${PICKUP_TIME_LABEL}.`, 400);
  validCalendar(parts);
  return new Date(value + ":00+08:00").toISOString();
}

/** APIs accept unambiguous ISO timestamps only; MySQL/Prisma store the instant. */
export function parsePickupInstant(value: unknown): Date {
  const parts = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value) : null;
  if (!parts) throw new CivicError("Pickup timestamps must include Z or an explicit UTC offset.", 400);
  validCalendar(parts);
  const date = new Date(value as string);
  if (!Number.isFinite(date.getTime())) throw new CivicError("Enter a valid pickup timestamp and UTC offset.", 400);
  return date;
}

export function formatPickupTime(value: string | Date): string {
  return `${display.format(new Date(value))} · ${PICKUP_TIME_LABEL}`;
}
