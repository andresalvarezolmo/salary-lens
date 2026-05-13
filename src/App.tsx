import { useState, useMemo, useEffect, useCallback } from "react";
import { calculatePension, formatCurrency, TAX_CONFIG } from "./lib/pension";
import type { PensionInputs, BudgetCategory, StudentLoanPlan } from "./lib/pension";
import { CurrencyInput } from "./components/CurrencyInput";
import { Toggle } from "./components/Toggle";
import { StatCard } from "./components/StatCard";
import { SalaryWaterfallChart } from "./components/SalaryWaterfallChart";
import { PayslipComparison } from "./components/PayslipComparison";
import { SavingsOverview } from "./components/SavingsOverview";
import { BudgetCategoryList } from "./components/BudgetCategoryList";
import {
  PiggyBank,
  TrendingUp,
  Wallet,
  Landmark,
  Building2,
  SlidersHorizontal,
  Plus,
  GraduationCap,
  ChevronDown,
  FileText,
  AlertCircle,
} from "lucide-react";
import { getTheme, ThemeContext } from "./lib/theme";

let nextId = 1;

const DEFAULT_SPENDING: BudgetCategory[] = [
  { id: "spending", label: "Monthly Spending", monthlyAmount: 1500, builtIn: false },
];

const DEFAULT_SAVINGS: BudgetCategory[] = [
  { id: "isa", label: "ISA Contributions", monthlyAmount: 1666.66, builtIn: true },
];

