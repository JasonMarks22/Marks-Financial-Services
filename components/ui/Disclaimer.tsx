import type { ReactNode } from "react";

/**
 * Shared educational disclaimer. The core wording is fixed and must appear
 * wherever analysis, grades, backtests, or projections are shown; pass extra
 * page-specific notes (market-data caveats, method notes) as children.
 */
export function Disclaimer({
  className = "",
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <p className={`text-xs leading-5 text-muted ${className}`}>
      For educational purposes only. Not financial or investment advice. Past
      performance does not guarantee future results.
      {children && <> {children}</>}
    </p>
  );
}
