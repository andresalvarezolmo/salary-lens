import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "../lib/pension";
import type { PensionResult } from "../lib/pension";
import { calculateFire } from "../lib/fire";
import type { FireInputs } from "../lib/fire";
import { CurrencyInput } from "./CurrencyInput";
import { useTheme } from "../lib/theme";
import { Flame, Target, TrendingUp, Clock, Shield, AlertTriangle } from "lucide-react";

interface Props {
  result: PensionResult;
}

const tooltipStyle = {
  background: "rgba(30, 41, 59, 0.95)",
  border: "none",
  borderRadius: "12px",
  color: "#f1f5f9",
  fontSize: "13px",
  padding: "8px 14px",
};

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  accent = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
}) {
  const theme = useTheme();
  return (
    <div className={`rounded-2xl p-4 sm:p-5 shadow-sm ${
      accent
        ? `bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} text-white ring-1 ring-white/20`
        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className={`text-xs font-medium uppercase tracking-wider ${
          accent ? "text-white/70" : "text-slate-500 dark:text-slate-400"
        }`}>{title}</p>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${
        accent ? "text-white" : "text-slate-900 dark:text-white"
      }`}>{value}</p>
      {subtitle && (
        <p className={`text-xs mt-1 ${
          accent ? "text-white/60" : "text-slate-400 dark:text-slate-500"
        }`}>{subtitle}</p>
      )}
    </div>
  );
}

