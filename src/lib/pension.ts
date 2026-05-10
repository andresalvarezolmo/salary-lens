// UK Tax / NI thresholds for 2024/25 tax year
export const TAX_CONFIG = {
  personalAllowance: 12_570,
  basicRateLimit: 50_270,
  higherRateLimit: 125_140,
  personalAllowanceTaperStart: 100_000,

  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,

  // Employee NI
  niPrimaryThreshold: 12_570,
  niUpperEarningsLimit: 50_270,
  niRate: 0.08,
  niUpperRate: 0.02,

  // Employer NI
  niSecondaryThreshold: 5_000,
  employerNiRate: 0.138,

  annualAllowance: 60_000,
};

export interface PensionInputs {
  grossSalary: number;
  monthlySpending: number;
  monthlySavings: number;
  employerMatchEnabled: boolean;
  employerMatchPercent: number;
  employerMatchCapPercent: number;
  salarySacrifice: boolean;
  includeEmployeeNiSaving: boolean;
  includeEmployerNiSaving: boolean;
}

export interface PensionResult {
  grossSalary: number;

  // Without pension
  incomeTaxNoPension: number;
  employeeNiNoPension: number;
  takeHomeNoPension: number;

  // Budget
  annualSpending: number;
  annualSavings: number;
  availableForPension: number;

  // Pension contribution (employee side)
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

  // Breakdown for chart
  pensionBreakdown: {
    label: string;
    value: number;
    color: string;
  }[];
}

function calculateIncomeTax(taxableIncome: number, grossSalary: number): number {
  // Personal allowance taper: reduced by £1 for every £2 over £100k
  let personalAllowance = TAX_CONFIG.personalAllowance;
  if (grossSalary > TAX_CONFIG.personalAllowanceTaperStart) {
    const reduction = Math.floor(
      (grossSalary - TAX_CONFIG.personalAllowanceTaperStart) / 2
    );
    personalAllowance = Math.max(0, personalAllowance - reduction);
  }

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

export function calculatePension(inputs: PensionInputs): PensionResult {
  const {
    grossSalary,
    monthlySpending,
    monthlySavings,
    employerMatchEnabled,
    employerMatchPercent,
    employerMatchCapPercent,
    salarySacrifice,
    includeEmployeeNiSaving,
    includeEmployerNiSaving,
  } = inputs;

  const annualSpending = monthlySpending * 12;
  const annualSavings = monthlySavings * 12;

  // Tax & NI without any pension
  const incomeTaxNoPension = calculateIncomeTax(grossSalary, grossSalary);
  const employeeNiNoPension = calculateEmployeeNi(grossSalary);
  const takeHomeNoPension = grossSalary - incomeTaxNoPension - employeeNiNoPension;

  // What's left after spending and saving
  const availableForPension = Math.max(
    0,
    takeHomeNoPension - annualSpending - annualSavings
  );

  // For salary sacrifice: the employee contribution is gross (pre-tax).
  // The "cost" to take-home is less because you save tax and NI.
  // We need to find the gross contribution that costs `availableForPension` in net terms.
  let employeeContribution: number;

  if (salarySacrifice) {
    // With salary sacrifice, we need to find gross amount where:
    // takeHome(gross) - takeHome(gross - contribution) = availableForPension
    // Binary search for the right contribution amount
    let lo = 0;
    let hi = Math.min(grossSalary, TAX_CONFIG.annualAllowance);
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const reducedGross = grossSalary - mid;
      const taxAfter = calculateIncomeTax(reducedGross, reducedGross);
      const niAfter = calculateEmployeeNi(reducedGross);
      const takeHomeAfter = reducedGross - taxAfter - niAfter;
      const netCost = takeHomeNoPension - takeHomeAfter;

      if (netCost < availableForPension) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    employeeContribution = Math.round((lo + hi) / 2);
  } else {
    // Relief at source: contribution is net, HMRC adds basic rate relief
    // But for simplicity: the contribution from take-home = availableForPension
    // Gross contribution = net / (1 - basic rate) for basic rate taxpayers
    employeeContribution = availableForPension;
  }

  // Cap at annual allowance
  employeeContribution = Math.min(employeeContribution, TAX_CONFIG.annualAllowance);
  employeeContribution = Math.max(0, employeeContribution);

  // Employer match
  let employerMatch = 0;
  if (employerMatchEnabled) {
    const matchAmount =
      (grossSalary * employerMatchPercent) / 100;
    const capAmount =
      (grossSalary * employerMatchCapPercent) / 100;
    employerMatch = Math.min(matchAmount, capAmount);
  }

  // Cap total at annual allowance
  const totalBeforeCap = employeeContribution + employerMatch;
  if (totalBeforeCap > TAX_CONFIG.annualAllowance) {
    const excess = totalBeforeCap - TAX_CONFIG.annualAllowance;
    // Reduce employee contribution first
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
    taxableAfterPension
  );
  const employeeNiWithPension = salarySacrifice
    ? calculateEmployeeNi(taxableAfterPension)
    : employeeNiNoPension;

  const takeHomeWithPension = salarySacrifice
    ? taxableAfterPension - incomeTaxWithPension - employeeNiWithPension
    : takeHomeNoPension - employeeContribution;

  const taxRelief = incomeTaxNoPension - incomeTaxWithPension;
  const effectiveTakeHomeGain = takeHomeNoPension - takeHomeWithPension;

  // Cost per £1 in pension
  const effectivePensionCostPerPound =
    totalPensionPot > 0 ? effectiveTakeHomeGain / totalPensionPot : 0;

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

  return {
    grossSalary,
    incomeTaxNoPension: Math.round(incomeTaxNoPension),
    employeeNiNoPension: Math.round(employeeNiNoPension),
    takeHomeNoPension: Math.round(takeHomeNoPension),

    annualSpending,
    annualSavings,
    availableForPension: Math.round(availableForPension),

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

    pensionBreakdown,
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
