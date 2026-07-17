import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { MarketData } from "@/components/home/MarketData";
import { HomeSearch } from "@/components/home/HomeSearch";
import { FeatureGrid } from "@/components/home/FeatureGrid";

/**
 * Home page. Product-first: it leads with real market data, puts search under
 * it, and closes with a showcase of the actual tools. Shared NavBar/Footer
 * live in the root layout. Accounts still work (sign-in lives in the navbar);
 * the homepage just doesn't market them.
 */

export default function Home() {
  return (
    <main className="flex-1 bg-surface">
      {/* ── Market data (the lead) ───────────────────────────────────── */}
      <section className="pb-8 pt-12 sm:pt-16">
        <Container>
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Market Trends
            </h1>
            <p className="mt-2 text-base leading-7 text-muted sm:text-lg">
              Live index performance, major ETFs and stocks, and today&rsquo;s
              top gainers. Select any symbol for a full breakdown.
            </p>
          </div>
          <div className="mt-8">
            <MarketData />
          </div>
          <p className="mt-6 text-xs leading-5 text-muted">
            Market data provided by Yahoo Finance; may be delayed (not
            real-time) and can be incomplete. Shown for educational purposes.
          </p>
        </Container>
      </section>

      {/* ── Search ───────────────────────────────────────────────────── */}
      <section
        id="search"
        className="scroll-mt-24 border-y border-edge bg-card py-14 sm:py-16"
      >
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Find a tool or a security
            </h2>
            <p className="mt-2 text-muted">
              Search across every calculator and portfolio tool, plus live
              stocks, ETFs, and funds.
            </p>
          </div>
          <div className="mt-8">
            <HomeSearch />
          </div>
        </Container>
      </section>

      {/* ── Tools showcase ───────────────────────────────────────────── */}
      <Section
        eyebrow="Everything you need"
        title="One platform, every planning tool"
        subtitle="Calculators, portfolio analysis, backtesting, and securities research, all in one place."
        center
      >
        <FeatureGrid />
      </Section>

      {/* ── Disclaimer ───────────────────────────────────────────────── */}
      <section className="pb-16">
        <Container>
          <Disclaimer />
        </Container>
      </section>
    </main>
  );
}
