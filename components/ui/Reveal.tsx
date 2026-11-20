import type { ReactNode } from "react";

/**
 * Formerly a fade-up-on-scroll wrapper. Content now renders in place with no
 * entrance animation: data tools should feel instant and steady, not staged.
 * Kept as a pass-through so existing call sites keep working.
 */
export function Reveal({
  className = "",
  children,
}: {
  /** Unused; kept for call-site compatibility. */
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return <div className={className}>{children}</div>;
}
