import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { HeroDashboard } from "@/components/home/HeroDashboard";
import { HomeSearch } from "@/components/home/HomeSearch";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { DashboardShowcase } from "@/components/home/DashboardShowcase";
import { WhyPlatform } from "@/components/home/WhyPlatform";
import { MarketInsights } from "@/components/home/MarketInsights";
import { CtaSection } from "@/components/home/CtaSection";

/**
 * Landing page. Shared NavBar/Footer live in the root layout; this page is
 * the marketing surface. Every non-live figure is clearly labeled as sample
 * data, and no unbuilt tool is presented as working.
 */

export default function Home() {
  return (
    <main className="flex-1 bg-surface">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Soft brand wash behind the hero (decorative). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-card-tint to-surface"
        />
        <Container className="grid grid-cols-1 items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
          <Reveal>
            <div>
              <Badge>Educational investment tools</Badge>
              <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl xl:text-[4.5rem]">
                Analyze Investments With Confidence
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
                Professional-grade calculators, portfolio analysis, historical
                research, and planning, all in one place. Built to help you
                learn as you go.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button href="/signup" size="lg">
                  Get Started
                </Button>
                <Button href="#showcase" size="lg" variant="secondary">
                  Explore Demo
                </Button>
              </div>
              <p className="mt-5 text-sm text-muted">
                Free to use. No account needed. Educational tools, not
                financial advice.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <HeroDashboard />
          </Reveal>
        </Container>
      </section>

      {/* ── Search ───────────────────────────────────────────────────── */}
      <section id="search" className="scroll-mt-24 border-y border-edge bg-card py-14 sm:py-16">
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

      {/* ── Feature grid ─────────────────────────────────────────────── */}
      <Section
        eyebrow="Everything you need"
        title="One platform, every planning tool"
        subtitle="From everyday calculators to portfolio analysis and backtesting. Tools not yet built are clearly marked. Nothing here pretends to work before it does."
        center
      >
        <FeatureGrid />
      </Section>

      {/* ── Dashboard showcase ───────────────────────────────────────── */}
      <section id="showcase" className="scroll-mt-24 bg-card py-16 sm:py-20 lg:py-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-link">
              A closer look
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Analytics that read like a real product
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted">
              Charts, performance, allocation, and risk metrics: the same
              building blocks the tools use. Scroll to explore.
            </p>
          </div>
        </Container>
        <div className="mt-10">
          <Container>
            <DashboardShowcase />
          </Container>
        </div>
      </section>

      {/* ── Why this platform ────────────────────────────────────────── */}
      <Section
        eyebrow="Why use this platform"
        title="A clearer path than a spreadsheet"
        subtitle="Purpose-built for investing questions, with live data and explained methods, not blank cells or one-off calculators."
        center
      >
        <Reveal>
          <div className="mx-auto max-w-4xl rounded-2xl border border-edge bg-card p-4 shadow-soft sm:p-6">
            <WhyPlatform />
          </div>
        </Reveal>
      </Section>

      {/* ── Market insights ──────────────────────────────────────────── */}
      <Section
        eyebrow="Market insights"
        title="Stay close to the market"
        subtitle="A preview of the market dashboards we're building. Every card below shows sample data for illustration. Live data lands in a later phase."
        center
      >
        <MarketInsights />
      </Section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <CtaSection />
    </main>
  );
}
