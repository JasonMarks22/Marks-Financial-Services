/**
 * Mortgage math (pure calculation module — no UI).
 *
 * Three independent, well-commented functions:
 *   a) monthlyCostBreakdown  — all-in monthly cost, component by component.
 *   b) amortizationSchedule  — month-by-month and year-by-year paydown.
 *   c) extraPaymentComparison — payoff time / interest with vs. without extra.
 *
 * Money values are in the same currency unit (e.g. dollars). Rates are given as
 * whole-number percents on input (e.g. 6.5 means 6.5%/year). Periodic rates (`r`)
 * are monthly and expressed as decimals.
 */

// ---------------------------------------------------------------------------
// a) Monthly cost breakdown
// ---------------------------------------------------------------------------

export interface MortgageInput {
  homePrice: number;
  downPayment: number;
  termYears: number;
  annualRatePercent: number;
  annualPropertyTax: number;
  annualInsurance: number;
  monthlyHOA: number;
}

export interface MonthlyCostBreakdown {
  loanAmount: number;
  /** Monthly rate and number of payments — handy for feeding the other fns. */
  r: number;
  n: number;
  /** Individual monthly components. */
  principalAndInterest: number;
  propertyTax: number;
  insurance: number;
  pmi: number;
  hoa: number;
  /** Sum of every component above. */
  totalMonthly: number;
  /** Total interest paid over the full loan term (P&I only). */
  totalInterest: number;
}

/**
 * Break the all-in monthly housing cost into its parts.
 *
 * Principal & interest uses the standard fixed-rate amortization payment:
 *
 *     PI = loanAmount * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * PMI (private mortgage insurance) is required by most lenders when the down
 * payment is below 20%. We estimate it at 0.5% of the loan per year.
 */
export function monthlyCostBreakdown({
  homePrice,
  downPayment,
  termYears,
  annualRatePercent,
  annualPropertyTax,
  annualInsurance,
  monthlyHOA,
}: MortgageInput): MonthlyCostBreakdown {
  // Amount actually borrowed. Never let it go negative (down payment > price).
  const loanAmount = Math.max(0, homePrice - downPayment);
  const r = annualRatePercent / 100 / 12;
  const n = Math.round(termYears * 12);

  // Principal & interest.
  let principalAndInterest = 0;
  if (loanAmount > 0 && n > 0) {
    if (r === 0) {
      // EDGE CASE — zero interest: the amortization formula divides by r, which
      // is 0 here, so just spread the principal evenly across every month.
      principalAndInterest = loanAmount / n;
    } else {
      const growth = Math.pow(1 + r, n);
      principalAndInterest = (loanAmount * r * growth) / (growth - 1);
    }
  }

  // PMI RULE: required only when the down payment is under 20% of the price.
  // Estimated at 0.5%/year of the loan amount, charged monthly.
  const pmi =
    homePrice > 0 && downPayment < 0.2 * homePrice
      ? (0.005 * loanAmount) / 12
      : 0;

  // Escrow-style monthly items are simply the annual figures spread over 12.
  const propertyTax = annualPropertyTax / 12;
  const insurance = annualInsurance / 12;
  const hoa = monthlyHOA;

  const totalMonthly =
    principalAndInterest + propertyTax + insurance + pmi + hoa;

  // Total interest over the life of the loan = everything paid toward P&I minus
  // the principal that was borrowed.
  const totalInterest = Math.max(0, principalAndInterest * n - loanAmount);

  return {
    loanAmount,
    r,
    n,
    principalAndInterest,
    propertyTax,
    insurance,
    pmi,
    hoa,
    totalMonthly,
    totalInterest,
  };
}

// ---------------------------------------------------------------------------
// b) Amortization schedule
// ---------------------------------------------------------------------------

