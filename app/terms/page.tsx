import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for Marks Investment Analytics.",
};

export default function TermsPage() {
  return (
    <ComingSoonPage
      title="Terms"
      description="Formal terms of use are being prepared. Here is the plain-English version in the meantime."
    >
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
        <li>
          Everything on this site is for educational purposes only — it is not
          financial, investment, tax, or legal advice.
        </li>
        <li>
          Market data comes from third-party providers and may be delayed,
          incomplete, or inaccurate. Past performance does not guarantee
          future results.
        </li>
        <li>
          Calculators and projections are estimates based on the assumptions
          shown; verify important decisions with a qualified professional.
        </li>
        <li>The service is provided as-is, without warranties.</li>
      </ul>
    </ComingSoonPage>
  );
}
