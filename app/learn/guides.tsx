import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Learn library content registry. One entry per guide drives BOTH the Learn
 * index list and the /learn/[slug] article page, so they never drift apart.
 *
 * Content is the plain-English copy provided for these guides, kept intact.
 * Only punctuation/markup was adjusted to fit the app (em dashes reworked to
 * the site's standard commas/colons/parentheses; wording and caveats unchanged).
 */

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  Body: () => ReactNode;
}

// Shared prose styling (no Tailwind typography plugin in this project).
const P = "mt-4 text-base leading-7 text-neutral-700";
const UL = "mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-neutral-700";
const OL = "mt-4 list-decimal space-y-2 pl-5 text-base leading-7 text-neutral-700";
const LINK = "font-semibold text-link underline-offset-2 hover:underline";
const LEAD = "font-semibold text-ink";

function Compounding() {
  return (
    <>
      <p className={P}>
        Compounding is the reason a modest amount of money, left alone long
        enough, can grow into a surprisingly large one. The idea is simple: you
        earn returns not only on the money you put in, but also on the returns
        that money has already earned.
      </p>
      <p className={P}>
        Picture $1,000 that earns 8% in a year (a hypothetical rate, purely for
        illustration). After the first year you have $1,080. You earned $80. In
        the second year you earn 8% again, but now on $1,080 rather than the
        original $1,000, so you earn $86.40. That extra $6.40 is compounding at
        work: growth on top of previous growth. Small at first, but it snowballs.
      </p>
      <p className={P}>Two things drive it most: time and rate.</p>
      <p className={P}>
        <span className={LEAD}>Time</span> is the powerful one. That same $1,000
        at a hypothetical 8% a year would grow to roughly:
      </p>
      <ul className={UL}>
        <li>about $2,159 after 10 years</li>
        <li>about $4,661 after 20 years</li>
        <li>about $10,063 after 30 years</li>
        <li>about $21,725 after 40 years</li>
      </ul>
      <p className={P}>
        Notice it isn&rsquo;t a straight line: the curve steepens, because each
        year&rsquo;s growth is larger than the last. That&rsquo;s why starting
        early matters so much: the early years do quiet work that pays off
        decades later.
      </p>
      <p className={P}>
        <span className={LEAD}>Rate</span> matters too (higher returns compound
        faster), but higher expected returns generally come with more ups and
        downs along the way, not a smooth ride.
      </p>
      <p className={P}>
        Compounding also runs in reverse. Debt compounds against you (a credit
        card at 20% compounds in the lender&rsquo;s favor), and so do fees: a
        1%-a-year fund fee quietly drags on your growth year after year (see{" "}
        <Link href="/learn/what-an-expense-ratio-is" className={LINK}>
          What an expense ratio is
        </Link>
        ).
      </p>
      <p className={P}>
        A note on the numbers: these are hypothetical illustrations, not
        predictions. Real investments don&rsquo;t return a steady 8% every year.
        They rise and fall, sometimes sharply. Compounding describes the math of
        growth over time; it doesn&rsquo;t promise any particular outcome.
      </p>
    </>
  );
}

