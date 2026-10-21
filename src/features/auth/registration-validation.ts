/** Shared client/server validation. The server must never trust only the form. */
export type RegistrationFields = {
  firstName: string;
  lastName: string;
  middleInitial: string;
  hasNoMiddleName: boolean;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword?: string;
};
export type SafeRegistration = Omit<RegistrationFields,"confirmPassword"> & { name: string };
export type ValidationResult = { ok: true; data: SafeRegistration } | { ok: false; errors: Partial<Record<keyof RegistrationFields,string>> };

const clean = (value: unknown): string => typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : "";
const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019.-][\p{L}\p{M}]+)*\.?$/u;
const countLetters = (value: string) => (value.match(/\p{L}/gu) ?? []).length;

export function normalizePhilippineMobile(value: unknown): string | null {
  const v = clean(value).replace(/[\s-]/g, "");
  if (/^09\d{9}$/.test(v)) return "+63" + v.slice(1);
  if (/^\+639\d{9}$/.test(v)) return v;
  if (/^639\d{9}$/.test(v)) return "+" + v;
  return null;
}
export const passwordChecks = (password: string) => ({
  length: password.length >= 12 && password.length <= 128,
  lower: /[a-z]/.test(password),
  upper: /[A-Z]/.test(password),
  number: /[0-9]/.test(password),
  symbol: /[^A-Za-z0-9\s]/.test(password),
});
export function checkRegistration(input: Partial<RegistrationFields> | Record<string, unknown>): ValidationResult {
  const firstName = clean(input.firstName);
  const lastName = clean(input.lastName);
  const middleRaw = clean(input.middleInitial);
  const hasNoMiddleName = input.hasNoMiddleName === true;
  const middleInitial = middleRaw.replace(/\.$/, "").toUpperCase();
  const email = clean(input.email).toLowerCase();
  const phoneNumber = normalizePhilippineMobile(input.phoneNumber);
  const password = typeof input.password === "string" ? input.password : "";
  const errors: Partial<Record<keyof RegistrationFields,string>> = {};
  for (const [key, val] of [["firstName",firstName],["lastName",lastName]] as const) {
    if (countLetters(val) < 2 || val.length > 100 || !namePattern.test(val)) {
      errors[key] = "Use at least 2 letters. Names cannot contain numbers or invalid symbols.";
    }
  }
  if (hasNoMiddleName) {
    if (middleRaw) errors.middleInitial = "Leave Middle Initial blank when No middle name is selected.";
  } else if (!/^\p{L}$/u.test(middleInitial)) {
    errors.middleInitial = "Enter one letter for your middle initial, or select No middle name.";
  }
  if (!phoneNumber) errors.phoneNumber = "Enter a valid PH mobile number: 09XXXXXXXXX or +639XXXXXXXXX.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) errors.email = "Enter a valid email address.";
  if (!Object.values(passwordChecks(password)).every(Boolean)) errors.password = "Password does not meet all the requirements.";
  if ("confirmPassword" in input && input.confirmPassword !== password) errors.confirmPassword = "Passwords do not match.";
  if (Object.keys(errors).length) return {ok:false,errors};
  return {ok:true,data:{ firstName,lastName,middleInitial:hasNoMiddleName ? "":middleInitial,hasNoMiddleName,phoneNumber:phoneNumber!,email,password,
    name:[firstName,hasNoMiddleName ? "":`${middleInitial}.`,lastName].filter(Boolean).join(" ")}};
}
