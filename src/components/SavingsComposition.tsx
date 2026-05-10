import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { formatCurrency } from "../lib/pension";
import type { PensionResult } from "../lib/pension";

interface Props {
  result: PensionResult;
}

export function SavingsComposition({ result }: Props) {
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const { savingsComposition, totalSavingsMonthly, totalSavingsYearly } = result;

  const total = view === "monthly" ? totalSavingsMonthly : totalSavingsYearly;
  const suffix = view === "monthly" ? "/ month" : "/ year";

  const data = savingsComposition.map((entry) => ({
    ...entry,
    value: view === "monthly" ? entry.monthlyValue : entry.yearlyValue,
  }));

  if (data.length === 0 || total === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
          Total Savings & Investments
        </h3>
        <div className="flex items-center justify-center h-32 text-slate-400 dark:text-slate-500">
          <p className="text-sm">Add savings or pension contributions to see the breakdown</p>
        </div>
      </div>
    );
  }

  // Stacked bar data
  const barData: Record<string, number | string> = { name: "Savings" };
  data.forEach((d) => {
    barData[d.label] = d.value;
  });

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Total Savings & Investments
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            All your savings, ISA, and pension combined
          </p>
        </div>
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
      </div>

      {/* Big total */}
      <div className="px-6 pb-4">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">
          {formatCurrency(total)}
          <span className="text-base font-normal text-slate-400 dark:text-slate-500 ml-1.5">
            {suffix}
          </span>
        </p>
      </div>

      {/* Stacked horizontal bar */}
      <div className="px-6 pb-2">
        <div className="h-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[barData]}
              layout="vertical"
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                contentStyle={{
                  background: "rgba(30, 41, 59, 0.95)",
                  border: "none",
                  borderRadius: "12px",
                  color: "#f1f5f9",
                  fontSize: "13px",
                  padding: "8px 14px",
                }}
              />
              {data.map((entry, i) => (
                <Bar
                  key={entry.label}
                  dataKey={entry.label}
                  stackId="savings"
                  fill={entry.color}
                  radius={
                    i === 0 && data.length === 1
                      ? [6, 6, 6, 6]
                      : i === 0
                        ? [6, 0, 0, 6]
                        : i === data.length - 1
                          ? [0, 6, 6, 0]
                          : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut + line items */}
      <div className="px-6 pb-6 grid grid-cols-[140px_1fr] gap-4 items-center">
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                nameKey="label"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2.5">
          {data.map((entry) => {
            const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            return (
              <div key={entry.label} className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400 min-w-0 truncate flex-1">
                  {entry.label}
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                  {formatCurrency(entry.value)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums w-10 text-right">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alternate view totals */}
      <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {view === "monthly" ? "Yearly total" : "Monthly total"}
        </span>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {formatCurrency(view === "monthly" ? totalSavingsYearly : totalSavingsMonthly)}
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">
            {view === "monthly" ? "/ year" : "/ month"}
          </span>
        </span>
      </div>
    </div>
  );
}