function ExpenseRatio() {
  return (
    <>
      <p className={P}>
        An expense ratio is the yearly fee a fund (such as an ETF or mutual
        fund) charges to run itself, written as a percentage of the money you
        have invested. A 0.20% expense ratio means you pay about $2 a year for
        every $1,000 you hold in that fund.
      </p>
      <p className={P}>
        You never receive a bill. The fee is deducted quietly from the
        fund&rsquo;s assets across the year, which slightly lowers its returns.
        Because it&rsquo;s automatic and invisible, it&rsquo;s easy to overlook,
        which is exactly why it&rsquo;s worth knowing about.
      </p>
      <p className={P}>
        <span className={LEAD}>Why such small percentages matter:</span> imagine
        $10,000 in a fund. At 0.03%, you&rsquo;d pay about $3 a year. At 0.75%,
        about $75 a year. The gap looks minor annually, but the money paid in
        fees is money that also never gets the chance to compound, so over
        decades the difference can grow into a meaningful amount.
      </p>
      <p className={P}>
        <span className={LEAD}>Rough ranges:</span> broad index funds are often
        very inexpensive (frequently 0.03%&ndash;0.20%), while actively managed
        funds tend to charge more (often 0.50%&ndash;1% or higher). Cheaper
        isn&rsquo;t automatically better, but a fee is a guaranteed, ongoing
        cost, whereas the higher returns meant to justify a higher fee are not
        guaranteed.
      </p>
      <p className={P}>
        <span className={LEAD}>Where to find it:</span> every fund lists its
        expense ratio in its prospectus and on most quote and fund pages,
        including{" "}
        <Link href="/compare" className={LINK}>
          this site&rsquo;s fund comparison
        </Link>
        .
      </p>
      <p className={P}>
        <span className={LEAD}>What it leaves out:</span> the expense ratio
        isn&rsquo;t the only possible cost: depending on the fund and how you buy
        it, there can be trading spreads, commissions, or sales loads. But the
        expense ratio is the main recurring one.
      </p>
      <p className={P}>
        This is a general explanation for learning, not financial advice. A
        fund&rsquo;s fee is one factor among many and doesn&rsquo;t, on its own,
        tell you whether a fund suits you.
      </p>
    </>
  );
}

function Backtests() {
  return (
    <>
      <p className={P}>
        A backtest asks a &ldquo;what if&rdquo; question: if you had held this
        portfolio over some stretch of the past, how would it have done?
        It&rsquo;s a way to build intuition about a strategy&rsquo;s historical
        behavior (its climbs, its drops, and its long-run trend) without waiting
        years to see.
      </p>
      <p className={P}>Here&rsquo;s roughly how one is put together:</p>
      <ol className={OL}>
        <li>
          <span className={LEAD}>Define the portfolio:</span> the holdings and
          their weights (say, 60% in a stock fund, 40% in a bond fund).
        </li>
        <li>
          <span className={LEAD}>Gather historical prices</span> for each holding
          across the chosen period.
        </li>
        <li>
          <span className={LEAD}>Simulate:</span> apply the weights to those
          prices and track the portfolio&rsquo;s value over time.
        </li>
        <li>
          <span className={LEAD}>Handle the details:</span> decide whether
          dividends are reinvested and whether to periodically rebalance back to
          the target weights, since a portfolio drifts as prices move.
        </li>
        <li>
          <span className={LEAD}>Summarize:</span> calculate results like total
          return, usually alongside some measure of how bumpy the ride was.
        </li>
      </ol>
      <p className={P}>
        The assumptions are the part that matters most, because a backtest is
        only as honest as the assumptions behind it:
      </p>
      <ul className={UL}>
        <li>It uses past data, and the past doesn&rsquo;t repeat exactly.</li>
        <li>
          It usually assumes you held on through every decline. Real investors
          often sell at the worst moment.
        </li>
        <li>
          It may ignore taxes, trading costs, and the exact prices you&rsquo;d
          truly have gotten.
        </li>
        <li>
          The funds available today weren&rsquo;t always available back then.
        </li>
      </ul>
      <p className={P}>
        So a backtest is a rough historical estimate, not a forecast. A strategy
        that shines in a backtest can still disappoint going forward, and
        it&rsquo;s easy (even by accident) to choose a time period that flatters
        a strategy. It&rsquo;s best treated as one lens for understanding risk
        and behavior, not a prediction of returns.
      </p>
      <p className={P}>
        On this site, backtests are clearly labeled estimates that show their
        assumptions. Past performance doesn&rsquo;t guarantee future results, and
        this is for educational purposes, not financial advice.
      </p>
    </>
  );
}

export const GUIDES: Guide[] = [
  {
    slug: "how-compounding-works",
    title: "How compounding works",
    summary:
      "Why money left alone can snowball, and why time matters even more than rate.",
    Body: Compounding,
  },
  {
    slug: "what-an-expense-ratio-is",
    title: "What an expense ratio is",
    summary:
      "The quiet yearly fee a fund charges, and why small percentages add up over decades.",
    Body: ExpenseRatio,
  },
  {
    slug: "how-backtests-are-built",
    title: "How backtests are built",
    summary:
      "How a historical 'what if' is simulated, and the assumptions that make or break it.",
    Body: Backtests,
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
