import { CheckIcon, MinusIcon, XIcon } from "@/components/ui/icons";

/**
 * "Why use this platform" — honest comparison of this app vs. spreadsheets
 * vs. basic online calculators. Claims reflect capabilities the app really
 * has today.
 */

type Cell = "yes" | "partial" | "no";

const ROWS: { feature: string; platform: Cell; sheets: Cell; basic: Cell }[] = [
  { feature: "Six planning calculators in one place", platform: "yes", sheets: "partial", basic: "partial" },
  { feature: "Live market data for real securities", platform: "yes", sheets: "no", basic: "no" },
  { feature: "Historical portfolio backtesting", platform: "yes", sheets: "partial", basic: "no" },
  { feature: "Interactive charts, no setup", platform: "yes", sheets: "partial", basic: "partial" },
  { feature: "Save scenarios to an account", platform: "yes", sheets: "partial", basic: "no" },
  { feature: "No formulas to build or break", platform: "yes", sheets: "no", basic: "yes" },
  { feature: "Method and assumptions explained", platform: "yes", sheets: "no", basic: "no" },
];

const COLS = [
  { key: "platform" as const, label: "Our Platform", highlight: true },
  { key: "sheets" as const, label: "Spreadsheets", highlight: false },
  { key: "basic" as const, label: "Basic Calculators", highlight: false },
];

function Mark({ value }: { value: Cell }) {
  if (value === "yes")
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-link">
        <CheckIcon className="h-4 w-4" />
        <span className="sr-only">Yes</span>
      </span>
    );
  if (value === "partial")
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-card-tint text-muted">
        <MinusIcon className="h-4 w-4" />
        <span className="sr-only">Partial</span>
      </span>
    );
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-card-tint text-neutral-400">
      <XIcon className="h-3.5 w-3.5" />
      <span className="sr-only">No</span>
    </span>
  );
}

export function WhyPlatform() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-2/5 px-4 py-3 text-left text-sm font-semibold text-muted">
              Capability
            </th>
            {COLS.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-center text-sm font-bold ${
                  col.highlight ? "text-link" : "text-neutral-700"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.feature}>
              <td
                className={`px-4 py-3 text-sm text-neutral-700 ${
                  i === 0 ? "border-t border-edge" : "border-t border-edge"
                }`}
              >
                {row.feature}
              </td>
              {COLS.map((col) => (
                <td
                  key={col.key}
                  className={`border-t border-edge px-4 py-3 text-center ${
                    col.highlight ? "bg-card-tint" : ""
                  }`}
                >
                  <Mark value={row[col.key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
