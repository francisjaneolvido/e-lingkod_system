/** Only permit same-site destinations after login or registration. */
export function getSafeAuthDestination(): string {
  if (typeof window === "undefined") return "/";
  const intendedPath = new URLSearchParams(window.location.search).get("next");
  if (!intendedPath || !intendedPath.startsWith("/") || intendedPath.startsWith("//") || intendedPath.includes("\\")) {
    return "/";
  }
  return intendedPath;
}
