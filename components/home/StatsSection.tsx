import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

/**
 * KPI stat blocks. Numbers here describe real capabilities of the app (data
 * depth, metric coverage, tool counts) — not fabricated usage metrics.
 * Capability-style items with no meaningful number are shown as labels.
 */

interface Stat {
  value?: number;
  prefix?: string;
  suffix?: string;
  headline?: string; // used instead of a counter for capability claims
  label: string;
}

const STATS: Stat[] = [
  { value: 30, suffix: "+", label: "Years of market data available" },
  { value: 100, suffix: "+", label: "Financial metrics across the tools" },
  { value: 10, label: "Interactive tools and calculators" },
  { headline: "Live", label: "Real-time quotes & price history" },
];

export function StatsSection() {
  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      {STATS.map((stat) => (
        <div key={stat.label} className="text-center">
          <p className="text-4xl font-bold tracking-tight text-link sm:text-5xl">
            {stat.headline ? (
              stat.headline
            ) : (
              <AnimatedCounter
                value={stat.value ?? 0}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
            )}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
