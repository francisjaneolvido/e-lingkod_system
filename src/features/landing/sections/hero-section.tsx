"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { heroSlides, nextHeroSlide, type HeroNavigation, type HeroSlide } from "../data/hero-slides";

/**
 * Public home hero. Full-width photo banner, styled for desktop first.
 * All actions navigate to existing V3 sections; no fake back-end behavior.
 */
export function HeroSection() {
  const [active, setActive] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const slide: HeroSlide = heroSlides[active];
  const navigate = (action: HeroNavigation) => setActive(current => nextHeroSlide(current, action, heroSlides.length));

  function handlePhotoKeys(event: KeyboardEvent<HTMLDivElement>) {
    const action = ({ ArrowLeft: "previous", ArrowRight: "next", Home: "first", End: "last" } as const)[event.key as "ArrowLeft" | "ArrowRight" | "Home" | "End"];
    if (action) {
      event.preventDefault();
      navigate(action);
    }
  }

  return (
    <section
      id="home"
      aria-label="Community photos"
      aria-roledescription="carousel"
      className="relative isolate scroll-mt-24 overflow-hidden bg-primary text-white"
      onTouchStart={event => {
        touchStart.current = null;
        if (event.touches.length !== 1 || (event.target as HTMLElement).closest("a, button")) return;
        touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }}
      onTouchCancel={() => { touchStart.current = null; }}
      onTouchEnd={event => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start || !event.changedTouches.length) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) navigate(dx < 0 ? "next" : "previous");
      }}
    >
      {/* Image is illustrative; we are not claiming a specific municipality. */}
      {!failedPhotos[slide.path] && <Image
        key={slide.path}
        src={slide.path}
        alt={slide.alt}
        fill
        loading={active === 0 ? "eager" : "lazy"}
        fetchPriority={active === 0 ? "high" : "auto"}
        sizes="100vw"
        className="-z-20 object-cover"
        style={{ objectPosition: slide.focalPoint }}
        onError={() => setFailedPhotos(current => ({ ...current, [slide.path]: true }))}
      />}
      {/* Layered gradient maintains readable text, including on small screens. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,44,80,.97)_0%,rgba(8,57,100,.94)_29%,rgba(12,73,119,.75)_52%,rgba(12,73,119,.29)_100%)] max-md:bg-[linear-gradient(90deg,rgba(7,44,80,.96),rgba(9,54,94,.83))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-25 [background:radial-gradient(circle_at_75%_14%,rgba(254,212,111,.42),transparent_34%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#093b68]/50 to-transparent"
      />

      <div className="mx-auto flex min-h-[525px] max-w-[1440px] flex-col justify-center px-5 pb-8 pt-14 sm:min-h-[540px] sm:px-8 lg:min-h-[550px] lg:px-12 lg:pt-20 xl:min-h-[570px] 2xl:min-h-[590px]">
        <div className="relative z-10 max-w-[795px]">
          <p className="mb-6 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[.15em] text-on-brand-gold sm:text-[12px]">
            <span className="h-[3px] w-9 shrink-0 rounded-full bg-brand-gold" />
            Welcome to E-Lingkod Bayan
          </p>
          <h1
            id="elb-hero-heading"
            className="text-[clamp(2.7rem,5.3vw,5.25rem)] font-extrabold leading-[1.08] tracking-[-.052em] [text-wrap:balance]"
          >
            Serbisyong bayan,
            <br className="hidden sm:block" />{" "}
            <span className="text-on-brand-gold">mas malapit sa’yo.</span>
          </h1>
          <p className="mt-5 max-w-[640px] text-[13px] leading-[1.85] text-[#e7f1fa] sm:mt-6 sm:text-[15px] lg:text-[16px]">
            Mag-ulat ng concern, mag-request ng serbisyo, at makahanap ng
            oportunidad — lahat sa iisang digital community portal.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center">
            <Link
              href="/#services"
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-brand-gold px-6 py-3 text-[12px] font-extrabold text-on-gold shadow-[0_13px_28px_rgba(0,0,0,.16)] transition hover:-translate-y-0.5 hover:bg-brand-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-auto"
            >
              Explore services
              <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="/track"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/60 bg-card/10 px-6 py-3 text-[12px] font-bold text-white backdrop-blur-sm transition hover:bg-card/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-auto"
            >
              Track a report
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-on-brand-muted sm:mt-10 sm:text-xs">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-on-brand-gold" /> Citizen-centered</span>
            <span className="inline-flex items-center gap-2"><MapPin size={15} className="text-on-brand-gold" /> One connected portal</span>
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 pb-7 sm:px-8 lg:px-12">
        <p className="max-w-full rounded-lg bg-[#072c50] px-3 py-2 text-xs leading-5 text-on-brand-muted">{failedPhotos[slide.path] ? "Community image unavailable. Services remain available." : [slide.caption,slide.credit].filter(Boolean).join(' · ')}</p>
        <div role="group" aria-label="Photo controls" onKeyDown={handlePhotoKeys} className="flex flex-wrap items-center gap-1 rounded-xl border border-white/40 bg-[#072c50] p-1 text-white">
          <button type="button" onClick={() => navigate("previous")} aria-label="Previous community photo" className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><ChevronLeft size={20} aria-hidden="true" /></button>
          {heroSlides.map((photo, index) => <button key={photo.path} type="button" onClick={() => setActive(index)} aria-label={`Show community photo ${index + 1} of ${heroSlides.length}`} aria-pressed={active === index} className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><span aria-hidden="true" className={`size-2.5 rounded-full ${active === index ? "bg-brand-gold ring-2 ring-white ring-offset-2 ring-offset-[#072c50]" : "bg-white/65"}`} /></button>)}
          <button type="button" onClick={() => navigate("next")} aria-label="Next community photo" className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><ChevronRight size={20} aria-hidden="true" /></button>
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">Community photo {active + 1} of {heroSlides.length}. {failedPhotos[slide.path] ? "Image unavailable." : slide.alt}</p>
      </div>

      {/* Editorial shape makes this the site's own visual identity, not a QC copy. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[5px] bg-[linear-gradient(90deg,#f9b932_0%,#f9b932_25%,#56a8d6_25%,#56a8d6_58%,#ecf7ff_58%,#ecf7ff_100%)]" />
    </section>
  );
}
