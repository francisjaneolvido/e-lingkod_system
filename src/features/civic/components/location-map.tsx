import { MapPin } from "lucide-react";
import s from "../civic.module.css";

export function LocationMap({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return <div className={s.mapPlaceholder}><span><MapPin size={21} /></span><div><strong>Put your concern on the map</strong><p>Use your location or enter coordinates.<br />An address / landmark also works.</p></div></div>;
  }
  const lat = Math.max(-89.99, Math.min(89.99, latitude));
  const lng = Math.max(-179.99, Math.min(179.99, longitude));
  const query = new URLSearchParams({ bbox: `${lng - .006},${lat - .004},${lng + .006},${lat + .004}`, layer: "mapnik", marker: `${latitude},${longitude}` });
  return <>
    <div className={s.map}><iframe title="Reported location on OpenStreetMap" loading="lazy" referrerPolicy="no-referrer" src={`https://www.openstreetmap.org/export/embed.html?${query}`} /></div>
    <div className={s.mapFooter}><span>{latitude.toFixed(6)}, {longitude.toFixed(6)} · © OpenStreetMap contributors</span><a href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`} target="_blank" rel="noreferrer">Open larger map ↗</a></div>
  </>;
}
