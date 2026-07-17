import type { ReactNode } from "react";

/**
 * Colored rounded tile behind a feature icon. Pass one of the shared icons
 * as children; it inherits the tile's tone color via currentColor.
 */

type Tone = "green" | "mint" | "blue" | "slate";

const TONES: Record<Tone, string> = {
  green: "bg-primary/10 text-link",
  mint: "bg-accent/15 text-link",
  blue: "bg-sky/20 text-sky-ink",
  slate: "bg-card-tint text-muted",
};

export function IconTile({
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
      aria-hidden="true"
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[22px] ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
