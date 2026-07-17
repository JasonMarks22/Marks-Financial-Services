import type { ReactNode } from "react";

/**
 * Small rounded label. Tones map to the design tokens; all pass AA contrast
 * on their tinted backgrounds in both themes.
 */

type Tone = "green" | "blue" | "neutral" | "soon";

const TONES: Record<Tone, string> = {
  green: "bg-accent/15 text-link",
  blue: "bg-sky/20 text-sky-ink",
  neutral: "bg-card-tint text-muted",
  soon: "border border-edge bg-card-tint text-muted",
};

export function Badge({
  tone = "green",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