function App() {
  const [inputs, setInputs] = useState<PensionInputs>({
    grossSalary: 0,
    spendingCategories: DEFAULT_SPENDING,
    savingsCategories: DEFAULT_SAVINGS,
    employerMatchEnabled: true,
    employerMatchPercent: 3,
    employerMatchOnGross: false,
    salarySacrifice: true,
    includeEmployeeNiSaving: false,
    includeEmployerNiSaving: true,
    scottishTax: true,
    contributionMode: "percentage",
    chosenMonthlyContribution: 0,
    employeeContributionPercent: 5,
    chosenMonthlyGross: 0,
    studentLoanPlan: "none",
    hasPostgradLoan: false,
    taxCode: "",
  });
  const [studentLoanOpen, setStudentLoanOpen] = useState(false);
  const [taxCodeOpen, setTaxCodeOpen] = useState(false);

  const update = <K extends keyof PensionInputs>(
    key: K,
    value: PensionInputs[K]
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  // Category helpers for spending
  const updateSpending = useCallback(
    (id: string, field: "label" | "monthlyAmount", value: string | number) => {
      setInputs((prev) => ({
        ...prev,
        spendingCategories: prev.spendingCategories.map((c) =>
          c.id === id ? { ...c, [field]: value } : c
        ),
      }));
    },
    []
  );
  const addSpending = useCallback(() => {
    setInputs((prev) => ({
      ...prev,
      spendingCategories: [
        ...prev.spendingCategories,
        { id: `spend-${nextId++}`, label: "New expense", monthlyAmount: 0 },
      ],
    }));
  }, []);
  const removeSpending = useCallback((id: string) => {
    setInputs((prev) => ({
      ...prev,
      spendingCategories: prev.spendingCategories.filter((c) => c.id !== id),
    }));
  }, []);

  // Category helpers for savings
  const updateSavings = useCallback(
    (id: string, field: "label" | "monthlyAmount", value: string | number) => {
      setInputs((prev) => ({
        ...prev,
        savingsCategories: prev.savingsCategories.map((c) =>
          c.id === id ? { ...c, [field]: value } : c
        ),
      }));
    },
    []
  );
  const addSavings = useCallback(() => {
    setInputs((prev) => ({
      ...prev,
      savingsCategories: [
        ...prev.savingsCategories,
        { id: `save-${nextId++}`, label: "New savings", monthlyAmount: 0 },
      ],
    }));
  }, []);
  const removeSavings = useCallback((id: string) => {
    setInputs((prev) => ({
      ...prev,
      savingsCategories: prev.savingsCategories.filter((c) => c.id !== id),
    }));
  }, []);

  const result = useMemo(() => calculatePension(inputs), [inputs]);
  const theme = useMemo(() => getTheme(result.effectiveScottish), [result.effectiveScottish]);

  // On first load, seed sliders to max available (only for netCost/gross modes)
  const [hasInitialised, setHasInitialised] = useState(false);
  useEffect(() => {
    if (hasInitialised) return;
    if (inputs.contributionMode === "netCost" && result.maxContributionMonthly > 0) {
      update("chosenMonthlyContribution", result.maxContributionMonthly);
    } else if (inputs.contributionMode === "gross" && result.maxGrossMonthly > 0) {
      update("chosenMonthlyGross", result.maxGrossMonthly);
    }
    setHasInitialised(true);
  }, [hasInitialised, result.maxContributionMonthly, result.maxGrossMonthly, inputs.contributionMode]);

  const contributionExceedsBudget =
    result.effectiveTakeHomeGain > result.availableForPension && result.employeeContribution > 0;

  const sliderMax = Math.max(
    result.maxContributionMonthly,
    inputs.chosenMonthlyContribution,
    Math.round(result.takeHomeNoPension / 12)
  );

  return (
    <ThemeContext.Provider value={theme}>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Flag-inspired accent bar */}
      <div className={`h-1.5 bg-gradient-to-r ${theme.headerBar} transition-all duration-300`} />

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className={`p-2 rounded-xl ${theme.iconBg} ${theme.iconBgDark} ring-2 ring-white/80 dark:ring-white/15 transition-colors duration-300`}>
            <PiggyBank className={`w-6 h-6 ${theme.iconText} ${theme.iconTextDark} transition-colors duration-300`} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Salary Lens
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              UK tax, pension & take-home pay calculator
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* --- LEFT: Inputs --- */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Income */}
            <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${theme.iconText}`} />
                Income
              </h2>
              <CurrencyInput
                id="gross"
                label="Gross Annual Salary"
                value={inputs.grossSalary}
                onChange={(v) => update("grossSalary", v)}
                max={300000}
                step={1000}
              />

              {/* Scottish Tax toggle — hidden when tax code determines it */}
              {!result.parsedTaxCode && (
                <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                  <Toggle
                    id="scottish"
                    label="Scottish Tax Rates"
                    description="Use Scottish income tax bands"
                    enabled={inputs.scottishTax}
                    onChange={(v) => update("scottishTax", v)}
                  />
                </div>
              )}
            </section>

            {/* Tax Code — collapsible */}
            <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 shadow-sm overflow-hidden">
              <button
                onClick={() => setTaxCodeOpen((o) => !o)}
                className="w-full px-5 py-4 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Tax Code
                </h2>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${taxCodeOpen ? "rotate-180" : ""}`} />
              </button>
              {taxCodeOpen && (
                <div className="px-5 pb-5 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                  <input
                    id="taxCode"
                    type="text"
                    value={inputs.taxCode}
                    onChange={(e) => update("taxCode", e.target.value)}
                    placeholder="e.g. 1257L"
                    className={`w-full text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 ${theme.focusRing} transition-colors uppercase`}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {inputs.taxCode.trim() && (
                    <div>
                      {result.parsedTaxCode ? (
                        <p className={`text-xs ${theme.accent} ${theme.accentDark}`}>
                          {result.parsedTaxCode.description}
                          {result.parsedTaxCode.isScottish && " · Scottish taxpayer"}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Unrecognised tax code — using standard allowance
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Find it on your payslip or P60. Leave blank to auto-calculate.
                  </p>
                </div>
              )}
            </section>

            {/* Spending */}
            <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-rose-500" />
                  Spending
                </h2>
                <button
                  onClick={addSpending}
                  className={`flex items-center gap-1 text-xs font-medium ${theme.accent} ${theme.accentDark} hover:opacity-80 transition-colors`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              <BudgetCategoryList
                categories={inputs.spendingCategories}
                onUpdate={updateSpending}
                onAdd={addSpending}
                onRemove={removeSpending}
                addLabel="Add expense"
              />

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Total spending
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(result.totalMonthlySpending)} / mo
                  </span>
                </div>
                <button
                  onClick={() => {
                    const otherSpending = inputs.spendingCategories.slice(1).reduce((s, c) => s + c.monthlyAmount, 0);
                    const firstMax = Math.max(0, result.maxSpendingMonthly - otherSpending);
                    if (inputs.spendingCategories.length > 0) {
                      updateSpending(inputs.spendingCategories[0].id, "monthlyAmount", firstMax);
                    }
                  }}
                  className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Use max budget ({formatCurrency(result.maxSpendingMonthly)}/mo)
                </button>
              </div>
            </section>

            {/* Savings */}
            <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-500" />
                  Savings
                </h2>
                <button
                  onClick={addSavings}
                  className={`flex items-center gap-1 text-xs font-medium ${theme.accent} ${theme.accentDark} hover:opacity-80 transition-colors`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              <BudgetCategoryList
                categories={inputs.savingsCategories}
                onUpdate={updateSavings}
                onAdd={addSavings}
                onRemove={removeSavings}
                addLabel="Add savings"
              />

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Total savings (excl. pension)
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(result.totalMonthlySavings)} / mo
                  </span>
                </div>
                <button
                  onClick={() => {
                    const isa = inputs.savingsCategories.find((c) => c.builtIn);
                    if (isa) {
                      const otherSavings = inputs.savingsCategories.filter((c) => !c.builtIn).reduce((s, c) => s + c.monthlyAmount, 0);
                      const isaMax = Math.max(0, result.maxSavingsMonthly - otherSavings);
                      updateSavings(isa.id, "monthlyAmount", isaMax);
                    }
                  }}
                  className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Max ISA ({formatCurrency(result.maxSavingsMonthly)}/mo)
                </button>
              </div>
            </section>

            {/* Available summary */}
            <div className={`rounded-2xl ${theme.accentBgLight} ${theme.accentBgLightDark} border ${theme.accentBorder} ${theme.accentBorderDark} ring-1 ring-white/60 dark:ring-white/10 p-4 space-y-1.5 transition-colors duration-300`}>
              <div className="flex justify-between text-sm">
                <span className={`${theme.accentText} ${theme.accentTextDark}`}>
                  Available for pension (net)
                </span>
                <span className={`font-semibold ${theme.accentText} ${theme.accentTextDark}`}>
                  {formatCurrency(result.availableForPension)} / yr
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={`${theme.accentTextMuted} ${theme.accentTextMutedDark}`}>
                  Max you can afford
                </span>
                <span className={`font-medium ${theme.accentTextMuted} ${theme.accentTextMutedDark}`}>
                  {formatCurrency(result.maxContributionMonthly)} / mo
                </span>
              </div>
            </div>

            {/* Contribution amount */}
            <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className={`w-4 h-4 ${theme.iconText}`} />
                Your Contribution
              </h2>

              {/* Mode toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                {(["percentage", "gross", "netCost"] as const).map((mode) => {
                  const label = mode === "percentage" ? "% of QE" : mode === "gross" ? "Gross £" : "Net Cost";
                  const isActive = inputs.contributionMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        if (inputs.contributionMode === mode) return;
                        const grossMonthly = result.employeeContributionMonthly;
                        const netCostMonthly = Math.round(result.effectiveTakeHomeGain / 12);
                        const pct = result.qualifyingEarnings > 0
                          ? Math.round((result.employeeContribution / result.qualifyingEarnings) * 100)
                          : 0;
                        setInputs((prev) => ({
                          ...prev,
                          contributionMode: mode,
                          employeeContributionPercent: pct,
                          chosenMonthlyGross: grossMonthly,
                          chosenMonthlyContribution: netCostMonthly,
                        }));
                      }}
                      className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${
                        isActive
                          ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {inputs.contributionMode === "percentage" && (
                <>
                  <CurrencyInput
                    id="empContPct"
                    label="Employee Contribution"
                    value={inputs.employeeContributionPercent}
                    onChange={(v) => update("employeeContributionPercent", v)}
                    prefix=""
                    suffix="%"
                    max={40}
                    step={1}
                    helpText={`${formatCurrency(result.employeeContributionMonthly)} / month gross sacrifice (${formatCurrency(result.employeeContribution)} / year)`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => update("employeeContributionPercent", result.maxEmployeePercent)}
                      className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Use max budget
                    </button>
                    <button
                      onClick={() => update("employeeContributionPercent", 0)}
                      className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Reset to 0%
                    </button>
                  </div>
                </>
              )}

              {inputs.contributionMode === "gross" && (
                <>
                  <CurrencyInput
                    id="grossContrib"
                    label="Monthly Gross Sacrifice"
                    value={inputs.chosenMonthlyGross}
                    onChange={(v) => update("chosenMonthlyGross", v)}
                    max={Math.max(result.maxGrossMonthly, inputs.chosenMonthlyGross, Math.round(result.grossSalary / 12))}
                    step={50}
                    helpText={`Net cost: ${formatCurrency(Math.round(result.effectiveTakeHomeGain / 12))} / month (${formatCurrency(result.employeeContribution)} / year into pension)`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => update("chosenMonthlyGross", result.maxGrossMonthly)}
                      className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Use max budget
                    </button>
                    <button
                      onClick={() => update("chosenMonthlyGross", 0)}
                      className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Reset to £0
                    </button>
                  </div>
                </>
              )}

              {inputs.contributionMode === "netCost" && (
                <>
                  <CurrencyInput
                    id="contribution"
                    label="Monthly Net Cost"
                    value={inputs.chosenMonthlyContribution}
                    onChange={(v) => update("chosenMonthlyContribution", v)}
                    max={sliderMax}
                    step={50}
                    helpText={`${formatCurrency(result.employeeContribution)} / year goes into pension`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        update(
                          "chosenMonthlyContribution",
                          result.maxContributionMonthly
                        )
                      }
                      className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Use max budget
                    </button>
                    <button
                      onClick={() => update("chosenMonthlyContribution", 0)}
                      className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Reset to £0
                    </button>
                  </div>
                </>
              )}

              {contributionExceedsBudget && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Your net cost ({formatCurrency(Math.round(result.effectiveTakeHomeGain / 12))}/mo)
                    exceeds your available budget (
                    {formatCurrency(result.maxContributionMonthly)}/mo). You'd
                    need to reduce spending or savings to afford this.
                  </p>
                </div>
              )}
            </section>

            {/* Student Loans — collapsible */}
            <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 shadow-sm overflow-hidden">
              <button
                onClick={() => setStudentLoanOpen((o) => !o)}
                className="w-full px-5 py-4 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-500" />
                  Student Loans
                </h2>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${studentLoanOpen ? "rotate-180" : ""}`} />
              </button>
              {studentLoanOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                  <div>
                    <label htmlFor="studentLoan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Undergraduate Loan Plan
                    </label>
                    <select
                      id="studentLoan"
                      value={inputs.studentLoanPlan}
                      onChange={(e) => update("studentLoanPlan", e.target.value as StudentLoanPlan)}
                      className={`w-full text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 ${theme.focusRing} transition-colors`}
                    >
                      <option value="none">No student loan</option>
                      <option value="plan1">{TAX_CONFIG.studentLoans.plan1.label}</option>
                      <option value="plan2">{TAX_CONFIG.studentLoans.plan2.label}</option>
                      <option value="plan4">{TAX_CONFIG.studentLoans.plan4.label}</option>
                      <option value="plan5">{TAX_CONFIG.studentLoans.plan5.label}</option>
                    </select>
                    {inputs.studentLoanPlan !== "none" && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        9% above {formatCurrency(TAX_CONFIG.studentLoans[inputs.studentLoanPlan].threshold)} — repaying {formatCurrency(result.studentLoanWithPension)}/yr
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                    <Toggle
                      id="postgradLoan"
                      label="Postgraduate Loan"
                      description="6% above £21,000 — stacks with undergraduate"
                      enabled={inputs.hasPostgradLoan}
                      onChange={(v) => update("hasPostgradLoan", v)}
                    />
                    {inputs.hasPostgradLoan && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 ml-1">
                        Repaying {formatCurrency(result.postgradLoanWithPension)}/yr
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Pension options */}
            <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-500" />
                Pension Options
              </h2>

              <Toggle
                id="sacrifice"
                label="Salary Sacrifice"
                description="Contributions taken before tax & NI"
                enabled={inputs.salarySacrifice}
                onChange={(v) => update("salarySacrifice", v)}
              />

              {inputs.salarySacrifice && (
                <>
                  <Toggle
                    id="empNi"
                    label="Add Employee NI Saving to Pot"
                    description="Redirect your NI savings into pension"
                    enabled={inputs.includeEmployeeNiSaving}
                    onChange={(v) => update("includeEmployeeNiSaving", v)}
                  />
                  <Toggle
                    id="erNi"
                    label="Add Employer NI Saving to Pot"
                    description="Employer redirects their NI savings too"
                    enabled={inputs.includeEmployerNiSaving}
                    onChange={(v) => update("includeEmployerNiSaving", v)}
                  />
                </>
              )}

              <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <Toggle
                  id="match"
                  label="Employer Matching"
                  description="Your employer matches contributions"
                  enabled={inputs.employerMatchEnabled}
                  onChange={(v) => update("employerMatchEnabled", v)}
                />
              </div>

              {inputs.employerMatchEnabled && (
                <div className="space-y-3 pl-1">
                  <Toggle
                    id="matchOnGross"
                    label="Match on Gross Salary"
                    description="Use qualifying earnings (£6,240–£50,270) when off"
                    enabled={inputs.employerMatchOnGross}
                    onChange={(v) => update("employerMatchOnGross", v)}
                  />
                  <CurrencyInput
                    id="matchPct"
                    label="Employer Contribution"
                    value={inputs.employerMatchPercent}
                    onChange={(v) => update("employerMatchPercent", v)}
                    prefix=""
                    suffix="%"
                    max={30}
                    step={1}
                    helpText={`${formatCurrency(result.employerMatchMonthly)} / month (${formatCurrency(result.employerMatch)} / year)`}
                  />
                </div>
              )}
            </section>
          </aside>

          {/* --- RIGHT: Results --- */}
          <div className="lg:col-span-8 space-y-6">
            {/* Headline stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <StatCard
                title="Total Pension Pot"
                subtitle="Everything going in per year"
                yearlyValue={result.totalPensionPot}
                monthlyValue={result.totalPensionPotMonthly}
                highlight
              />
              <StatCard
                title="Your Contribution"
                subtitle={
                  inputs.salarySacrifice
                    ? "Via salary sacrifice"
                    : "From net pay"
                }
                yearlyValue={result.employeeContribution}
                monthlyValue={result.employeeContributionMonthly}
                variant="secondary"
                highlight
              />
              <StatCard
                title="Take-Home After Pension"
                yearlyValue={result.takeHomeWithPension}
                monthlyValue={Math.round(result.takeHomeWithPension / 12)}
              />
            </div>

            {/* Monthly payslip */}
            <PayslipComparison result={result} />

            {/* Savings & Pension overview */}
            <SavingsOverview result={result} />

            {/* Secondary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {inputs.employerMatchEnabled && (
                <StatCard
                  title="Employer Match"
                  yearlyValue={result.employerMatch}
                  monthlyValue={result.employerMatchMonthly}
                />
              )}
              {inputs.salarySacrifice && (
                <>
                  <StatCard
                    title="Employee NI Saved"
                    yearlyValue={result.employeeNiSaving}
                    monthlyValue={result.employeeNiSavingMonthly}
                  />
                  <StatCard
                    title="Employer NI Saved"
                    yearlyValue={result.employerNiSaving}
                    monthlyValue={result.employerNiSavingMonthly}
                  />
                </>
              )}
              <StatCard
                title="Tax Relief"
                yearlyValue={result.taxRelief}
                monthlyValue={Math.round(result.taxRelief / 12)}
              />
              {(result.studentLoanSaving > 0 || result.postgradLoanSaving > 0) && (
                <StatCard
                  title="Student Loan Saved"
                  yearlyValue={result.studentLoanSaving + result.postgradLoanSaving}
                  monthlyValue={Math.round((result.studentLoanSaving + result.postgradLoanSaving) / 12)}
                />
              )}
            </div>

            {/* Effective cost */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Effective Cost per £1 in Pension
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {result.effectivePensionCostPerPound > 0
                      ? `£${result.effectivePensionCostPerPound.toFixed(2)}`
                      : "—"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Every £1 you lose from take-home puts{" "}
                    {result.effectivePensionCostPerPound > 0
                      ? `£${(1 / result.effectivePensionCostPerPound).toFixed(2)}`
                      : "—"}{" "}
                    into your pension
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Take-home reduction
                  </p>
                  <p className="text-lg font-semibold text-rose-500">
                    -{formatCurrency(result.effectiveTakeHomeGain)}
                  </p>
                  <p className="text-xs text-slate-400">
                    -{formatCurrency(Math.round(result.effectiveTakeHomeGain / 12))}{" "}
                    / month
                  </p>
                </div>
              </div>
            </div>

            {/* Salary allocation chart */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Salary Allocation
              </h3>
              <SalaryWaterfallChart result={result} />
            </div>

            {/* Detailed comparison table */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-4 sm:p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Before vs After Pension
              </h3>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">
                        &nbsp;
                      </th>
                      <th className="text-right py-2 px-1 sm:px-2 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        <span className="hidden sm:inline">Without Pension</span>
                        <span className="sm:hidden">Before</span>
                      </th>
                      <th className="text-right py-2 px-1 sm:px-2 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        <span className="hidden sm:inline">With Pension</span>
                        <span className="sm:hidden">After</span>
                      </th>
                      <th className="text-right py-2 px-1 sm:px-2 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        <span className="hidden sm:inline">Difference</span>
                        <span className="sm:hidden">Diff</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 dark:text-slate-300">
                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-2 pr-2">Income Tax</td>
                      <td className="text-right px-1 sm:px-2 tabular-nums">
                        {formatCurrency(result.incomeTaxNoPension)}
                      </td>
                      <td className="text-right px-1 sm:px-2 tabular-nums">
                        {formatCurrency(result.incomeTaxWithPension)}
                      </td>
                      <td className="text-right px-1 sm:px-2 tabular-nums text-emerald-600 dark:text-emerald-400">
                        -{formatCurrency(result.taxRelief)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-2 pr-2">Employee NI</td>
                      <td className="text-right px-1 sm:px-2 tabular-nums">
                        {formatCurrency(result.employeeNiNoPension)}
                      </td>
                      <td className="text-right px-1 sm:px-2 tabular-nums">
                        {formatCurrency(result.employeeNiWithPension)}
                      </td>
                      <td className="text-right px-1 sm:px-2 tabular-nums text-emerald-600 dark:text-emerald-400">
                        -{formatCurrency(result.employeeNiSaving)}
                      </td>
                    </tr>
                    {inputs.studentLoanPlan !== "none" && (
                      <tr className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-2 pr-2">Student Loan</td>
                        <td className="text-right px-1 sm:px-2 tabular-nums">
                          {formatCurrency(result.studentLoanNoPension)}
                        </td>
                        <td className="text-right px-1 sm:px-2 tabular-nums">
                          {formatCurrency(result.studentLoanWithPension)}
                        </td>
                        <td className="text-right px-1 sm:px-2 tabular-nums text-emerald-600 dark:text-emerald-400">
                          -{formatCurrency(result.studentLoanSaving)}
                        </td>
                      </tr>
                    )}
                    {inputs.hasPostgradLoan && (
                      <tr className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-2 pr-2">Postgrad Loan</td>
                        <td className="text-right px-1 sm:px-2 tabular-nums">
                          {formatCurrency(result.postgradLoanNoPension)}
                        </td>
                        <td className="text-right px-1 sm:px-2 tabular-nums">
                          {formatCurrency(result.postgradLoanWithPension)}
                        </td>
                        <td className="text-right px-1 sm:px-2 tabular-nums text-emerald-600 dark:text-emerald-400">
                          -{formatCurrency(result.postgradLoanSaving)}
                        </td>
                      </tr>
                    )}
                    <tr className="font-semibold">
                      <td className="py-2 pr-2">Take-Home</td>
                      <td className="text-right px-1 sm:px-2 tabular-nums">
                        {formatCurrency(result.takeHomeNoPension)}
                      </td>
                      <td className="text-right px-1 sm:px-2 tabular-nums">
                        {formatCurrency(result.takeHomeWithPension)}
                      </td>
                      <td className="text-right px-1 sm:px-2 tabular-nums text-rose-500">
                        -{formatCurrency(result.effectiveTakeHomeGain)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-4">
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Based on UK 2025/26 tax year thresholds. For illustration only — not
          financial advice.
        </p>
      </footer>
    </div>
    </ThemeContext.Provider>
  );
}

export default App;
