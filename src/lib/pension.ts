// UK Tax / NI thresholds for 2025/26 tax year
export const TAX_CONFIG = {
  personalAllowance: 12_570,
  basicRateLimit: 50_270,
  higherRateLimit: 125_140,
  personalAllowanceTaperStart: 100_000,

  // rUK rates
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,

  // Scottish rates 2025/26
  scottishBands: [
    { name: "Starter",       from: 12_571, to: 15_397, rate: 0.19 },
    { name: "Basic",         from: 15_398, to: 27_491, rate: 0.20 },
    { name: "Intermediate",  from: 27_492, to: 43_662, rate: 0.21 },
    { name: "Higher",        from: 43_663, to: 75_000, rate: 0.42 },
    { name: "Advanced",      from: 75_001, to: 125_140, rate: 0.45 },
    { name: "Top",           from: 125_141, to: Infinity, rate: 0.47 },
  ],

  // Employee NI
  niPrimaryThreshold: 12_570,
  niUpperEarningsLimit: 50_270,
  niRate: 0.08,
  niUpperRate: 0.02,

  // Employer NI (2025/26: increased from 13.8% to 15%)
  niSecondaryThreshold: 5_000,
  employerNiRate: 0.15,

  // Qualifying earnings band
  qualifyingEarningsLower: 6_240,
  qualifyingEarningsUpper: 50_270,

  annualAllowance: 60_000,

  // Student loan repayment thresholds and rates (2025/26)
  studentLoans: {
    plan1: { threshold: 26_065, rate: 0.09, label: "Plan 1 (pre-2012)" },
    plan2: { threshold: 28_470, rate: 0.09, label: "Plan 2 (post-2012 England/Wales)" },
    plan4: { threshold: 32_745, rate: 0.09, label: "Plan 4 (Scotland)" },
    plan5: { threshold: 25_000, rate: 0.09, label: "Plan 5 (post-2023 England)" },
    postgrad: { threshold: 21_000, rate: 0.06, label: "Postgraduate Loan" },
  },
};

export type StudentLoanPlan = "none" | "plan1" | "plan2" | "plan4" | "plan5";

// ── Tax Code parsing ──

export interface ParsedTaxCode {
  isScottish: boolean;
  /** 'allowance' = standard code with personal allowance (incl 0T),
   *  'kcode' = K-prefix code (benefits exceed allowance),
   *  'flat' = BR/D0/D1 flat rate on all income,
   *  'notax' = NT code, no tax deducted */
  mode: "allowance" | "kcode" | "flat" | "notax";
  /** Personal allowance derived from the code (mode=allowance). 0 for 0T. */
  personalAllowance: number;
  /** Amount added to taxable income (mode=kcode). */
  kAddition: number;
  /** Flat tax rate applied to all income (mode=flat). */
  flatRate: number;
  /** Human-readable description of what the code means. */
  description: string;
  /** The normalised code (e.g. "S1257L"). */
  raw: string;
}

/**
 * Parse a UK PAYE tax code string into its components.
 *
 * Handles:
 *  - Standard codes: 1257L, S1257L, C1257L, 1383M, 1194N, etc.
 *  - Zero-allowance: 0T, S0T
 *  - K codes: K500, SK500
 *  - Flat-rate: BR, SBR, D0, SD0, D1, SD1
 *  - No-tax: NT
 *  - Strips W1/M1/X emergency suffixes
 *
 * Returns null for invalid/empty codes.
 */
