"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, MessageSquareText, Files, BriefcaseBusiness, SearchCheck, Siren, Building2 } from "lucide-react";
import { heroSlides, nextHeroSlide, type HeroNavigation, type HeroSlide } from "../data/hero-slides";

const intents = [
  { id: "report", label: "Report a concern", icon: MessageSquareText, title: "Help us understand what happened.", description: "Send the location and a photo, then keep your tracking ID for updates.", action: "Start a report", href: "/reports/new", lgu: "/admin/reports" },
  { id: "service", label: "Request a service", icon: Files, title: "Find the requirements before you begin.", description: "Browse permits, clearances and assistance. Each guide explains the next step.", action: "Find a service", href: "/services", lgu: "/admin/services" },
  { id: "opportunities", label: "Find opportunities", icon: BriefcaseBusiness, title: "Explore work, skills and training.", description: "Browse reviewed opportunities and manage your community employment profile.", action: "Explore opportunities", href: "/community-employment", lgu: "/admin/jobs" },
] as const;

export function HeroSection({ isLgu = false }: { isLgu?: boolean }) {
  const [active, setActive] = useState(0), [intent, setIntent] = useState<string>("report");
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const slide: HeroSlide = heroSlides[active], selected = intents.find(item => item.id === intent)!;
  const navigate = (action: HeroNavigation) => setActive(current => nextHeroSlide(current, action, heroSlides.length));
  function handlePhotoKeys(event: KeyboardEvent<HTMLDivElement>) {
    const action = ({ ArrowLeft: "previous", ArrowRight: "next", Home: "first", End: "last" } as const)[event.key as "ArrowLeft" | "ArrowRight" | "Home" | "End"];
    if (action) { event.preventDefault(); navigate(action); }
  }
  return <section id="home" className="gateway-hero" aria-labelledby="elb-hero-heading"
    onTouchStart={event => { touchStart.current = null; if (event.touches.length !== 1 || (event.target as HTMLElement).closest("a, button, input, label")) return; touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
    onTouchCancel={() => { touchStart.current = null; }}
    onTouchEnd={event => { const start = touchStart.current; touchStart.current = null; if (!start || !event.changedTouches.length) return; const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y; if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) navigate(dx < 0 ? "next" : "previous"); }}>
    <div className="public-container gateway-shell">
      <div className="gateway-welcome"><p className="public-location"><MapPin size={17} aria-hidden="true" /> eLingkod Bayan</p><h1 id="elb-hero-heading">Ang serbisyo,<br />nagsisimula sa’yo.</h1><p>A concern to share. A service to find. Start with what you need.</p></div>
      <div className="gateway-start">
        <fieldset><legend>What would you like to do?</legend><div className="gateway-choices">{intents.map(item => <label key={item.id} className={intent === item.id ? "is-selected" : ""}><input type="radio" name="service-intent" value={item.id} checked={intent === item.id} onChange={() => setIntent(item.id)} /><item.icon size={22} aria-hidden="true" /><span>{item.label}</span></label>)}</div></fieldset>
        <div className="gateway-preview" aria-live="polite" aria-atomic="true"><h2>{selected.title}</h2><p>{selected.description}</p></div>
        <Link className="elb-button elb-button-primary gateway-continue" href={isLgu ? selected.lgu : selected.href} prefetch={false}>{isLgu ? "Open LGU workspace" : selected.action}<ArrowRight size={20} aria-hidden="true" /></Link>
        <Link href="/#services" className="gateway-all-services">Browse all services</Link>
      </div>
      <div className="public-photo gateway-photo" role="region" aria-label="Community photos" aria-roledescription="carousel">
        <div className="public-photo-image">
          {!failedPhotos[slide.path] ? <Image key={slide.path} src={slide.path} alt={slide.alt} fill loading={active === 0 ? "eager" : "lazy"} fetchPriority={active === 0 ? "high" : "auto"} sizes="(max-width: 767px) 100vw, 55vw" className="object-cover" style={{ objectPosition: slide.focalPoint }} onError={() => setFailedPhotos(current => ({ ...current, [slide.path]: true }))} /> : <p className="public-photo-fallback">Community image unavailable.<br />Services remain available.</p>}
        </div>
        <div className="public-photo-footer"><p>{failedPhotos[slide.path] ? "Community image unavailable. Services remain available." : [slide.caption, slide.credit].filter(Boolean).join(" · ")}</p><div role="group" aria-label="Photo controls" onKeyDown={handlePhotoKeys} className="public-photo-controls">
          <button type="button" onClick={() => navigate("previous")} aria-label="Previous community photo"><ChevronLeft size={18} aria-hidden="true" /></button>
          {heroSlides.map((photo, index) => <button key={photo.path} type="button" onClick={() => setActive(index)} aria-label={`Show community photo ${index + 1} of ${heroSlides.length}`} aria-pressed={active === index}><span aria-hidden="true" /></button>)}
          <button type="button" onClick={() => navigate("next")} aria-label="Next community photo"><ChevronRight size={18} aria-hidden="true" /></button>
        </div></div>
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">Community photo {active + 1} of {heroSlides.length}. {failedPhotos[slide.path] ? "Image unavailable." : slide.alt}</p>
      </div>
      <div className="gateway-return"><Link href="/track"><SearchCheck size={21} aria-hidden="true" /><span>Already have a report?<strong>Track with your reference ID</strong></span><ArrowRight size={20} aria-hidden="true" /></Link><nav aria-label="Useful local information"><Link href="/emergency"><Siren size={18} aria-hidden="true" />Emergency hotlines</Link><Link href="/projects"><Building2 size={18} aria-hidden="true" />Projects &amp; offices</Link></nav></div>
    </div>
  </section>;
}
