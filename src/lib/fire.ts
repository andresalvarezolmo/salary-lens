/**
 * FIRE (Financial Independence, Retire Early) calculation engine.
 *
 * Core principle: save aggressively, invest, and build a portfolio large enough
 * to sustain your annual spending indefinitely using a safe withdrawal rate.
 *
 * FIRE Number = Annual Spending / Withdrawal Rate
 * (default 4% rule → multiply spending by 25)
 */

export interface FireInputs {
  currentAge: number;
  /** Total current portfolio (accessible + pension). */
  currentPortfolio: number;
  /** Current pension pot value (subset of currentPortfolio). */
  currentPensionPortfolio: number;
  /** Expected real (after-inflation) annual return, as a percentage (e.g. 7). */
  annualReturn: number;
  /** Safe withdrawal rate, as a percentage (e.g. 4). */
  withdrawalRate: number;

  // Derived from the main calculator:
  annualSpending: number;
  /** Optional retirement spending override (annual). If 0, uses annualSpending. */
  retirementSpending: number;
  /** Total annual savings: ISA/savings categories + pension pot. */
  totalAnnualSavings: number;
  /** Accessible savings only (ISA, GIA) — excludable pension. */
  accessibleAnnualSavings: number;
  /** Annual pension contributions going into the pot. */
  pensionAnnualSavings: number;
  /** Take-home pay (for savings rate calculation). */
  takeHomePay: number;
}

export interface FireProjectionYear {
  year: number;
  age: number;
  portfolio: number;
  accessiblePortfolio: number;
  pensionPortfolio: number;
  fireNumber: number;
}

export interface FireVariant {
  label: string;
  description: string;
  spendingMultiplier: number;
  fireNumber: number;
  yearsToFire: number;
  fireAge: number;
}

export interface FireResult {
  fireNumber: number;
  savingsRate: number;
  annualSavings: number;

  yearsToFire: number;
  fireAge: number;
  alreadyFire: boolean;

  /** FIRE variants: Lean (80%), Regular (100%), Fat (150%) */
  variants: FireVariant[];

  /** Coast FIRE: amount needed now so compound growth alone reaches FIRE by state retirement age. */
  coastFireNumber: number;
  coastFireReached: boolean;

  /** Year-by-year portfolio projection. */
  projection: FireProjectionYear[];

  // Pension bridge analysis
  pensionAccessAge: number;
  prePensionYears: number;
  /** Total accessible (non-pension) savings needed to bridge the gap from FIRE age to pension access. */
  prePensionNeeded: number;
  /** Whether the pension bridge is relevant (FIRE age < pension access age). */
  needsPensionBridge: boolean;
}

/**
 * Calculate years to reach a target portfolio value given:
 * P = current portfolio, C = annual contributions, r = annual return rate.
 *
 * Solves: P(1+r)^n + C((1+r)^n - 1)/r = target
 *   ⟹ n = ln((target + C/r) / (P + C/r)) / ln(1+r)
 */
function yearsToTarget(current: number, annual: number, rate: number, target: number): number {
  if (current >= target) return 0;
  if (annual <= 0 && rate <= 0) return Infinity;
  if (rate === 0) return annual > 0 ? (target - current) / annual : Infinity;
  const numerator = target + annual / rate;
  const denominator = current + annual / rate;
  if (denominator <= 0 || numerator <= 0) return Infinity;
  const ratio = numerator / denominator;
  if (ratio <= 1) return 0;
  return Math.log(ratio) / Math.log(1 + rate);
}