export function parseTaxCode(code: string): ParsedTaxCode | null {
  let raw = code.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return null;

  // Strip emergency/non-cumulative suffixes
  raw = raw.replace(/(W1|M1|X)$/, "");

  let remaining = raw;
  let isScottish = false;

  // S prefix = Scottish, C prefix = Welsh (treated as rUK for tax bands)
  if (remaining.startsWith("S") && remaining.length > 1 && remaining[1] !== "T") {
    // Avoid matching "ST..." unless it's a special code starting with S
    // Check if after S we get a valid pattern (not just any S-starting word)
    isScottish = true;
    remaining = remaining.slice(1);
  } else if (remaining.startsWith("C") && remaining.length > 1) {
    remaining = remaining.slice(1);
  }

  // Special flat-rate codes
  if (remaining === "BR") {
    return {
      isScottish, mode: "flat", personalAllowance: 0, kAddition: 0,
      flatRate: isScottish ? 0.20 : 0.20,
      description: "All income taxed at basic rate (20%)", raw,
    };
  }
  if (remaining === "D0") {
    return {
      isScottish, mode: "flat", personalAllowance: 0, kAddition: 0,
      flatRate: isScottish ? 0.42 : 0.40,
      description: isScottish
        ? "All income taxed at Scottish higher rate (42%)"
        : "All income taxed at higher rate (40%)",
      raw,
    };
  }
  if (remaining === "D1") {
    return {
      isScottish, mode: "flat", personalAllowance: 0, kAddition: 0,
      flatRate: isScottish ? 0.47 : 0.45,
      description: isScottish
        ? "All income taxed at Scottish top rate (47%)"
        : "All income taxed at additional rate (45%)",
      raw,
    };
  }
  if (remaining === "NT") {
    return {
      isScottish, mode: "notax", personalAllowance: 0, kAddition: 0, flatRate: 0,
      description: "No tax deducted", raw,
    };
  }

  // Zero-allowance: 0T
  if (remaining === "0T") {
    return {
      isScottish, mode: "allowance", personalAllowance: 0, kAddition: 0, flatRate: 0,
      description: "No personal allowance — graduated rates apply", raw,
    };
  }

  // K codes: K followed by digits
  const kMatch = remaining.match(/^K(\d+)$/);
  if (kMatch) {
    const kAddition = parseInt(kMatch[1], 10) * 10;
    return {
      isScottish, mode: "kcode", personalAllowance: 0, kAddition, flatRate: 0,
      description: `£${kAddition.toLocaleString()} added to taxable income (benefits exceed allowance)`,
      raw,
    };
  }

  // Standard codes: digits + letter suffix (L, M, N, T, Y)
  const stdMatch = remaining.match(/^(\d+)([LMNTY])$/);
  if (stdMatch) {
    const num = parseInt(stdMatch[1], 10);
    const letter = stdMatch[2];
    const personalAllowance = num * 10;

    let desc = `Personal allowance: £${personalAllowance.toLocaleString()}`;
    if (letter === "M") desc += " (Marriage Allowance received)";
    else if (letter === "N") desc += " (Marriage Allowance transferred)";
    else if (personalAllowance === TAX_CONFIG.personalAllowance) desc += " (standard)";

    return {
      isScottish, mode: "allowance", personalAllowance, kAddition: 0, flatRate: 0,
      description: desc, raw,
    };
  }

  return null; // unrecognised format
}

export interface BudgetCategory {
  id: string;
  label: string;
  monthlyAmount: number;
  /** Built-in categories cannot be removed */
  builtIn?: boolean;
}

export interface PensionInputs {
  grossSalary: number;
  spendingCategories: BudgetCategory[];
  savingsCategories: BudgetCategory[];
  employerMatchEnabled: boolean;
  employerMatchPercent: number;
  employerMatchOnGross: boolean;
  salarySacrifice: boolean;
  includeEmployeeNiSaving: boolean;
  includeEmployerNiSaving: boolean;
  scottishTax: boolean;
  /**
   * How the employee contribution is specified.
   * "netCost"    — user picks a monthly net-cost amount (take-home reduction)
   * "percentage" — user picks a % of qualifying earnings (like a workplace scheme)
   * "gross"      — user picks a monthly gross salary sacrifice amount
   */
  contributionMode: "netCost" | "percentage" | "gross";
  /** Monthly net cost chosen by the user (£/month). Used when contributionMode = "netCost". */
  chosenMonthlyContribution: number;
  /** Employee contribution as % of qualifying earnings. Used when contributionMode = "percentage". */
  employeeContributionPercent: number;
  /** Monthly gross salary sacrifice (£/month). Used when contributionMode = "gross". */
  chosenMonthlyGross: number;
  /** Undergraduate student loan plan type */
  studentLoanPlan: StudentLoanPlan;
  /** Whether the user also has a postgraduate loan (stacks with undergraduate) */
  hasPostgradLoan: boolean;
  /** Raw PAYE tax code string (e.g. "1257L", "S1257L", "BR", "K500"). Empty = auto-calculate. */
  taxCode: string;
}

