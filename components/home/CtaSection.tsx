import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/**
 * Closing call to action. Full-bleed brand-green band.
 */
export function CtaSection() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center shadow-lifted sm:px-12">
          {/* Subtle decorative glow (decorative only). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/5 blur-2xl"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to build a better financial future?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-white/80">
              Start with any tool for free, no account needed. Create a free
              account whenever you want to save your work.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                href="/signup"
                size="lg"
                variant="secondary"
                className="border-transparent bg-white text-primary hover:text-secondary"
              >
                Start Free
              </Button>
              <Button
                href="/tools/savings-goal"
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                Explore a calculator
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
