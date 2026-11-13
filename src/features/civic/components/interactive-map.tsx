"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

export type MapPoint = { latitude: number; longitude: number; id?: string; title?: string; trackingId?: string; address?: string; category?: string; status?: string; createdAt?: string; reporterName?: string; description?: string; photoId?: string | null };

export function InteractiveMap({ points, onSelect, height = 290 }: { points: MapPoint[]; onSelect?: (latitude: number, longitude: number) => void; height?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<LeafletMarker[]>([]);
  const callback = useRef(onSelect);
  useEffect(() => { callback.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let active = true;
    void import("leaflet").then(L => {
      if (!active || !container.current) return;
      const instance = L.map(container.current).setView([14.175, 121.244], 12);
      L.tileLayer(process.env.NEXT_PUBLIC_OSM_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 19 }).addTo(instance);
      instance.on("click", event => callback.current?.(event.latlng.lat, event.latlng.lng));
      map.current = instance;
      // Markers are synchronized by the second effect after asynchronous map initialization.
      window.dispatchEvent(new Event("civic-map-ready"));
    });
    return () => { active = false; map.current?.remove(); map.current = null; markers.current = []; };
  }, []);

  const pointsRef = useRef(points);
  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => {
    let active = true;
    const sync = async () => {
      const L = await import("leaflet");
      if (!active || !map.current) return;
      markers.current.forEach(marker => marker.remove());
      const valid = pointsRef.current.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
      markers.current = valid.map(point => {
        const marker = L.marker([point.latitude, point.longitude], { draggable: Boolean(callback.current), icon: L.divIcon({ className: "", html: '<span style="display:block;width:22px;height:22px;border:3px solid white;border-radius:50%;background:#dc6339;box-shadow:0 1px 7px #3339"></span>', iconSize: [22,22], iconAnchor: [11,11] }) }).addTo(map.current!);
        if (callback.current) marker.on("dragend", () => { const pos = marker.getLatLng(); callback.current?.(pos.lat, pos.lng); });
        if (point.id) {
          const reportId = point.id;
          marker.bindPopup(() => {
          const card = document.createElement("div");
          card.style.maxWidth = "250px";
          const heading = document.createElement("strong"); heading.textContent = point.trackingId || "Civic report"; card.append(heading);
          for (const detail of [point.title, point.reporterName, point.category, point.description, point.createdAt, point.address, `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`, point.status]) {
            if (detail) { const row = document.createElement("p"); row.textContent = detail; row.style.margin = "4px 0"; card.append(row); }
          }
          if (point.photoId) { const img = document.createElement("img"); img.src = `/api/reports/photos/${encodeURIComponent(point.photoId)}`; img.alt = "Report evidence"; img.style.cssText = "max-height:90px;max-width:100%"; card.append(img); }
          const links = document.createElement("p");
          const report = document.createElement("a"); report.href = `/admin/reports/${encodeURIComponent(reportId)}`; report.textContent = "Open report"; links.append(report, " · ");
          const directions = document.createElement("a"); directions.href = `https://www.google.com/maps?q=${point.latitude},${point.longitude}`; directions.target = "_blank"; directions.rel = "noopener noreferrer"; directions.textContent = "Google Maps"; links.append(directions); card.append(links);
          return card;
          });
        }
        return marker;
      });
      if (valid.length === 1) map.current.setView([valid[0].latitude, valid[0].longitude], 16);
      else if (valid.length > 1) map.current.fitBounds(L.latLngBounds(valid.map(p => [p.latitude, p.longitude] as [number, number])), { padding: [30,30], maxZoom: 16 });
    };
    void sync();
    window.addEventListener("civic-map-ready", sync);
    return () => { active = false; window.removeEventListener("civic-map-ready", sync); };
  }, [points]);
  return <div ref={container} style={{ height, width: "100%", borderRadius: 12, zIndex: 0 }} role="application" aria-label={onSelect ? "Click the map or drag the marker to adjust the incident location" : "Map of saved civic report locations"} />;
}
