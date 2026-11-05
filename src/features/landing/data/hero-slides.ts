export type HeroSlide = {
  path: `/images/landing/${string}`;
  alt: string;
  caption?: string;
  credit?: string;
  focalPoint: `${number}% ${number}%`;
};

/** Replace approved assets and their attribution here; see docs/hero-photos.md. */
export const heroSlides = [
  {
    path: "/images/landing/elb-civic-hero.webp",
    alt: "Illustrative community scene of volunteers tending plants beside residents in a plaza",
    credit: "eLingkod Bayan · Illustrative community image",
    focalPoint: "60% 47%",
  },
  {
    path: "/images/landing/bayanihan-community.webp",
    alt: "Illustrative wide view of neighbors volunteering together along a tree-lined community plaza",
    credit: "eLingkod Bayan · Illustrative community image",
    focalPoint: "65% 48%",
  },
  {
    path: "/images/landing/neighbors-at-work.webp",
    alt: "Illustrative close view of volunteers gardening and talking with older neighbors",
    credit: "eLingkod Bayan · Illustrative community image",
    focalPoint: "55% 50%",
  },
] as const satisfies readonly HeroSlide[];

export type HeroNavigation = "previous" | "next" | "first" | "last";

export function nextHeroSlide(current: number, action: HeroNavigation, count: number) {
  if (action === "first") return 0;
  if (action === "last") return count - 1;
  return (current + (action === "next" ? 1 : -1) + count) % count;
}
