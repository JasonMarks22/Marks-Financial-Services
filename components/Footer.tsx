import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { GithubIcon } from "@/components/ui/icons";

/**
 * Shared multi-column footer, rendered on every page from the root layout.
 * Every link points at a real route (placeholder sections have their own
 * clearly-labeled pages); the educational disclaimer line is required and
 * must not be removed.
 */

const REPO_URL = "https://github.com/JasonMarks22/Marks-Financial-Services";

const COLUMNS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "Home", href: "/" },
      { label: "Learn", href: "/learn" },
      { label: "GitHub", href: REPO_URL, external: true },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Calculators", href: "/tools/savings-goal" },
      { label: "Compare Securities", href: "/compare" },
      { label: "Portfolio Backtesting", href: "/portfolios/compare" },
      { label: "API (on GitHub)", href: REPO_URL, external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-edge bg-card">
      <Container className="py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white"
              >
                M
              </span>
              <span className="font-bold tracking-tight text-link">
                Marks Investment Analytics
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
              Calculators, portfolio analysis, historical research, and
              planning tools, built for learning.
            </p>
            <p className="mt-3 text-sm font-medium text-neutral-700">
              Educational tools, not financial advice.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Marks Investment Analytics on GitHub"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-edge text-neutral-600 hover:border-accent hover:text-link"
              >
                <GithubIcon className="h-[18px] w-[18px]" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-ink">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted hover:text-link hover:underline underline-offset-2"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted hover:text-link hover:underline underline-offset-2"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center gap-2 border-t border-edge pt-6 text-center text-xs text-muted sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} Marks Investment Analytics
          </span>
          <span>Educational tools, not financial advice.</span>
        </div>
      </Container>
    </footer>
  );
}