export interface AmortizationMonth {
  month: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface AmortizationYear {
  year: number;
  interestPaid: number;
  principalPaid: number;
  endingBalance: number;
}

export interface AmortizationResult {
  monthly: AmortizationMonth[];
  yearly: AmortizationYear[];
}

/**
 * Walk the loan month by month.
 *
 * Each month the interest is charged on the outstanding balance, whatever is
 * left of the fixed P&I payment goes to principal, and the balance drops by
 * that principal:
 *
 *     interestPortion  = balance * r
 *     principalPortion = monthlyPI - interestPortion
 *     balance         -= principalPortion
 *
 * A year-by-year summary (grouped totals) is returned alongside the full
 * monthly array for compact display.
 */
export function amortizationSchedule(
  loanAmount: number,
  r: number,
  n: number,
  monthlyPI: number,
): AmortizationResult {
  const monthly: AmortizationMonth[] = [];
  const yearly: AmortizationYear[] = [];

  let balance = loanAmount;
  let yearInterest = 0;
  let yearPrincipal = 0;

  for (let month = 1; month <= n && balance > 0; month++) {
    const interest = balance * r;
    let principal = monthlyPI - interest;

    // On the final payment, rounding can leave the principal slightly larger
    // than the remaining balance; never pay off more than what's owed.
    if (principal > balance) principal = balance;

    balance = Math.max(0, balance - principal);

    monthly.push({ month, interest, principal, balance });

    // Accumulate into the current year's running totals.
    yearInterest += interest;
    yearPrincipal += principal;
    if (month % 12 === 0 || month === n || balance <= 0) {
      yearly.push({
        year: Math.ceil(month / 12),
        interestPaid: yearInterest,
        principalPaid: yearPrincipal,
        endingBalance: balance,
      });
      yearInterest = 0;
      yearPrincipal = 0;
    }
  }

  return { monthly, yearly };
}

// ---------------------------------------------------------------------------
// c) Extra-payment comparison
// ---------------------------------------------------------------------------

export interface PayoffScenario {
  payoffMonths: number;
  totalInterest: number;
}

export interface ExtraPaymentComparison {
  withoutExtra: PayoffScenario;
  withExtra: PayoffScenario;
  interestSaved: number;
  monthsSaved: number;
}

/**
 * Simulate paying the loan off, adding `extra` to principal every month.
 * Stops as soon as the balance reaches zero. `r === 0` is handled naturally
 * (interest is simply 0 each month).
 */
function simulatePayoff(
  loanAmount: number,
  r: number,
  n: number,
  monthlyPI: number,
  extra: number,
): PayoffScenario {
  let balance = loanAmount;
  let totalInterest = 0;
  let month = 0;

  // Safety cap: without a negative payment the loan can never take longer than
  // its scheduled term, so `n` is a safe upper bound on the loop.
  while (balance > 0 && month < n) {
    month++;
    const interest = balance * r;
    // The scheduled principal plus any extra the borrower chooses to add.
    let principal = monthlyPI - interest + extra;
    if (principal > balance) principal = balance;
    balance = Math.max(0, balance - principal);
    totalInterest += interest;
  }

  return { payoffMonths: month, totalInterest };
}

/**
 * Run the payoff simulation twice — once with no extra, once with `extraMonthly`
 * added to principal each month — and report the difference.
 */
export function extraPaymentComparison(
  loanAmount: number,
  r: number,
  n: number,
  monthlyPI: number,
  extraMonthly: number,
): ExtraPaymentComparison {
  const withoutExtra = simulatePayoff(loanAmount, r, n, monthlyPI, 0);
  const withExtra = simulatePayoff(
    loanAmount,
    r,
    n,
    monthlyPI,
    Math.max(0, extraMonthly),
  );

  return {
    withoutExtra,
    withExtra,
    interestSaved: Math.max(0, withoutExtra.totalInterest - withExtra.totalInterest),
    monthsSaved: Math.max(0, withoutExtra.payoffMonths - withExtra.payoffMonths),
  };
}