export interface PayslipLine {
  label: string;
  before: number;
  after: number;
  diff: number;
  type: "add" | "deduct" | "total";
}

export interface PensionResult {
  grossSalary: number;

  // Without pension
  incomeTaxNoPension: number;
  employeeNiNoPension: number;
  studentLoanNoPension: number;
  postgradLoanNoPension: number;
  takeHomeNoPension: number;

  // Budget
  totalMonthlySpending: number;
  totalMonthlySavings: number;
  annualBudget: number;
  availableForPension: number;
  qualifyingEarnings: number;

  // Max budget calculations (holding other commitments fixed)
  maxContribution: number;
  maxContributionMonthly: number;
  maxEmployeePercent: number;
  maxGrossMonthly: number;
  maxSpendingMonthly: number;
  maxSavingsMonthly: number;

  // Pension contribution (employee side — what user chose)
  employeeContribution: number;
  employeeContributionMonthly: number;

  // Employer
  employerMatch: number;
  employerMatchMonthly: number;

  // NI savings
  employeeNiSaving: number;
  employerNiSaving: number;
  employeeNiSavingMonthly: number;
  employerNiSavingMonthly: number;

  // Student loan
  studentLoanWithPension: number;
  postgradLoanWithPension: number;
  studentLoanSaving: number;
  postgradLoanSaving: number;

  // Totals going into pension pot
  totalPensionPot: number;
  totalPensionPotMonthly: number;

  // After pension
  incomeTaxWithPension: number;
  employeeNiWithPension: number;
  takeHomeWithPension: number;
  effectiveTakeHomeGain: number;

  // Tax relief
  taxRelief: number;

  // Effective rate
  effectivePensionCostPerPound: number;

  // Monthly payslip
  payslip: PayslipLine[];

  // Breakdown for chart
  pensionBreakdown: {
    label: string;
    value: number;
    color: string;
  }[];

  // All savings composition (savings categories + pension)
  savingsComposition: {
    label: string;
    monthlyValue: number;
    yearlyValue: number;
    color: string;
  }[];
  totalSavingsMonthly: number;
  totalSavingsYearly: number;

  // Tax code
  parsedTaxCode: ParsedTaxCode | null;
  /** Whether Scottish tax rates are used (from tax code S-prefix or toggle). */
  effectiveScottish: boolean;
}

function getPersonalAllowance(grossSalary: number): number {
  let pa = TAX_CONFIG.personalAllowance;
  if (grossSalary > TAX_CONFIG.personalAllowanceTaperStart) {
    const reduction = Math.floor(
      (grossSalary - TAX_CONFIG.personalAllowanceTaperStart) / 2
    );
    pa = Math.max(0, pa - reduction);
  }
  return pa;
}

function calculateIncomeTaxRUK(taxableIncome: number, grossSalary: number, paOverride?: number): number {
  const personalAllowance = paOverride !== undefined ? paOverride : getPersonalAllowance(grossSalary);
  const taxable = Math.max(0, taxableIncome - personalAllowance);

  const basicBand = Math.max(
    0,
    Math.min(taxable, TAX_CONFIG.basicRateLimit - personalAllowance)
  );
  const higherBand = Math.max(
    0,
    Math.min(
      taxable - basicBand,
      TAX_CONFIG.higherRateLimit - TAX_CONFIG.basicRateLimit
    )
  );
  const additionalBand = Math.max(0, taxable - basicBand - higherBand);

  return (
    basicBand * TAX_CONFIG.basicRate +
    higherBand * TAX_CONFIG.higherRate +
    additionalBand * TAX_CONFIG.additionalRate
  );
}

