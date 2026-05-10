import { useState, useMemo } from "react";
import { calculatePension, formatCurrency } from "./lib/pension";
import type { PensionInputs } from "./lib/pension";
import { CurrencyInput } from "./components/CurrencyInput";
import { Toggle } from "./components/Toggle";
import { StatCard } from "./components/StatCard";
import { PensionBreakdownChart } from "./components/PensionBreakdownChart";
import { SalaryWaterfallChart } from "./components/SalaryWaterfallChart";
import { PiggyBank, TrendingUp, Shield, Building2 } from "lucide-react";

function App() {
  const [inputs, setInputs] = useState<PensionInputs>({
    grossSalary: 0,
    monthlySpending: 2000,
    monthlySavings: 500,
    employerMatchEnabled: false,
    employerMatchPercent: 5,
    employerMatchCapPercent: 5,
    salarySacrifice: true,
    includeEmployeeNiSaving: true,
    includeEmployerNiSaving: false,
  });

  const update = <K extends keyof PensionInputs>(
    key: K,
    value: PensionInputs[K]
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const result = useMemo(() => calculatePension(inputs), [inputs]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <PiggyBank className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Pension Visualiser
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              UK salary sacrifice & pension contribution calculator
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* --- LEFT: Inputs --- */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Income */}
            <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
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
            </section>

            {/* Budget */}
            <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Monthly Budget
              </h2>
              <CurrencyInput
                id="spending"
                label="Monthly Spending"
                value={inputs.monthlySpending}
                onChange={(v) => update("monthlySpending", v)}
                max={15000}
                step={100}
                helpText="Rent, bills, food, transport, etc."
              />
              <CurrencyInput
                id="savings"
                label="Monthly Savings"
                value={inputs.monthlySavings}
                onChange={(v) => update("monthlySavings", v)}
                max={10000}
                step={100}
                helpText="ISA, emergency fund, investments"
              />
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Available for pension
                  </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(result.availableForPension)} / yr
                  </span>
                </div>
              </div>
            </section>

            {/* Pension options */}
            <section className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
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
                  <CurrencyInput
                    id="matchPct"
                    label="Match Rate"
                    value={inputs.employerMatchPercent}
                    onChange={(v) => update("employerMatchPercent", v)}
                    prefix=""
                    suffix="%"
                    max={20}
                    step={1}
                    helpText="% of gross salary employer contributes"
                  />
                  <CurrencyInput
                    id="matchCap"
                    label="Match Cap"
                    value={inputs.employerMatchCapPercent}
                    onChange={(v) => update("employerMatchCapPercent", v)}
                    prefix=""
                    suffix="%"
                    max={20}
                    step={1}
                    helpText="Maximum % of gross salary for match"
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
                color="indigo"
                highlight
              />
              <StatCard
                title="Your Contribution"
                subtitle={
                  inputs.salarySacrifice ? "Via salary sacrifice" : "From net pay"
                }
                yearlyValue={result.employeeContribution}
                monthlyValue={result.employeeContributionMonthly}
                color="purple"
                highlight
              />
              <StatCard
                title="Take-Home After Pension"
                yearlyValue={result.takeHomeWithPension}
                monthlyValue={Math.round(result.takeHomeWithPension / 12)}
              />
            </div>

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
            </div>

            {/* Effective cost */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
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
                    -{formatCurrency(Math.round(result.effectiveTakeHomeGain / 12))} / month
                  </p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Pension Pot Breakdown
                </h3>
                <PensionBreakdownChart result={result} />
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Salary Allocation
                </h3>
                <SalaryWaterfallChart result={result} />
              </div>
            </div>

            {/* Detailed comparison table */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Before vs After Pension
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">
                        &nbsp;
                      </th>
                      <th className="text-right py-2 text-slate-500 dark:text-slate-400 font-medium">
                        Without Pension
                      </th>
                      <th className="text-right py-2 text-slate-500 dark:text-slate-400 font-medium">
                        With Pension
                      </th>
                      <th className="text-right py-2 text-slate-500 dark:text-slate-400 font-medium">
                        Difference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 dark:text-slate-300">
                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-2">Income Tax</td>
                      <td className="text-right">
                        {formatCurrency(result.incomeTaxNoPension)}
                      </td>
                      <td className="text-right">
                        {formatCurrency(result.incomeTaxWithPension)}
                      </td>
                      <td className="text-right text-emerald-600 dark:text-emerald-400">
                        -{formatCurrency(result.taxRelief)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-2">Employee NI</td>
                      <td className="text-right">
                        {formatCurrency(result.employeeNiNoPension)}
                      </td>
                      <td className="text-right">
                        {formatCurrency(result.employeeNiWithPension)}
                      </td>
                      <td className="text-right text-emerald-600 dark:text-emerald-400">
                        -{formatCurrency(result.employeeNiSaving)}
                      </td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="py-2">Take-Home</td>
                      <td className="text-right">
                        {formatCurrency(result.takeHomeNoPension)}
                      </td>
                      <td className="text-right">
                        {formatCurrency(result.takeHomeWithPension)}
                      </td>
                      <td className="text-right text-rose-500">
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
          Based on UK 2024/25 tax year thresholds. For illustration only — not financial advice.
        </p>
      </footer>
    </div>
  );
}

export default App;
