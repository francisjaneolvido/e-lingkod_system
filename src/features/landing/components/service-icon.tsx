import type { LucideIcon } from "lucide-react";

/** Monochrome eLB icon badge shared across the service tiles, featured cards, and dialogs. */
type ServiceIconSize = "sm" | "md" | "lg";

const dimensions: Record<ServiceIconSize, { wrapper: string; glyph: number }> = {
  sm: { wrapper: "size-10 rounded-xl", glyph: 20 },
  md: { wrapper: "size-12 rounded-2xl", glyph: 24 },
  lg: { wrapper: "size-14 rounded-2xl", glyph: 28 },
};

export function ServiceIcon({
  icon: Icon,
  size = "md",
  className = "",
}: {
  icon: LucideIcon;
  size?: ServiceIconSize;
  className?: string;
}) {
  const { wrapper, glyph } = dimensions[size];

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border border-border bg-muted text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ${wrapper} ${className}`}
    >
      <Icon size={glyph} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </span>
  );
}