export function calculateFire(inputs: FireInputs): FireResult {
  const {
    currentAge,
    currentPortfolio,
    currentPensionPortfolio,
    annualReturn,
    withdrawalRate,
    annualSpending,
    retirementSpending,
    totalAnnualSavings,
    accessibleAnnualSavings,
    pensionAnnualSavings,
    takeHomePay,
  } = inputs;

  const r = annualReturn / 100;
  const wr = withdrawalRate / 100;

  // Use retirement spending override if provided, otherwise current spending
  const effectiveSpending = retirementSpending > 0 ? retirementSpending : annualSpending;

  // FIRE number: portfolio that sustains annual spending at the withdrawal rate
  const fireNumber = wr > 0 ? Math.round(effectiveSpending / wr) : 0;
  const alreadyFire = currentPortfolio >= fireNumber && fireNumber > 0;

  // Savings rate (as % of take-home pay)
  const savingsRate = takeHomePay > 0
    ? Math.round((totalAnnualSavings / takeHomePay) * 1000) / 10
    : 0;

  // Years to regular FIRE
  const yrsToFire = fireNumber > 0
    ? yearsToTarget(currentPortfolio, totalAnnualSavings, r, fireNumber)
    : Infinity;

  // FIRE variants
  const variantDefs = [
    { label: "Lean FIRE", description: "Frugal — 80% of current spending", mult: 0.8 },
    { label: "FIRE", description: "Current lifestyle maintained", mult: 1.0 },
    { label: "Fat FIRE", description: "Comfortable — 150% of current spending", mult: 1.5 },
  ];
  const variants: FireVariant[] = variantDefs.map(({ label, description, mult }) => {
    const fn = wr > 0 ? Math.round((effectiveSpending * mult) / wr) : 0;
    const yrs = fn > 0 ? yearsToTarget(currentPortfolio, totalAnnualSavings, r, fn) : Infinity;
    return {
      label,
      description,
      spendingMultiplier: mult,
      fireNumber: fn,
      yearsToFire: isFinite(yrs) ? Math.round(yrs * 10) / 10 : -1,
      fireAge: isFinite(yrs) ? Math.round(currentAge + yrs) : -1,
    };
  });

  // Coast FIRE: portfolio needed NOW so growth alone reaches FIRE number by state pension age (67)
  const stateRetirementAge = 67;
  const yearsToRetirement = Math.max(0, stateRetirementAge - currentAge);
  const coastFireNumber = r > 0
    ? Math.round(fireNumber / Math.pow(1 + r, yearsToRetirement))
    : fireNumber;
  const coastFireReached = currentPortfolio >= coastFireNumber;

  // Year-by-year projection — track accessible (ISA/GIA) and pension separately
  const projectionLength = Math.min(50, Math.max(30, isFinite(yrsToFire) ? Math.ceil(yrsToFire) + 10 : 40));
  const projection: FireProjectionYear[] = [];
  const currentAccessiblePortfolio = Math.max(0, currentPortfolio - currentPensionPortfolio);
  let accPort = currentAccessiblePortfolio;
  let penPort = currentPensionPortfolio;
  for (let y = 0; y <= projectionLength; y++) {
    projection.push({
      year: y,
      age: currentAge + y,
      portfolio: Math.round(accPort + penPort),
      accessiblePortfolio: Math.round(accPort),
      pensionPortfolio: Math.round(penPort),
      fireNumber,
    });
    accPort = accPort * (1 + r) + accessibleAnnualSavings;
    penPort = penPort * (1 + r) + pensionAnnualSavings;
  }

  // Pension bridge
  const pensionAccessAge = 57; // UK minimum pension access age (rising to 58 in 2028)
  const fireAge = isFinite(yrsToFire) ? Math.round(currentAge + yrsToFire) : -1;
  const prePensionYears = fireAge > 0 ? Math.max(0, pensionAccessAge - fireAge) : 0;
  const prePensionNeeded = Math.round(prePensionYears * effectiveSpending);
  const needsPensionBridge = fireAge > 0 && fireAge < pensionAccessAge;

  return {
    fireNumber,
    savingsRate,
    annualSavings: Math.round(totalAnnualSavings),

    yearsToFire: isFinite(yrsToFire) ? Math.round(yrsToFire * 10) / 10 : -1,
    fireAge,
    alreadyFire,

    variants,

    coastFireNumber,
    coastFireReached,

    projection,

    pensionAccessAge,
    prePensionYears,
    prePensionNeeded,
    needsPensionBridge,
  };
}
