import type { ReactNode } from "react";

/**
 * Standard page-width wrapper: content maxes out at 1400px, centered, with
 * responsive side padding. Use inside full-bleed sections.
 */
export function Container({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1400px] px-6 sm:px-10 lg:px-14 ${className}`}>
      {children}
    </div>
  );
}
