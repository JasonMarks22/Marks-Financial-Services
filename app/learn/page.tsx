import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = {
  title: "Learn",
  description:
    "Guides and explainers are coming soon. Every calculator already explains its method as you use it.",
};

export default function LearnPage() {
  return (
    <ComingSoonPage
      title="Learn"
      description="A library of plain-English guides — how compounding works, what an expense ratio is, how backtests are built — is planned for a future release."
    >
      <p className="text-sm leading-6 text-muted">
        Until then, learning is built into the tools themselves: each
        calculator explains its method and assumptions alongside the results.
        Good places to start:
      </p>
      <ul className="mt-4 space-y-3 text-sm">
        <li>
          <Link
            href="/tools/retirement"
            className="font-semibold text-link underline-offset-2 hover:underline"
          >
            Retirement Projector
          </Link>{" "}
          <span className="text-muted">
            — see compound growth by age, with today&apos;s-dollars adjustment.
          </span>
        </li>
        <li>
          <Link
            href="/tools/debt-payoff"
            className="font-semibold text-link underline-offset-2 hover:underline"
          >
            Debt Payoff
          </Link>{" "}
          <span className="text-muted">
            — avalanche vs. snowball, with the reasoning behind each.
          </span>
        </li>
        <li>
          <Link
            href="/portfolios"
            className="font-semibold text-link underline-offset-2 hover:underline"
          >
            Model Portfolios
          </Link>{" "}
          <span className="text-muted">
            — seven educational examples across common risk profiles.
          </span>
        </li>
      </ul>
    </ComingSoonPage>
  );
}
