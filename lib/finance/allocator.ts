/**
 * Savings allocator (pure logic module — no UI).
 *
 * Given how much money is left over each month and a few facts about someone's
 * finances, this suggests how to split that leftover across a small set of
 * destinations — and, crucially, returns a plain-English *reason* for every
 * destination so the recommendation is never a black box.
 *
 * It encodes a widely used personal-finance "priority ladder":
 *
 *   1. Keep a ~1-month spending buffer in CHECKING.
 *   2. Pay down HIGH-INTEREST DEBT (e.g. credit cards) before investing, since
 *      that interest rate almost always beats expected investment returns.
 *   3. Build a 3–6 month EMERGENCY FUND in a high-yield savings account (HYSA).
 *   4. Once the buffer and emergency fund are on track and there's no
 *      high-interest debt, tilt the remainder toward INVESTMENTS.
 *
 * This is general education, not personalized financial advice. All framing
 * deliberately uses "a common approach suggests…" rather than "you should…".
 *
 * Money values are in the same currency unit (e.g. dollars per month).
 */

export type AllocationKey = "checking" | "debt" | "hysa" | "investments";

export interface Allocation {
  key: AllocationKey;
  label: string;
  amount: number;
  /** Share of the monthly leftover, 0–100 (0 when there's nothing to allocate). */
  percent: number;
  /** Plain-English explanation of why this destination gets this amount. */
  reason: string;
}

export interface AllocatorInput {
  monthlyLeftover: number;
  currentEmergencyFund: number;
  monthlyEssentialExpenses: number;
  hasHighInterestDebt: boolean;
  currentCheckingBuffer: number;
}

export interface AllocatorResult {
  monthlyLeftover: number;
  /** Every considered destination, in priority order, each with a reason. */
  allocations: Allocation[];
}

// Whole-dollar formatter used only to embed figures inside the reason strings.
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Emergency-fund target is a range of months of essential expenses.
const EF_MONTHS_LOW = 3; // below this, the fund is considered under-built
const EF_MONTHS_HIGH = 6; // at/above this, the fund is considered fully funded

// When high-interest debt exists, the majority of leftover attacks the debt,
// while a small slice still keeps a starter cushion growing.
const DEBT_SHARE = 0.8;

