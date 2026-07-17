"use client";

/**
 * Feature panels for every headline capability. Tools that exist link to
 * their real route; tools not built yet are rendered as a non-clickable
 * "Coming soon" card — never a fake working link.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { IconTile } from "@/components/ui/IconTile";
import { Reveal } from "@/components/ui/Reveal";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CreditCardIcon,
  DiceIcon,
  HistoryIcon,
  HomeIcon,
  PieChartIcon,
  ScaleIcon,
  TargetIcon,
  UmbrellaIcon,
  WalletIcon,
} from "@/components/ui/icons";

type Tone = "green" | "mint" | "blue" | "slate";

interface Feature {
  title: string;
  description: string;
  href?: string; // present => built; absent => coming soon
  icon: ReactNode;
  tone: Tone;
}

const FEATURES: Feature[] = [
  { title: "Savings Goal", description: "See how much to set aside each month to reach a target.", href: "/tools/savings-goal", icon: <TargetIcon />, tone: "green" },
  { title: "Mortgage", description: "All-in monthly cost, amortization, and early-payoff savings.", href: "/tools/mortgage", icon: <HomeIcon />, tone: "mint" },
  { title: "Budget", description: "Your own categories, compared to the 50/30/20 guideline.", href: "/tools/budget", icon: <WalletIcon />, tone: "blue" },
  { title: "Debt Payoff", description: "Avalanche vs. snowball: payoff time, interest, and order.", href: "/tools/debt-payoff", icon: <CreditCardIcon />, tone: "green" },
  { title: "Retirement", description: "Compound growth by age, with today's-dollars adjustment.", href: "/tools/retirement", icon: <UmbrellaIcon />, tone: "mint" },
  { title: "Savings Allocation", description: "A common approach to splitting leftover money, with reasons.", href: "/tools/allocator", icon: <PieChartIcon />, tone: "blue" },
  { title: "Portfolio Builder", description: "Assemble your own mix with a live profile-match rating.", href: "/portfolios/build", icon: <BriefcaseIcon />, tone: "green" },
  { title: "Compare Securities", description: "Any two stocks or funds, side by side with live data.", href: "/compare", icon: <ScaleIcon />, tone: "mint" },
  { title: "Portfolio Backtesting", description: "Simulate how $10,000 would have grown across portfolios.", href: "/portfolios/compare", icon: <HistoryIcon />, tone: "blue" },
  { title: "Monte Carlo Simulator", description: "Model a range of possible outcomes, not just one path.", href: "/tools/monte-carlo", icon: <DiceIcon />, tone: "green" },
];

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature, i) => (
        <Reveal key={feature.title} delay={(i % 3) * 0.06}>
          <FeatureCard feature={feature} />
        </Reveal>
      ))}
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const inner = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <IconTile tone={feature.tone}>{feature.icon}</IconTile>
        {!feature.href && <Badge tone="soon">Coming soon</Badge>}
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink">{feature.title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-6 text-muted">
        {feature.description}
      </p>
      {feature.href && (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-link">
          Open tool
          <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      )}
    </div>
  );

  const base =
    "block h-full rounded-2xl border border-edge bg-card p-6 shadow-soft";

  if (feature.href) {
    return (
      <Link
        href={feature.href}
        className={`group ${base} transition duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-lifted`}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={`${base} opacity-90`} aria-disabled="true">
      {inner}
    </div>
  );
}
