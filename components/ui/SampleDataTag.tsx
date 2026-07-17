/**
 * Visible marker for any number, chart, or widget NOT backed by the real
 * data layer. Data-honesty rule: every illustrative widget must carry one.
 */
export function SampleDataTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-edge bg-card-tint px-2 py-0.5 text-[11px] font-medium text-muted ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky" />
      Sample data (for illustration only)
    </span>
  );
}