export function allocateSavings({
  monthlyLeftover,
  currentEmergencyFund,
  monthlyEssentialExpenses,
  hasHighInterestDebt,
  currentCheckingBuffer,
}: AllocatorInput): AllocatorResult {
  // Sanitize inputs: negatives and non-finite values are treated as zero so the
  // ladder logic below always works on clean, non-negative numbers.
  const leftover = clampNonNeg(monthlyLeftover);
  const essentials = clampNonNeg(monthlyEssentialExpenses);
  const checkingBuffer = clampNonNeg(currentCheckingBuffer);
  const emergencyFund = clampNonNeg(currentEmergencyFund);

  // Percent-of-leftover helper (guards against divide-by-zero).
  const pct = (amount: number) =>
    leftover > 0 ? (amount / leftover) * 100 : 0;

  // If there's nothing to allocate, say so plainly for every destination.
  if (leftover <= 0) {
    return {
      monthlyLeftover: 0,
      allocations: [
        alloc("checking", "Checking buffer", 0, 0, "There's no leftover to allocate this month, so nothing is directed here."),
        alloc("hysa", "High-yield savings (HYSA)", 0, 0, "There's no leftover to allocate this month, so nothing is directed here."),
        alloc("investments", "Investments", 0, 0, "There's no leftover to allocate this month, so nothing is directed here."),
      ],
    };
  }

  const allocations: Allocation[] = [];
  let remaining = leftover;

  // -------------------------------------------------------------------------
  // STEP 1 — Checking buffer (target: ~1 month of essentials).
  // A cushion in checking absorbs normal month-to-month timing gaps. If the
  // current buffer is short of one month of essentials, fill that gap first.
  // -------------------------------------------------------------------------
  const checkingTarget = essentials; // one month of essential expenses
  const checkingGap = Math.max(0, checkingTarget - checkingBuffer);
  const toChecking = Math.min(remaining, checkingGap);
  remaining -= toChecking;

  allocations.push(
    alloc(
      "checking",
      "Checking buffer",
      toChecking,
      pct(toChecking),
      toChecking > 0
        ? `A common approach suggests keeping about one month of essential expenses (${money.format(checkingTarget)}) in checking as a spending buffer. Yours sits at ${money.format(checkingBuffer)}, so the first ${money.format(toChecking)} tops it up toward that cushion before anything else.`
        : essentials <= 0
          ? `No essential-expense figure was entered, so there's no checking-buffer target to fill — nothing is directed here.`
          : `Your checking buffer of ${money.format(checkingBuffer)} already covers about a month of essentials (${money.format(checkingTarget)}), so a common approach would leave it as-is and move on.`,
    ),
  );

  // -------------------------------------------------------------------------
  // STEP 2 — High-interest debt (before investing).
  // High-interest debt (credit cards, etc.) typically costs far more than
  // investments are expected to earn, so a common approach clears it first.
  // The majority of what's left attacks the debt; a small slice still trickles
  // into HYSA to start an emergency cushion; investing waits.
  // -------------------------------------------------------------------------
  if (hasHighInterestDebt) {
    const toDebt = remaining * DEBT_SHARE;
    const toHysa = remaining - toDebt; // the remaining ~20%
    remaining = 0;

    allocations.push(
      alloc(
        "debt",
        "High-interest debt payoff",
        toDebt,
        pct(toDebt),
        `Because you flagged high-interest debt (like credit cards), a common approach suggests knocking that down before investing — its interest rate almost always exceeds what investments are expected to return. So the majority of what's left, ${money.format(toDebt)}, goes toward debt payoff.`,
      ),
      alloc(
        "hysa",
        "High-yield savings (HYSA)",
        toHysa,
        pct(toHysa),
        `A smaller slice, ${money.format(toHysa)}, still goes to a HYSA so a starter emergency cushion keeps growing while the debt gets paid down.`,
      ),
      alloc(
        "investments",
        "Investments",
        0,
        0,
        `A common approach holds off on investing until high-interest debt is cleared, so this is $0 for now.`,
      ),
    );

    return { monthlyLeftover: leftover, allocations };
  }

  // -------------------------------------------------------------------------
  // STEP 3 & 4 — Emergency fund (HYSA) vs. investments, based on how close the
  // emergency fund is to the 3–6 month target. The further below target, the
  // more goes to HYSA; once fully funded, the remainder tilts to investments.
  // -------------------------------------------------------------------------
  const efLow = essentials * EF_MONTHS_LOW;
  const efHigh = essentials * EF_MONTHS_HIGH;

  let hysaShare: number;
  let hysaReason: string;
  let investReason: string;

  if (essentials <= 0) {
    // Without essentials we can't size an emergency-fund target, so lean toward
    // investments and tell the user how to get a tailored split.
    hysaShare = 0;
    hysaReason = `No essential-expense figure was entered, so there's no emergency-fund target to size — nothing is directed to HYSA. Add your monthly essentials for a tailored split.`;
    investReason = `With no emergency-fund target to build toward, the remainder (${money.format(remaining)}) leans toward long-term investments.`;
  } else if (emergencyFund < efLow) {
    // Under-built emergency fund: prioritize HYSA heavily.
    hysaShare = 0.9;
    hysaReason = `Your emergency fund of ${money.format(emergencyFund)} is below the ${money.format(efLow)}–${money.format(efHigh)} range (3–6 months of essentials). A common approach suggests filling that first, so most of the remainder, ${money.format(remaining * hysaShare)}, goes to a HYSA.`;
    investReason = `A small slice, ${money.format(remaining * (1 - hysaShare))}, still goes to investments to build the habit, while the emergency fund is the priority.`;
  } else if (emergencyFund < efHigh) {
    // On track (within the 3–6 month band): start tilting toward investments.
    hysaShare = 0.4;
    hysaReason = `Your emergency fund of ${money.format(emergencyFund)} is within the 3–6 month range and on track. A common approach keeps topping it up modestly, so ${money.format(remaining * hysaShare)} goes to HYSA.`;
    investReason = `With the emergency fund on track, the larger share, ${money.format(remaining * (1 - hysaShare))}, tilts toward long-term investments.`;
  } else {
    // Fully funded (6+ months): direct the remainder to investments.
    hysaShare = 0;
    hysaReason = `Your emergency fund of ${money.format(emergencyFund)} already covers 6+ months of essentials (${money.format(efHigh)}), so a common approach would stop adding to it — nothing more is needed in HYSA.`;
    investReason = `With the checking buffer set, no high-interest debt, and a fully funded emergency fund, a common approach tilts the full remainder, ${money.format(remaining)}, toward long-term investments.`;
  }

  const toHysa = remaining * hysaShare;
  const toInvest = remaining - toHysa; // remainder, avoids float drift

  allocations.push(
    alloc("hysa", "High-yield savings (HYSA)", toHysa, pct(toHysa), hysaReason),
    alloc("investments", "Investments", toInvest, pct(toInvest), investReason),
  );

  return { monthlyLeftover: leftover, allocations };
}

// Small helpers ------------------------------------------------------------

function clampNonNeg(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function alloc(
  key: AllocationKey,
  label: string,
  amount: number,
  percent: number,
  reason: string,
): Allocation {
  return { key, label, amount, percent, reason };
}
