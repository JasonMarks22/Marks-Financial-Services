import type { ReactNode } from "react";

/**
 * Shared panel: card surface with a 1px border and square-ish corners.
 * `hover` darkens the border for interactive cards (links, tools).
 */
export function Card({
  className = "",
  hover = false,
  children,
}: {
  className?: string;
  hover?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-sm border border-edge bg-card ${
        hover ? "transition-colors hover:border-ink/40" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
