import Link from "next/link";

/**
 * Landing page. Top navigation lives in the shared NavBar (see layout), so
 * this page focuses on introducing the toolkit and routing people to tools.
 */

const CALCULATORS = [
  {
    href: "/tools/savings-goal",
    title: "Savings Goal",
    description: "See how much to set aside each month to reach a target.",
  },
  {
    href: "/tools/mortgage",
    title: "Mortgage",
    description: "All-in monthly cost, amortization, and early-payoff savings.",
  },
  {
    href: "/tools/budget",
    title: "Budget",
    description: "Your own categories, compared against the 50/30/20 guideline.",
  },
  {
    href: "/tools/allocator",
    title: "Savings Allocator",
    description: "A common approach to splitting leftover money — with reasons.",
  },
  {
    href: "/tools/debt-payoff",
    title: "Debt Payoff",
    description: "Avalanche vs. snowball — payoff time, interest, and order.",
  },
];

const PORTFOLIO_TOOLS = [
  {
    href: "/compare",
    title: "Compare Securities",
    description: "Any two stocks or funds, side by side with performance.",
  },
  {
    href: "/portfolios",
    title: "Model Portfolios",
    description: "Seven educational examples across common risk profiles.",
  },
  {
    href: "/portfolios/build",
    title: "Build a Portfolio",
    description: "Assemble your own mix with a live profile-match rating.",
  },
  {
    href: "/portfolios/compare",
    title: "Compare & Backtest",
    description: "Simulate how $10,000 would have grown across portfolios.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-100 px-6 pb-20 text-neutral-900">
      {/* Hero */}
      <section className="w-full max-w-6xl pt-20 text-center sm:pt-28">
        <h1
          className="text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ color: "var(--accent)" }}
        >
          Marks Financial Services
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
          Your all-in-one personal finance toolkit — calculators, portfolio
          analysis, and more.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-500">
          Plan savings, understand a mortgage, shape a budget, and explore
          portfolios — all in one place, built for learning.
        </p>
      </section>

      {/* Calculators */}
      <section className="mt-16 w-full max-w-6xl">
        <h2
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--accent)" }}
        >
          Calculators
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CALCULATORS.map((tool) => (
            <ToolCard key={tool.href} {...tool} />
          ))}
        </div>
      </section>

      {/* Portfolio tools */}
      <section className="mt-14 w-full max-w-6xl">
        <h2
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--accent)" }}
        >
          Portfolio Tools
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PORTFOLIO_TOOLS.map((tool) => (
            <ToolCard key={tool.href} {...tool} />
          ))}
        </div>
      </section>

      {/* Accounts note */}
      <section className="mt-14 w-full max-w-6xl rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm leading-6 text-neutral-600">
          Every tool is free to use — no account needed. Create a free account
          to save your scenarios and portfolios and pick them up anytime.
        </p>
      </section>
    </main>
  );
}

function ToolCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-colors hover:border-[#002E5D]"
    >
      <h3
        className="font-semibold group-hover:underline group-hover:underline-offset-4"
        style={{ color: "var(--accent)" }}
      >
        {title} →
      </h3>
      <p className="mt-1 text-sm leading-6 text-neutral-600">{description}</p>
    </Link>
  );
}
