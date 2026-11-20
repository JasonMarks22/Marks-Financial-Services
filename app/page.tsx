import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { MarketData } from "@/components/home/MarketData";
import { HomeSearch } from "@/components/home/HomeSearch";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { PHOTOS, photoUrl } from "@/lib/photos";

/**
 * Home page. Opens with a photo hero and search, then live market data, then
 * every tool as a photo row. Shared NavBar/Footer
 * live in the root layout. Accounts still work (sign-in lives in the navbar);
 * the homepage just doesn't market them.
 */

export default function Home() {
  return (
    <main className="flex-1 bg-surface">
      {/* ── Hero: photo, headline, search ─────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl(PHOTOS.hero, 2000, 900)}
          alt={PHOTOS.hero.alt}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(10_16_13/0.88)_0%,rgb(10_16_13/0.7)_45%,rgb(10_16_13/0.25)_100%)]"
        />
        <Container className="py-16 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
            Research a stock, test a portfolio, plan the next 30 years
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
            Live market data, backtests on real prices, and planning
            calculators in one place.
          </p>
          <div id="search" className="mt-8 scroll-mt-24">
            <HomeSearch onPhoto />
          </div>
        </Container>
      </section>

      {/* ── Market data ──────────────────────────────────────────────── */}
      <section className="pb-10 pt-10 sm:pt-12">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-ink pb-2">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Markets today
            </h2>
            <p className="text-xs text-muted">
              Yahoo Finance data; may be delayed.
            </p>
          </div>
          <div className="mt-6">
            <MarketData />
          </div>
        </Container>
      </section>

      {/* ── Tools ────────────────────────────────────────────────────── */}
      <Section
        className="border-t border-edge bg-card"
        title="Tools"
        subtitle="Calculators for everyday planning, and research tools for investing."
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
