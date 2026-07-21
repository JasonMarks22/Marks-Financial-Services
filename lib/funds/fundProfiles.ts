/**
 * Fund attribute map — explicit, hand-curated classification used for
 * similarity comparisons (see ./similarity.ts).
 *
 * INTENTIONALLY EXPLICIT and honest: only funds listed here are profiled, and
 * an attribute is included ONLY when it's clearly true of the fund. If an
 * attribute doesn't cleanly apply (or we're unsure), it is LEFT OUT rather
 * than guessed — a missing attribute is simply not compared.
 *
 *   assetClass: equity | bond | cash | realEstate | commodity | other
 *   region:     us | developedIntl | emerging | global
 *   marketCap:  large | mid | small | broad   (equity only)
 *   style:      growth | value | blend        (equity only)
 *   sector:     null for diversified funds, or e.g. "technology"
 *   bondType:   aggregate | treasury | corporate | short | tips  (bonds only)
 *
 * Individual stocks are deliberately NOT profiled here (this is a fund map);
 * similarity for an unprofiled symbol returns null ("not enough data").
 */

export type AssetClass =
  | "equity"
  | "bond"
  | "cash"
  | "realEstate"
  | "commodity"
  | "other";
export type Region = "us" | "developedIntl" | "emerging" | "global";
export type MarketCap = "large" | "mid" | "small" | "broad";
export type EquityStyle = "growth" | "value" | "blend";
export type BondType = "aggregate" | "treasury" | "corporate" | "short" | "tips";

export interface FundProfile {
  assetClass: AssetClass;
  region?: Region;
  marketCap?: MarketCap;
  style?: EquityStyle;
  /** null = diversified across sectors; a string = concentrated in that sector. */
  sector?: string | null;
  bondType?: BondType;
}

export const FUND_PROFILES: Record<string, FundProfile> = {
  // ---- Broad US equity ----
  VTI: { assetClass: "equity", region: "us", marketCap: "broad", style: "blend", sector: null }, // VTI — CRSP total US market; all-cap US blend
  ITOT: { assetClass: "equity", region: "us", marketCap: "broad", style: "blend", sector: null }, // ITOT — S&P total US market; all-cap US blend
  SCHB: { assetClass: "equity", region: "us", marketCap: "broad", style: "blend", sector: null }, // SCHB — Dow Jones US Broad; all-cap US blend

  // ---- US large-cap ----
  VOO: { assetClass: "equity", region: "us", marketCap: "large", style: "blend", sector: null }, // VOO — S&P 500; large-cap US blend
  SPY: { assetClass: "equity", region: "us", marketCap: "large", style: "blend", sector: null }, // SPY — S&P 500; large-cap US blend
  IVV: { assetClass: "equity", region: "us", marketCap: "large", style: "blend", sector: null }, // IVV — S&P 500 (iShares); large-cap US blend
  VUG: { assetClass: "equity", region: "us", marketCap: "large", style: "growth", sector: null }, // VUG — CRSP US large growth; diversified growth
  QQQ: { assetClass: "equity", region: "us", marketCap: "large", style: "growth", sector: "technology" }, // QQQ — Nasdaq-100; large-cap US growth, tech-heavy, excludes financials
  VTV: { assetClass: "equity", region: "us", marketCap: "large", style: "value", sector: null }, // VTV — CRSP US large value; diversified value

  // ---- US mid / small ----
  VO: { assetClass: "equity", region: "us", marketCap: "mid", style: "blend", sector: null }, // VO — CRSP US mid-cap blend
  VB: { assetClass: "equity", region: "us", marketCap: "small", style: "blend", sector: null }, // VB — CRSP US small-cap blend
  IJR: { assetClass: "equity", region: "us", marketCap: "small", style: "blend", sector: null }, // IJR — S&P SmallCap 600; small-cap US blend

  // ---- US dividend / value tilt ----
  SCHD: { assetClass: "equity", region: "us", marketCap: "large", style: "value", sector: null }, // SCHD — Dow Jones US Dividend 100; large-cap value/dividend
  VYM: { assetClass: "equity", region: "us", marketCap: "large", style: "value", sector: null }, // VYM — FTSE High Dividend Yield; large-cap value/dividend
  HDV: { assetClass: "equity", region: "us", marketCap: "large", style: "value", sector: null }, // HDV — Morningstar Dividend Yield Focus; large-cap value/dividend

  // ---- US sector equity ----
  VGT: { assetClass: "equity", region: "us", marketCap: "large", style: "growth", sector: "technology" }, // VGT — US information technology sector
  XLK: { assetClass: "equity", region: "us", marketCap: "large", style: "growth", sector: "technology" }, // XLK — S&P 500 technology sector
  ARKK: { assetClass: "equity", region: "us", style: "growth", sector: null }, // ARKK — actively managed disruptive-innovation growth; cap not clearly fixed, left out

  // ---- International equity ----
  VXUS: { assetClass: "equity", marketCap: "broad", style: "blend", sector: null }, // VXUS — total international ex-US (developed + emerging); region left out (mixed)
  VEA: { assetClass: "equity", region: "developedIntl", marketCap: "broad", style: "blend", sector: null }, // VEA — FTSE Developed ex-US all-cap blend
  IEFA: { assetClass: "equity", region: "developedIntl", marketCap: "broad", style: "blend", sector: null }, // IEFA — MSCI EAFE IMI; developed international blend
  SCHF: { assetClass: "equity", region: "developedIntl", marketCap: "broad", style: "blend", sector: null }, // SCHF — FTSE Developed ex-US; developed international blend
  VWO: { assetClass: "equity", region: "emerging", marketCap: "broad", style: "blend", sector: null }, // VWO — FTSE Emerging Markets; emerging equity blend
  IEMG: { assetClass: "equity", region: "emerging", marketCap: "broad", style: "blend", sector: null }, // IEMG — MSCI Emerging Markets IMI; emerging equity blend

  // ---- Real estate ----
  VNQ: { assetClass: "realEstate", region: "us", sector: null }, // VNQ — US REITs; real estate

  // ---- Bonds ----
  BND: { assetClass: "bond", region: "us", bondType: "aggregate", sector: null }, // BND — US aggregate investment-grade bond
  AGG: { assetClass: "bond", region: "us", bondType: "aggregate", sector: null }, // AGG — US aggregate investment-grade bond (iShares)
  SCHZ: { assetClass: "bond", region: "us", bondType: "aggregate", sector: null }, // SCHZ — US aggregate bond (Schwab)
  BNDX: { assetClass: "bond", region: "developedIntl", bondType: "aggregate", sector: null }, // BNDX — international aggregate bond, USD-hedged
  BSV: { assetClass: "bond", region: "us", bondType: "short", sector: null }, // BSV — short-term US investment-grade bond
  SHY: { assetClass: "bond", region: "us", bondType: "short", sector: null }, // SHY — 1-3yr US Treasuries; short-duration
  TLT: { assetClass: "bond", region: "us", bondType: "treasury", sector: null }, // TLT — 20+yr US Treasuries; long-duration government
  VTIP: { assetClass: "bond", region: "us", bondType: "tips", sector: null }, // VTIP — short-term US TIPS; inflation-protected

  // ---- Cash ----
  CASH: { assetClass: "cash" }, // CASH — cash / equivalents pseudo-holding
};

/** Look up a fund's profile by symbol (case-insensitive), or null if unprofiled. */
export function getFundProfile(symbol: string): FundProfile | null {
  return FUND_PROFILES[symbol.trim().toUpperCase()] ?? null;
}