function calculateIncomeTaxScottish(taxableIncome: number, grossSalary: number, paOverride?: number): number {
  const personalAllowance = paOverride !== undefined ? paOverride : getPersonalAllowance(grossSalary);
  const taxable = Math.max(0, taxableIncome - personalAllowance);

  if (taxable <= 0) return 0;

  let tax = 0;
  let remaining = taxable;

  for (const band of TAX_CONFIG.scottishBands) {
    const bandStart = band.from - TAX_CONFIG.personalAllowance; // relative to taxable
    const bandEnd = band.to === Infinity ? Infinity : band.to - TAX_CONFIG.personalAllowance;
    const bandWidth = bandEnd === Infinity ? remaining : Math.max(0, bandEnd - Math.max(0, bandStart));

    const inBand = Math.min(remaining, Math.max(0, bandWidth));
    if (inBand <= 0) continue;

    tax += inBand * band.rate;
    remaining -= inBand;

    if (remaining <= 0) break;
  }

  return tax;
}

function calculateIncomeTax(taxableIncome: number, grossSalary: number, scottish: boolean, paOverride?: number): number {
  return scottish
    ? calculateIncomeTaxScottish(taxableIncome, grossSalary, paOverride)
    : calculateIncomeTaxRUK(taxableIncome, grossSalary, paOverride);
}

/**
 * Compute income tax respecting a parsed tax code (if provided).
 * When no tax code is given, falls back to the standard calculation with dynamic PA taper.
 */
function computeIncomeTax(income: number, scottish: boolean, taxCode: ParsedTaxCode | null): number {
  if (!taxCode) return calculateIncomeTax(income, income, scottish);
  switch (taxCode.mode) {
    case "notax":
      return 0;
    case "flat":
      return Math.max(0, income) * taxCode.flatRate;
    case "kcode":
      // K code: add the K amount to income, zero personal allowance, graduated rates
      return calculateIncomeTax(income + taxCode.kAddition, income + taxCode.kAddition, scottish, 0);
    case "allowance":
      // Fixed personal allowance from the code (no dynamic taper)
      return calculateIncomeTax(income, income, scottish, taxCode.personalAllowance);
  }
}

function calculateEmployeeNi(earnings: number): number {
  const abovePrimary = Math.max(
    0,
    Math.min(earnings, TAX_CONFIG.niUpperEarningsLimit) -
      TAX_CONFIG.niPrimaryThreshold
  );
  const aboveUpper = Math.max(0, earnings - TAX_CONFIG.niUpperEarningsLimit);

  return abovePrimary * TAX_CONFIG.niRate + aboveUpper * TAX_CONFIG.niUpperRate;
}

function calculateEmployerNi(earnings: number): number {
  const aboveSecondary = Math.max(
    0,
    earnings - TAX_CONFIG.niSecondaryThreshold
  );
  return aboveSecondary * TAX_CONFIG.employerNiRate;
}

/**
 * Calculate student loan repayment for a given plan.
 * Repayment = rate * max(0, earnings - threshold).
 * Earnings = post-sacrifice gross pay (for salary sacrifice).
 */
function calculateStudentLoan(earnings: number, plan: StudentLoanPlan): number {
  if (plan === "none") return 0;
  const config = TAX_CONFIG.studentLoans[plan];
  return Math.max(0, (earnings - config.threshold) * config.rate);
}

function calculatePostgradLoan(earnings: number): number {
  const config = TAX_CONFIG.studentLoans.postgrad;
  return Math.max(0, (earnings - config.threshold) * config.rate);
}

/**
 * Convert a desired net cost (take-home reduction) into the gross salary
 * sacrifice that produces exactly that net cost.
 *
 * Because tax, NI, and student loan deductions are non-linear, we binary-search
 * for the gross amount whose take-home impact equals the requested net cost.
 */
