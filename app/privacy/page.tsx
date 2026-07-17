import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy policy for Marks Investment Analytics.",
};

export default function PrivacyPage() {
  return (
    <ComingSoonPage
      title="Privacy"
      description="A formal privacy policy is being prepared. Here is the plain-English version in the meantime."
    >
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
        <li>
          Calculators run in your browser — inputs are not stored unless you
          choose to save a scenario to your account.
        </li>
        <li>
          If you create an account, your email and saved scenarios/portfolios
          are stored with Supabase and used only to provide the service.
        </li>
        <li>Your data is never sold or shared with advertisers.</li>
        <li>
          Market data lookups (tickers you search) are proxied through this
          site&apos;s own server to the data provider.
        </li>
      </ul>
    </ComingSoonPage>
  );
}