export function FireDashboard({ result }: Props) {
  const theme = useTheme();

  // FIRE-specific inputs
  const [currentAge, setCurrentAge] = useState(30);
  const [currentPortfolio, setCurrentPortfolio] = useState(0);
  const [annualReturn, setAnnualReturn] = useState(7);
  const [withdrawalRate, setWithdrawalRate] = useState(4);

  // Derive from main calculator
  const annualSpending = result.totalMonthlySpending * 12;
  const accessibleAnnualSavings = result.totalMonthlySavings * 12;
  const pensionAnnualSavings = result.totalPensionPot;
  const totalAnnualSavings = accessibleAnnualSavings + pensionAnnualSavings;

  const fireInputs: FireInputs = {
    currentAge,
    currentPortfolio,
    annualReturn,
    withdrawalRate,
    annualSpending,
    totalAnnualSavings,
    accessibleAnnualSavings,
    pensionAnnualSavings,
    takeHomePay: result.takeHomeWithPension,
  };

  const fire = useMemo(() => calculateFire(fireInputs), [
    currentAge, currentPortfolio, annualReturn, withdrawalRate,
    annualSpending, totalAnnualSavings, accessibleAnnualSavings,
    pensionAnnualSavings, result.takeHomeWithPension,
  ]);

  const hasData = annualSpending > 0 && totalAnnualSavings > 0;

  return (
    <div className="space-y-6">
      {/* FIRE Inputs */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-orange-500" />
          FIRE Settings
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <CurrencyInput
            id="fireAge"
            label="Current Age"
            value={currentAge}
            onChange={setCurrentAge}
            prefix=""
            max={80}
            step={1}
          />
          <CurrencyInput
            id="firePortfolio"
            label="Current Portfolio"
            value={currentPortfolio}
            onChange={setCurrentPortfolio}
            max={5000000}
            step={5000}
          />
          <CurrencyInput
            id="fireReturn"
            label="Annual Return"
            value={annualReturn}
            onChange={setAnnualReturn}
            prefix=""
            suffix="%"
            max={15}
            step={0.5}
          />
          <CurrencyInput
            id="fireWR"
            label="Withdrawal Rate"
            value={withdrawalRate}
            onChange={setWithdrawalRate}
            prefix=""
            suffix="%"
            max={10}
            step={0.5}
          />
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-8 shadow-sm text-center">
          <Flame className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set your salary, spending, and savings in the sidebar to see your FIRE projections.
          </p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              icon={<Target className="w-4 h-4 text-white/70" />}
              title="FIRE Number"
              value={formatCurrency(fire.fireNumber)}
              subtitle={`${Math.round(1 / (withdrawalRate / 100))}x annual spending`}
              accent
            />
            <MetricCard
              icon={<Clock className="w-4 h-4 text-white/70" />}
              title="Years to FIRE"
              value={fire.alreadyFire ? "Now!" : fire.yearsToFire >= 0 ? `${fire.yearsToFire} yrs` : "Never"}
              subtitle={fire.fireAge > 0 ? `FIRE at age ${fire.fireAge}` : undefined}
              accent
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
              title="Savings Rate"
              value={`${fire.savingsRate}%`}
              subtitle={`${formatCurrency(fire.annualSavings)} / year saved`}
            />
            <MetricCard
              icon={<Shield className="w-4 h-4 text-sky-500 dark:text-sky-400" />}
              title="Coast FIRE"
              value={formatCurrency(fire.coastFireNumber)}
              subtitle={fire.coastFireReached
                ? "Reached — growth alone will get you there"
                : "Needed now to coast to 67"
              }
            />
          </div>

          {/* Projection Chart */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              Portfolio Projection
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Projected growth at {annualReturn}% real return with {formatCurrency(fire.annualSavings)}/yr contributions
            </p>
            <div className="h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fire.projection} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Age", position: "insideBottom", offset: -2, fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Portfolio"]}
                    labelFormatter={(label) => `Age ${label}`}
                    contentStyle={tooltipStyle}
                  />
                  <ReferenceLine
                    y={fire.fireNumber}
                    stroke="#f59e0b"
                    strokeDasharray="6 3"
                    strokeWidth={2}
                    label={{ value: `FIRE: ${formatCurrency(fire.fireNumber)}`, position: "right", fontSize: 11, fill: "#f59e0b" }}
                  />
                  {fire.fireAge > 0 && fire.fireAge <= currentAge + 50 && (
                    <ReferenceLine
                      x={fire.fireAge}
                      stroke="#22c55e"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="portfolio"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#portfolioGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* FIRE Variants */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">FIRE Variants</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Different lifestyle targets based on your spending
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="text-left py-2.5 px-5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Spending</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target</th>
                    <th className="text-right py-2.5 px-5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {fire.variants.map((v) => (
                    <tr key={v.label} className={v.spendingMultiplier === 1 ? "bg-slate-50/30 dark:bg-slate-700/20" : ""}>
                      <td className="py-3 px-5">
                        <p className={`font-medium ${v.spendingMultiplier === 1 ? `${theme.accent} ${theme.accentDark}` : "text-slate-700 dark:text-slate-300"}`}>
                          {v.label}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{v.description}</p>
                      </td>
                      <td className="text-right px-4 text-slate-600 dark:text-slate-400 tabular-nums">
                        {formatCurrency(Math.round(annualSpending * v.spendingMultiplier))}/yr
                      </td>
                      <td className="text-right px-4 font-semibold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(v.fireNumber)}
                      </td>
                      <td className="text-right px-5 tabular-nums">
                        {v.yearsToFire === 0 ? (
                          <span className="text-emerald-500 font-semibold">Reached!</span>
                        ) : v.yearsToFire > 0 ? (
                          <span className="text-slate-700 dark:text-slate-300">
                            {v.yearsToFire} yrs <span className="text-slate-400 dark:text-slate-500">(age {v.fireAge})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pension Bridge */}
          {fire.needsPensionBridge && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Pension Bridge Needed
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    You'd reach FIRE at age {fire.fireAge}, but can't access your pension until age {fire.pensionAccessAge}.
                    You'll need <span className="font-semibold">{formatCurrency(fire.prePensionNeeded)}</span> in
                    accessible accounts (ISA, GIA) to cover <span className="font-semibold">{fire.prePensionYears} years</span> of
                    spending before your pension unlocks.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white/60 dark:bg-slate-800/60 px-3 py-2">
                      <p className="text-xs text-amber-600 dark:text-amber-400/70">Your accessible savings</p>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        {formatCurrency(accessibleAnnualSavings)}/yr
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/60 dark:bg-slate-800/60 px-3 py-2">
                      <p className="text-xs text-amber-600 dark:text-amber-400/70">Locked in pension</p>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        {formatCurrency(pensionAnnualSavings)}/yr
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Savings Breakdown */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Your Numbers</h3>
            <div className="space-y-2">
              {[
                { label: "Annual take-home pay", value: result.takeHomeWithPension },
                { label: "Annual spending", value: annualSpending },
                { label: "Annual savings (accessible)", value: accessibleAnnualSavings },
                { label: "Annual pension contributions", value: pensionAnnualSavings },
                { label: "Total saved per year", value: fire.annualSavings },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-1.5">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{row.label}</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