function netCostToGrossContribution(
  grossSalary: number,
  desiredNetCost: number,
  takeHomeNoPension: number,
  scottishTax: boolean,
  studentLoanPlan: StudentLoanPlan,
  hasPostgradLoan: boolean,
  taxCode: ParsedTaxCode | null,
): number {
  if (desiredNetCost <= 0) return 0;
  let lo = 0;
  let hi = Math.min(grossSalary, TAX_CONFIG.annualAllowance);
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const reducedGross = grossSalary - mid;
    const taxAfter = computeIncomeTax(reducedGross, scottishTax, taxCode);
    const niAfter = calculateEmployeeNi(reducedGross);
    const slAfter = calculateStudentLoan(reducedGross, studentLoanPlan);
    const pgAfter = hasPostgradLoan ? calculatePostgradLoan(reducedGross) : 0;
    const takeHomeAfter = reducedGross - taxAfter - niAfter - slAfter - pgAfter;
    const netCost = takeHomeNoPension - takeHomeAfter;

    if (netCost < desiredNetCost) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round((lo + hi) / 2);
}

export function calculatePension(inputs: PensionInputs): PensionResult {
  const {
    grossSalary,
    spendingCategories,
    savingsCategories,
    employerMatchEnabled,
    employerMatchPercent,
    employerMatchOnGross,
    salarySacrifice,
    includeEmployeeNiSaving,
    includeEmployerNiSaving,
    scottishTax,
    contributionMode,
    chosenMonthlyContribution,
    employeeContributionPercent,
    studentLoanPlan,
    hasPostgradLoan,
    taxCode,
  } = inputs;

  // Parse tax code (if provided) and determine effective Scottish flag
  const parsedTaxCode = parseTaxCode(taxCode);
  const effectiveScottish = parsedTaxCode ? parsedTaxCode.isScottish : scottishTax;

  const totalMonthlySpending = spendingCategories.reduce((sum, c) => sum + c.monthlyAmount, 0);
  const totalMonthlySavings = savingsCategories.reduce((sum, c) => sum + c.monthlyAmount, 0);
  const annualSpending = (totalMonthlySpending + totalMonthlySavings) * 12;

  // Qualifying earnings (used for percentage-based contributions)
  const qualifyingEarnings = Math.max(
    0,
    Math.min(grossSalary, TAX_CONFIG.qualifyingEarningsUpper) - TAX_CONFIG.qualifyingEarningsLower
  );

  // Tax, NI, and student loan without any pension
  const incomeTaxNoPension = computeIncomeTax(grossSalary, effectiveScottish, parsedTaxCode);
  const employeeNiNoPension = calculateEmployeeNi(grossSalary);
  const studentLoanNoPension = calculateStudentLoan(grossSalary, studentLoanPlan);
  const postgradLoanNoPension = hasPostgradLoan ? calculatePostgradLoan(grossSalary) : 0;
  const takeHomeNoPension = grossSalary - incomeTaxNoPension - employeeNiNoPension - studentLoanNoPension - postgradLoanNoPension;

  // What's left after all budget categories
  const availableForPension = Math.max(
    0,
    takeHomeNoPension - annualSpending
  );

  // Max affordable net cost — simply what's left of take-home after the budget
  const maxContribution = Math.max(0, availableForPension);

  // Determine the gross employee contribution based on the chosen mode
  let employeeContribution: number;
  if (contributionMode === "percentage") {
    // Fixed % of qualifying earnings — this is the gross salary sacrifice
    employeeContribution = Math.round((qualifyingEarnings * employeeContributionPercent) / 100);
  } else if (contributionMode === "gross") {
    // Direct gross amount — user specifies the monthly salary sacrifice
    employeeContribution = Math.max(0, inputs.chosenMonthlyGross * 12);
  } else {
    // Net cost mode: user picks a monthly net-cost, we derive gross contribution
    const chosenNetCost = Math.max(0, chosenMonthlyContribution * 12);
    if (salarySacrifice) {
      employeeContribution = netCostToGrossContribution(
        grossSalary, chosenNetCost, takeHomeNoPension, effectiveScottish,
        studentLoanPlan, hasPostgradLoan, parsedTaxCode
      );
    } else {
      employeeContribution = chosenNetCost;
    }
  }
  // Cap at annual allowance and gross salary
  employeeContribution = Math.min(employeeContribution, TAX_CONFIG.annualAllowance);
  employeeContribution = Math.min(employeeContribution, grossSalary);
  employeeContribution = Math.max(0, employeeContribution);

  // Employer match
  let employerMatch = 0;
  if (employerMatchEnabled) {
    const matchBasis = employerMatchOnGross
      ? grossSalary
      : Math.max(0, Math.min(grossSalary, TAX_CONFIG.qualifyingEarningsUpper) - TAX_CONFIG.qualifyingEarningsLower);
    employerMatch = (matchBasis * employerMatchPercent) / 100;
  }

  // Cap total at annual allowance
  const totalBeforeCap = employeeContribution + employerMatch;
  if (totalBeforeCap > TAX_CONFIG.annualAllowance) {
    const excess = totalBeforeCap - TAX_CONFIG.annualAllowance;
    employeeContribution = Math.max(0, employeeContribution - excess);
  }

  // NI savings from salary sacrifice
  let employeeNiSaving = 0;
  let employerNiSaving = 0;

  if (salarySacrifice) {
    const reducedGross = grossSalary - employeeContribution;
    const niAfter = calculateEmployeeNi(reducedGross);
    employeeNiSaving = employeeNiNoPension - niAfter;

    const employerNiBefore = calculateEmployerNi(grossSalary);
    const employerNiAfter = calculateEmployerNi(reducedGross);
    employerNiSaving = employerNiBefore - employerNiAfter;
  }

  // Total pension pot
  let totalPensionPot = employeeContribution + employerMatch;
  if (includeEmployeeNiSaving && salarySacrifice) {
    totalPensionPot += employeeNiSaving;
  }
  if (includeEmployerNiSaving && salarySacrifice) {
    totalPensionPot += employerNiSaving;
  }

  // Tax and deductions after pension
  const taxableAfterPension = salarySacrifice
    ? grossSalary - employeeContribution
    : grossSalary;
  const incomeTaxWithPension = computeIncomeTax(taxableAfterPension, effectiveScottish, parsedTaxCode);
  const employeeNiWithPension = salarySacrifice
    ? calculateEmployeeNi(taxableAfterPension)
    : employeeNiNoPension;

  // Student loan on post-sacrifice gross (salary sacrifice reduces SL repayments)
  const studentLoanWithPension = salarySacrifice
    ? calculateStudentLoan(taxableAfterPension, studentLoanPlan)
    : studentLoanNoPension;
  const postgradLoanWithPension = salarySacrifice
    ? (hasPostgradLoan ? calculatePostgradLoan(taxableAfterPension) : 0)
    : postgradLoanNoPension;

  const studentLoanSaving = studentLoanNoPension - studentLoanWithPension;
  const postgradLoanSaving = postgradLoanNoPension - postgradLoanWithPension;

  const takeHomeWithPension = salarySacrifice
    ? taxableAfterPension - incomeTaxWithPension - employeeNiWithPension - studentLoanWithPension - postgradLoanWithPension
    : takeHomeNoPension - employeeContribution;

  const taxRelief = incomeTaxNoPension - incomeTaxWithPension;
  const effectiveTakeHomeGain = takeHomeNoPension - takeHomeWithPension;

  // Max budget calculations — "given everything else, what's the max for this one?"
  const maxGrossForBudget = salarySacrifice
    ? netCostToGrossContribution(grossSalary, availableForPension, takeHomeNoPension, effectiveScottish, studentLoanPlan, hasPostgradLoan, parsedTaxCode)
    : availableForPension;
  const maxGrossCapped = Math.min(Math.max(0, maxGrossForBudget), TAX_CONFIG.annualAllowance, grossSalary);
  const maxEmployeePercent = qualifyingEarnings > 0
    ? Math.round((maxGrossCapped / qualifyingEarnings) * 100)
    : 0;

  // Max gross monthly contribution the budget can support
  const maxGrossMonthly = Math.round(maxGrossCapped / 12);

  // Max spending — given current savings + pension net cost
  const maxSpendingMonthly = Math.max(
    0,
    Math.floor((takeHomeNoPension - effectiveTakeHomeGain - totalMonthlySavings * 12) / 12)
  );

  // Max savings — given current spending + pension net cost
  const maxSavingsMonthly = Math.max(
    0,
    Math.floor((takeHomeNoPension - effectiveTakeHomeGain - totalMonthlySpending * 12) / 12)
  );

  // Cost per £1 in pension
  const effectivePensionCostPerPound =
    totalPensionPot > 0 ? effectiveTakeHomeGain / totalPensionPot : 0;

  // ----- Monthly payslip -----
  const m = (v: number) => Math.round(v / 12);

  const grossMonthly = m(grossSalary);
  const pensionDeductMonthly = m(employeeContribution);
  const taxableMonthlyBefore = grossMonthly;
  const taxableMonthlyAfter = salarySacrifice ? grossMonthly - pensionDeductMonthly : grossMonthly;

  const taxMonthlyBefore = m(incomeTaxNoPension);
  const taxMonthlyAfter = m(incomeTaxWithPension);
  const niMonthlyBefore = m(employeeNiNoPension);
  const niMonthlyAfter = m(employeeNiWithPension);
  const slMonthlyBefore = m(studentLoanNoPension);
  const slMonthlyAfter = m(studentLoanWithPension);
  const pgMonthlyBefore = m(postgradLoanNoPension);
  const pgMonthlyAfter = m(postgradLoanWithPension);

  const netMonthlyBefore = m(takeHomeNoPension);
  const netMonthlyAfter = m(takeHomeWithPension);

  const payslip: PayslipLine[] = [
    {
      label: "Gross Salary",
      before: grossMonthly,
      after: grossMonthly,
      diff: 0,
      type: "add",
    },
  ];

  if (salarySacrifice && employeeContribution > 0) {
    payslip.push({
      label: "Salary Sacrifice (Pension)",
      before: 0,
      after: -pensionDeductMonthly,
      diff: -pensionDeductMonthly,
      type: "deduct",
    });
    payslip.push({
      label: "Taxable Pay",
      before: taxableMonthlyBefore,
      after: taxableMonthlyAfter,
      diff: taxableMonthlyAfter - taxableMonthlyBefore,
      type: "total",
    });
  }

  payslip.push(
    {
      label: "Income Tax",
      before: -taxMonthlyBefore,
      after: -taxMonthlyAfter,
      diff: -(taxMonthlyAfter - taxMonthlyBefore),
      type: "deduct",
    },
    {
      label: "Employee NI",
      before: -niMonthlyBefore,
      after: -niMonthlyAfter,
      diff: -(niMonthlyAfter - niMonthlyBefore),
      type: "deduct",
    },
  );

  // Student loan lines (only if active)
  if (studentLoanPlan !== "none") {
    payslip.push({
      label: `Student Loan (${TAX_CONFIG.studentLoans[studentLoanPlan].label})`,
      before: -slMonthlyBefore,
      after: -slMonthlyAfter,
      diff: -(slMonthlyAfter - slMonthlyBefore),
      type: "deduct",
    });
  }

  if (hasPostgradLoan) {
    payslip.push({
      label: "Postgraduate Loan",
      before: -pgMonthlyBefore,
      after: -pgMonthlyAfter,
      diff: -(pgMonthlyAfter - pgMonthlyBefore),
      type: "deduct",
    });
  }

  if (!salarySacrifice && employeeContribution > 0) {
    payslip.push({
      label: "Pension (from net pay)",
      before: 0,
      after: -pensionDeductMonthly,
      diff: -pensionDeductMonthly,
      type: "deduct",
    });
  }

  payslip.push({
    label: "Net Take-Home",
    before: netMonthlyBefore,
    after: netMonthlyAfter,
    diff: netMonthlyAfter - netMonthlyBefore,
    type: "total",
  });

  // Chart breakdown
  const pensionBreakdown: PensionResult["pensionBreakdown"] = [];
  if (employeeContribution > 0) {
    pensionBreakdown.push({
      label: "Your Contribution",
      value: Math.round(employeeContribution),
      color: "#6366f1",
    });
  }
  if (employerMatch > 0) {
    pensionBreakdown.push({
      label: "Employer Match",
      value: Math.round(employerMatch),
      color: "#22c55e",
    });
  }
  if (includeEmployeeNiSaving && employeeNiSaving > 0) {
    pensionBreakdown.push({
      label: "Employee NI Saving",
      value: Math.round(employeeNiSaving),
      color: "#f59e0b",
    });
  }
  if (includeEmployerNiSaving && employerNiSaving > 0) {
    pensionBreakdown.push({
      label: "Employer NI Saving",
      value: Math.round(employerNiSaving),
      color: "#06b6d4",
    });
  }

  // Savings composition: savings categories + pension
  const savingsColors = ["#22c55e", "#10b981", "#059669", "#047857", "#065f46"];
  const savingsComposition: PensionResult["savingsComposition"] = [];

  savingsCategories.forEach((cat, i) => {
    if (cat.monthlyAmount > 0) {
      savingsComposition.push({
        label: cat.label,
        monthlyValue: cat.monthlyAmount,
        yearlyValue: cat.monthlyAmount * 12,
        color: savingsColors[i % savingsColors.length],
      });
    }
  });

  if (totalPensionPot > 0) {
    savingsComposition.push({
      label: "Pension (Total Pot)",
      monthlyValue: Math.round(totalPensionPot / 12),
      yearlyValue: Math.round(totalPensionPot),
      color: "#6366f1",
    });
  }

  const totalSavingsMonthly = savingsComposition.reduce((s, c) => s + c.monthlyValue, 0);
  const totalSavingsYearly = savingsComposition.reduce((s, c) => s + c.yearlyValue, 0);

  return {
    grossSalary,
    incomeTaxNoPension: Math.round(incomeTaxNoPension),
    employeeNiNoPension: Math.round(employeeNiNoPension),
    studentLoanNoPension: Math.round(studentLoanNoPension),
    postgradLoanNoPension: Math.round(postgradLoanNoPension),
    takeHomeNoPension: Math.round(takeHomeNoPension),

    totalMonthlySpending,
    totalMonthlySavings,
    annualBudget: annualSpending,
    availableForPension: Math.round(availableForPension),
    qualifyingEarnings,

    maxContribution: Math.round(maxContribution),
    maxContributionMonthly: Math.round(maxContribution / 12),
    maxEmployeePercent,
    maxGrossMonthly,
    maxSpendingMonthly,
    maxSavingsMonthly,

    employeeContribution: Math.round(employeeContribution),
    employeeContributionMonthly: Math.round(employeeContribution / 12),

    employerMatch: Math.round(employerMatch),
    employerMatchMonthly: Math.round(employerMatch / 12),

    employeeNiSaving: Math.round(employeeNiSaving),
    employerNiSaving: Math.round(employerNiSaving),
    employeeNiSavingMonthly: Math.round(employeeNiSaving / 12),
    employerNiSavingMonthly: Math.round(employerNiSaving / 12),

    studentLoanWithPension: Math.round(studentLoanWithPension),
    postgradLoanWithPension: Math.round(postgradLoanWithPension),
    studentLoanSaving: Math.round(studentLoanSaving),
    postgradLoanSaving: Math.round(postgradLoanSaving),

    totalPensionPot: Math.round(totalPensionPot),
    totalPensionPotMonthly: Math.round(totalPensionPot / 12),

    incomeTaxWithPension: Math.round(incomeTaxWithPension),
    employeeNiWithPension: Math.round(employeeNiWithPension),
    takeHomeWithPension: Math.round(takeHomeWithPension),
    effectiveTakeHomeGain: Math.round(effectiveTakeHomeGain),

    taxRelief: Math.round(taxRelief),
    effectivePensionCostPerPound: Math.round(effectivePensionCostPerPound * 100) / 100,

    payslip,
    pensionBreakdown,
    savingsComposition,
    totalSavingsMonthly,
    totalSavingsYearly,

    parsedTaxCode,
    effectiveScottish,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
