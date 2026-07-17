import type { ReactNode } from "react";

/**
 * Shared panel: white card on the page canvas, 16px radius, soft shadow.
 * `hover` adds a gentle lift for interactive cards (links, tools).
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
      className={`rounded-2xl border border-edge bg-card shadow-soft ${
        hover
          ? "transition duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-lifted"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
