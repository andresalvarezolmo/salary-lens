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
};

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

function calculateIncomeTaxRUK(taxableIncome: number, grossSalary: number): number {
  const personalAllowance = getPersonalAllowance(grossSalary);
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

function calculateIncomeTaxScottish(taxableIncome: number, grossSalary: number): number {
  const personalAllowance = getPersonalAllowance(grossSalary);
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

function calculateIncomeTax(taxableIncome: number, grossSalary: number, scottish: boolean): number {
  return scottish
    ? calculateIncomeTaxScottish(taxableIncome, grossSalary)
    : calculateIncomeTaxRUK(taxableIncome, grossSalary);
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
 * Convert a desired net cost (take-home reduction) into the gross salary
 * sacrifice that produces exactly that net cost.
 *
 * Because tax & NI are non-linear, we binary-search for the gross amount
 * whose take-home impact equals the requested net cost.
 */
function netCostToGrossContribution(
  grossSalary: number,
  desiredNetCost: number,
  takeHomeNoPension: number,
  scottishTax: boolean,
): number {
  if (desiredNetCost <= 0) return 0;
  let lo = 0;
  let hi = Math.min(grossSalary, TAX_CONFIG.annualAllowance);
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const reducedGross = grossSalary - mid;
    const taxAfter = calculateIncomeTax(reducedGross, reducedGross, scottishTax);
    const niAfter = calculateEmployeeNi(reducedGross);
    const takeHomeAfter = reducedGross - taxAfter - niAfter;
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
  } = inputs;

  const totalMonthlySpending = spendingCategories.reduce((sum, c) => sum + c.monthlyAmount, 0);
  const totalMonthlySavings = savingsCategories.reduce((sum, c) => sum + c.monthlyAmount, 0);
  const annualSpending = (totalMonthlySpending + totalMonthlySavings) * 12;

  // Qualifying earnings (used for percentage-based contributions)
  const qualifyingEarnings = Math.max(
    0,
    Math.min(grossSalary, TAX_CONFIG.qualifyingEarningsUpper) - TAX_CONFIG.qualifyingEarningsLower
  );

  // Tax & NI without any pension
  const incomeTaxNoPension = calculateIncomeTax(grossSalary, grossSalary, scottishTax);
  const employeeNiNoPension = calculateEmployeeNi(grossSalary);
  const takeHomeNoPension = grossSalary - incomeTaxNoPension - employeeNiNoPension;

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
        grossSalary, chosenNetCost, takeHomeNoPension, scottishTax
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

  // Tax after pension
  const taxableAfterPension = salarySacrifice
    ? grossSalary - employeeContribution
    : grossSalary;
  const incomeTaxWithPension = calculateIncomeTax(
    taxableAfterPension,
    taxableAfterPension,
    scottishTax,
  );
  const employeeNiWithPension = salarySacrifice
    ? calculateEmployeeNi(taxableAfterPension)
    : employeeNiNoPension;

  const takeHomeWithPension = salarySacrifice
    ? taxableAfterPension - incomeTaxWithPension - employeeNiWithPension
    : takeHomeNoPension - employeeContribution;

  const taxRelief = incomeTaxNoPension - incomeTaxWithPension;
  const effectiveTakeHomeGain = takeHomeNoPension - takeHomeWithPension;

  // Max budget calculations — "given everything else, what's the max for this one?"
  // Max employee contribution as % of qualifying earnings
  const maxGrossForBudget = salarySacrifice
    ? netCostToGrossContribution(grossSalary, availableForPension, takeHomeNoPension, scottishTax)
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
