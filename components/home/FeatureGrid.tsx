/**
 * Every planning tool as a row: photo, name, what it does, and a link.
 * Tools that exist link to their real route; tools not built yet render as a
 * non-clickable row marked "Coming soon" — never a fake working link.
 */

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PHOTOS, photoUrl, type Photo } from "@/lib/photos";

interface Feature {
  title: string;
  description: string;
  href?: string; // present => built; absent => coming soon
  photo: Photo;
  group: "Plan" | "Invest";
}

const FEATURES: Feature[] = [
  { group: "Plan", title: "Savings goal", description: "How much to set aside each month to reach a target.", href: "/tools/savings-goal", photo: PHOTOS.savings },
  { group: "Plan", title: "Mortgage", description: "All-in monthly cost, amortization, and early-payoff savings.", href: "/tools/mortgage", photo: PHOTOS.mortgage },
  { group: "Plan", title: "Budget", description: "Your own categories, compared to the 50/30/20 guideline.", href: "/tools/budget", photo: PHOTOS.budget },
  { group: "Plan", title: "Debt payoff", description: "Avalanche vs. snowball: payoff time, interest, and order.", href: "/tools/debt-payoff", photo: PHOTOS.debt },
  { group: "Plan", title: "Retirement", description: "Compound growth by age, in today's dollars.", href: "/tools/retirement", photo: PHOTOS.retirement },
  { group: "Plan", title: "Savings allocation", description: "A common order for splitting leftover money, with reasons.", href: "/tools/allocator", photo: PHOTOS.allocation },
  { group: "Invest", title: "Portfolio builder", description: "Assemble your own mix with a live profile-match rating.", href: "/portfolios/build", photo: PHOTOS.builder },
  { group: "Invest", title: "Compare securities", description: "Any two stocks or funds, side by side with live data.", href: "/compare", photo: PHOTOS.compare },
  { group: "Invest", title: "Backtesting", description: "How $10,000 would have grown across portfolios.", href: "/portfolios/compare", photo: PHOTOS.backtest },
  { group: "Invest", title: "Monte Carlo simulator", description: "1,000 possible futures instead of a single guess.", href: "/tools/monte-carlo", photo: PHOTOS.montecarlo },
];

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-2">
      {(["Plan", "Invest"] as const).map((group) => (
        <div key={group}>
          <h3 className="border-b-2 border-ink pb-2 text-lg font-semibold text-ink">
            {group === "Plan" ? "Plan your money" : "Research and invest"}
          </h3>
          <ul>
            {FEATURES.filter((f) => f.group === group).map((f) => (
              <li key={f.title} className="border-b border-edge">
                <FeatureRow feature={f} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FeatureRow({ feature }: { feature: Feature }) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl(feature.photo, 240, 160)}
        alt={feature.photo.alt}
        width={120}
        height={80}
        loading="lazy"
        className="h-20 w-[120px] shrink-0 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink group-hover:underline underline-offset-2">
          {feature.title}
        </p>
        <p className="mt-0.5 text-sm leading-6 text-muted">{feature.description}</p>
      </div>
      {feature.href ? (
        <span className="hidden shrink-0 text-sm font-medium text-link sm:block">
          Open
        </span>
      ) : (
        <Badge tone="soon">Coming soon</Badge>
      )}
    </>
  );
  const row = "flex items-center gap-5 py-4";
  return feature.href ? (
    <Link href={feature.href} className={`group ${row}`}>
      {inner}
    </Link>
  ) : (
    <div className={`${row} opacity-80`} aria-disabled="true">
      {inner}
    </div>
  );
}
