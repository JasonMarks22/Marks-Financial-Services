import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { CheckIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Every tool is free while Marks Investment Analytics is in beta. An optional free account saves your scenarios and portfolios.",
};

const INCLUDED = [
  "All six calculators — savings, mortgage, budget, allocator, debt payoff, retirement",
  "Compare any two securities with live market data",
  "Model portfolios, portfolio builder, and historical backtesting",
  "Free account to save scenarios and portfolios (optional)",
];

export default function PricingPage() {
  return (
    <main className="flex-1 bg-surface">
      <Section center>
        <div className="mx-auto max-w-2xl text-center">
          <Badge>Beta</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Free while in beta
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            Every tool is free to use — no account needed. Create a free
            account to save your scenarios and portfolios and pick them up
            anytime.
          </p>
        </div>

        <Card className="mx-auto mt-10 max-w-xl p-8">
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-bold text-ink">Everything included</p>
            <p className="text-3xl font-bold text-link">
              $0
              <span className="text-sm font-medium text-muted"> / forever*</span>
            </p>
          </div>
          <ul className="mt-6 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-neutral-700">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-link" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs leading-5 text-muted">
            *Free for everything that exists today. If paid plans are ever
            introduced, they&apos;ll apply to new premium features — this page
            will say so clearly first.
          </p>
          <div className="mt-8">
            <Button href="/signup" size="lg" className="w-full">
              Create a free account
            </Button>
          </div>
        </Card>
      </Section>
    </main>
  );
}
