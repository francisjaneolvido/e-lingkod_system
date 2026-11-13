import { requireCitizenApiViewer } from "@/lib/access";
import { apiFailure, json } from "@/features/civic/server/http";
import { CivicError } from "@/features/civic/validation";
import { consumeProviderBudget } from "@/features/civic/server/provider-budget";

export async function GET(request: Request) {
  try {
    const viewer = await requireCitizenApiViewer(request);
    const key = process.env.GEOAPIFY_API_KEY;
    if (!key) throw new CivicError("Address lookup is unavailable. Enter the address manually.", 503);
    const params = new URL(request.url).searchParams;
    const rawLat = params.get("lat"), rawLon = params.get("lon");
    if (!rawLat || !rawLon || rawLat.length > 20 || rawLon.length > 20) throw new CivicError("Choose a valid point on the map.");
    const lat = Number(rawLat), lon = Number(rawLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new CivicError("Choose a valid point on the map.");
    await consumeProviderBudget(viewer.id, "GEOCODE");
    const endpoint = new URL("https://api.geoapify.com/v1/geocode/reverse");
    endpoint.search = new URLSearchParams({ lat: String(lat), lon: String(lon), format: "json", apiKey: key }).toString();
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) throw new CivicError("Address lookup is unavailable. Enter the address manually.", 503);
    const body = await response.json();
    const place = body.results?.[0];
    if (!place || typeof place.formatted !== "string") throw new CivicError("No street address was found. Enter a nearby landmark manually.", 404);
    return json({ address: place.formatted.slice(0, 300), barangay: String(place.suburb || place.district || place.city || "").slice(0, 100) });
  } catch (error) {
    if (error instanceof CivicError) return apiFailure(error);
    return apiFailure(new CivicError("Address lookup is unavailable. Enter the address manually.", 503));
  }
}
