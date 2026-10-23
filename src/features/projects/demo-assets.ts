/** Fictional hackathon examples, never official Los Baños project evidence. */
export const PROJECT_DEMO_PHOTOS = [
  { path: "/images/demo-projects/road-improvement.webp", label: "Sample road improvement" },
  { path: "/images/demo-projects/health-center.webp", label: "Sample health center" },
  { path: "/images/demo-projects/drainage.webp", label: "Sample drainage improvement" },
  { path: "/images/demo-projects/community-playground.webp", label: "Sample community park" },
  { path: "/images/demo-projects/streetlights.webp", label: "Sample street lighting" },
] as const;
export const DEMO_PROJECT_PHOTO_PATHS = new Set<string>(PROJECT_DEMO_PHOTOS.map(item => item.path));
export function projectPhotoPath(input: unknown): string | null {
  if (input === undefined || input === null || input === "") return null;
  if (typeof input !== "string" || !DEMO_PROJECT_PHOTO_PATHS.has(input)) {
    throw new Error("Select a photo from the sample project gallery.");
  }
  return input;
}
