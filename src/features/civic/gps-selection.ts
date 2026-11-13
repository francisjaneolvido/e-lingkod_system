import type { LocationValue } from "./types";

export type GpsReading = { latitude: number; longitude: number; accuracy: number };
export const GPS_TARGET_ACCURACY_METERS = 15;

/**
 * A geolocation accuracy value is an estimate in meters, not a guarantee.
 * Never replace a citizen's chosen incident pin without an explicit action.
 * When GPS is already selected, only use a more accurate valid reading.
 */
export function chooseGpsReading(
  current: LocationValue,
  reading: GpsReading,
  timestamp: number,
  allowManualReplacement = false,
): LocationValue | null {
  if (!Number.isFinite(reading.latitude) || reading.latitude < -90 || reading.latitude > 90 ||
      !Number.isFinite(reading.longitude) || reading.longitude < -180 || reading.longitude > 180 ||
      !Number.isFinite(reading.accuracy) || reading.accuracy < 0 || reading.accuracy > 1_000_000) {
    return null;
  }
  if (current.source === "MANUAL" && !allowManualReplacement) return null;
  if (current.source === "GPS" && current.accuracy !== null && reading.accuracy >= current.accuracy) return null;

  // Keep the precision of saved coordinates; never substitute an approximate address center.
  const capturedAt = Number.isFinite(timestamp) && timestamp >= 0 && timestamp < 8.64e15
    ? new Date(timestamp).toISOString()
    : null;
  return {
    latitude: reading.latitude.toFixed(7),
    longitude: reading.longitude.toFixed(7),
    accuracy: Math.round(reading.accuracy * 10) / 10,
    source: "GPS",
    capturedAt,
  };
}

export function gpsErrorMessage(code: number) {
  if (code === 1) return "Location permission was denied. Choose the incident point on the map or enter coordinates manually.";
  if (code === 3) return "Location timed out. Try Refresh Location or choose the incident point on the map.";
  return "Device location is unavailable. Choose the incident point on the map or enter coordinates manually.";
}
