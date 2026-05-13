import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "../lib/pension";
import type { PensionResult } from "../lib/pension";
import { useTheme } from "../lib/theme";

interface Props {
  result: PensionResult;
}

interface ChartEntry {
  label: string;
  value: number;
  color: string;
}

const tooltipStyle = {
  background: "rgba(30, 41, 59, 0.95)",
  border: "none",
  borderRadius: "12px",
  color: "#f1f5f9",
  fontSize: "13px",
  padding: "8px 14px",
};

function ViewToggle({ view, setView }: { view: "monthly" | "yearly"; setView: (v: "monthly" | "yearly") => void }) {
  return (
    <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 shrink-0">
      <button
        onClick={() => setView("monthly")}
        className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
          view === "monthly"
            ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => setView("yearly")}
        className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
          view === "yearly"
            ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        Yearly
      </button>
    </div>
  );
}

function LineItem({ entry, total }: { entry: ChartEntry; total: number }) {
  const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 min-w-0 truncate flex-1">{entry.label}</span>
      <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{formatCurrency(entry.value)}</span>
      <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums w-8 sm:w-10 text-right">{pct}%</span>
    </div>
  );
}

function StackedBar({ items }: { items: ChartEntry[] }) {
  const barData: Record<string, number | string> = { name: "bar" };
  items.forEach((d) => { barData[d.label] = d.value; });
  return (
    <div className="h-10">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[barData]} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), String(name)]} contentStyle={tooltipStyle} />
          {items.map((entry, i) => (
            <Bar
              key={entry.label}
              dataKey={entry.label}
              stackId="s"
              fill={entry.color}
              radius={
                i === 0 && items.length === 1 ? [6, 6, 6, 6]
                  : i === 0 ? [6, 0, 0, 6]
                  : i === items.length - 1 ? [0, 6, 6, 0]
                  : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Donut({ items }: { items: ChartEntry[] }) {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={items} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value" nameKey="label" strokeWidth={0}>
            {items.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── All Savings Card ── */
function AllSavingsCard({ result }: Props) {
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const { savingsComposition, totalSavingsMonthly, totalSavingsYearly } = result;
  const suffix = view === "monthly" ? "/ month" : "/ year";
  const total = view === "monthly" ? totalSavingsMonthly : totalSavingsYearly;
  const items: ChartEntry[] = savingsComposition.map((e) => ({
    label: e.label,
    value: view === "monthly" ? e.monthlyValue : e.yearlyValue,
    color: e.color,
  }));

  if (items.length === 0 || total === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Total Savings & Investments</h3>
        <div className="flex items-center justify-center h-32 text-slate-400 dark:text-slate-500">
          <p className="text-sm">Add savings or pension contributions to see the breakdown</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 pt-5 pb-3 flex items-start justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Total Savings & Investments</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All your savings, ISA, and pension combined</p>
        </div>
        <ViewToggle view={view} setView={setView} />
      </div>
      <div className="px-4 sm:px-6 pb-4">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">
          {formatCurrency(total)}
          <span className="text-base font-normal text-slate-400 dark:text-slate-500 ml-1.5">{suffix}</span>
        </p>
      </div>
      <div className="px-4 sm:px-6 pb-2"><StackedBar items={items} /></div>
      <div className="px-4 sm:px-6 pb-6 flex flex-col sm:grid sm:grid-cols-[140px_1fr] gap-4 items-center">
        <Donut items={items} />
        <div className="space-y-2.5">
          {items.map((entry) => <LineItem key={entry.label} entry={entry} total={total} />)}
        </div>
      </div>
      <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">{view === "monthly" ? "Yearly total" : "Monthly total"}</span>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {formatCurrency(view === "monthly" ? totalSavingsYearly : totalSavingsMonthly)}
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">{view === "monthly" ? "/ year" : "/ month"}</span>
        </span>
      </div>
    </div>
  );
}

/* ── Pension Breakdown Card ── */
function PensionBreakdownCard({ result }: Props) {
  const theme = useTheme();
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const { pensionBreakdown, totalPensionPot, totalPensionPotMonthly } = result;
  const divisor = view === "monthly" ? 12 : 1;
  const total = view === "monthly" ? totalPensionPotMonthly : totalPensionPot;
  const suffix = view === "monthly" ? "/ month" : "/ year";
  const items: ChartEntry[] = pensionBreakdown.map((e) => ({ ...e, value: Math.round(e.value / divisor) }));

  if (items.length === 0 || total === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Pension Pot Breakdown</h3>
        <div className="flex items-center justify-center h-32 text-slate-400 dark:text-slate-500">
          <p className="text-sm">Set a contribution to see the breakdown</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 pt-5 pb-3 flex items-start justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pension Pot Breakdown</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All sources contributing to your pension pot</p>
        </div>
        <ViewToggle view={view} setView={setView} />
      </div>
      <div className="px-4 sm:px-6 pb-4">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">
          {formatCurrency(total)}
          <span className="text-base font-normal text-slate-400 dark:text-slate-500 ml-1.5">{suffix}</span>
        </p>
      </div>
      <div className="px-4 sm:px-6 pb-2"><StackedBar items={items} /></div>
      <div className="px-4 sm:px-6 pb-6 flex flex-col sm:grid sm:grid-cols-[140px_1fr] gap-4 items-center">
        <Donut items={items} />
        <div className="space-y-2.5">
          {items.map((entry) => <LineItem key={entry.label} entry={entry} total={total} />)}
        </div>
      </div>

      {/* Net cost vs pot */}
      {total > 0 && result.effectiveTakeHomeGain > 0 && (
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Your net cost vs what goes in
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Net cost to you {suffix}</p>
              <p className="text-lg font-bold text-rose-500">
                {formatCurrency(view === "monthly" ? Math.round(result.effectiveTakeHomeGain / 12) : result.effectiveTakeHomeGain)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Into pension {suffix}</p>
              <p className={`text-lg font-bold ${theme.accent} ${theme.accentDark}`}>{formatCurrency(total)}</p>
            </div>
          </div>
          <p className={`text-xs ${theme.accent} ${theme.accentDark} mt-2 font-medium`}>
            You sacrifice {formatCurrency(view === "monthly" ? Math.round(result.effectiveTakeHomeGain / 12) : result.effectiveTakeHomeGain)} but {formatCurrency(total)} goes into your pension — a {Math.round(((total / (view === "monthly" ? result.effectiveTakeHomeGain / 12 : result.effectiveTakeHomeGain)) - 1) * 100)}% boost
          </p>

          {/* Contribution breakdown */}
          {result.employeeContribution > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-600/40">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Your contribution breakdown
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">Net cost to you</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(view === "monthly" ? Math.round(result.effectiveTakeHomeGain / 12) : result.effectiveTakeHomeGain)}
                  </span>
                </div>
                {result.taxRelief > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Income tax savings</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(view === "monthly" ? Math.round(result.taxRelief / 12) : result.taxRelief)}
                    </span>
                  </div>
                )}
                {result.employeeNiSaving > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Employee NI savings</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(view === "monthly" ? Math.round(result.employeeNiSaving / 12) : result.employeeNiSaving)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alternate view footer */}
      <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">{view === "monthly" ? "Yearly total" : "Monthly total"}</span>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {formatCurrency(view === "monthly" ? totalPensionPot : totalPensionPotMonthly)}
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">{view === "monthly" ? "/ year" : "/ month"}</span>
        </span>
      </div>
    </div>
  );
}

/* ── Combined export: two cards stacked ── */
export function SavingsOverview({ result }: Props) {
  return (
    <div className="space-y-6">
      <AllSavingsCard result={result} />
      <PensionBreakdownCard result={result} />
    </div>
  );
}
