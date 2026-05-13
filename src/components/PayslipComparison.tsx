import { formatCurrency } from "../lib/pension";
import type { PensionResult } from "../lib/pension";
import { ArrowRight } from "lucide-react";
import { useTheme } from "../lib/theme";

interface Props {
  result: PensionResult;
}

function SignedAmount({ value, muted = false }: { value: number; muted?: boolean }) {
  const formatted = formatCurrency(Math.abs(value));
  const display = value < 0 ? `- ${formatted}` : formatted;

  if (muted) {
    return <span className="text-slate-400 dark:text-slate-500">{display}</span>;
  }
  return <span>{display}</span>;
}

function DiffBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center text-xs text-slate-400 dark:text-slate-500">
        —
      </span>
    );
  }

  const isPositive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full ${
        isPositive
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
      }`}
    >
      {isPositive ? "+" : "-"} {formatCurrency(Math.abs(value))}
    </span>
  );
}

export function PayslipComparison({ result }: Props) {
  const theme = useTheme();
  const { payslip } = result;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Monthly Payslip Comparison
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          How your monthly pay changes with pension contributions
        </p>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 sm:gap-x-4 px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <div>&nbsp;</div>
        <div className="w-16 sm:w-24 text-right">Before</div>
        {/* Arrow spacer — hidden on mobile */}
        <div className="hidden sm:block w-6 text-center">&nbsp;</div>
        <div className="w-16 sm:w-24 text-right">After</div>
        <div className="hidden sm:block w-24 text-right">Change</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {payslip.map((line, i) => {
          const isTotal = line.type === "total";
          return (
            <div key={i}>
              {/* Main row */}
              <div
                className={`grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 sm:gap-x-4 px-4 sm:px-5 py-3 items-center ${
                  isTotal
                    ? "bg-slate-50 dark:bg-slate-700/30 font-semibold"
                    : ""
                }`}
              >
                <div
                  className={`text-sm ${
                    isTotal
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {line.label}
                </div>
                <div
                  className={`w-16 sm:w-24 text-right text-sm tabular-nums ${
                    isTotal
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <SignedAmount value={line.before} muted={line.before === 0 && !isTotal} />
                </div>
                {/* Arrow — hidden on mobile */}
                <div className="hidden sm:flex w-6 justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                </div>
                <div
                  className={`w-16 sm:w-24 text-right text-sm tabular-nums ${
                    isTotal
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <SignedAmount value={line.after} />
                </div>
                {/* Change badge — hidden on mobile, shown inline on desktop */}
                <div className="hidden sm:flex w-24 justify-end">
                  <DiffBadge value={line.diff} />
                </div>
              </div>
              {/* Change badge — shown below the row on mobile only */}
              {line.diff !== 0 && (
                <div className="sm:hidden px-4 pb-2 -mt-1 flex justify-end">
                  <DiffBadge value={line.diff} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pension pot footer */}
      <div className={`px-4 sm:px-5 py-4 border-t border-slate-200 dark:border-slate-700 ${theme.accentBgLight} ${theme.accentBgLightDark}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${theme.accentText} ${theme.accentTextDark}`}>
              Total into Pension Pot
            </p>
            <p className={`text-xs ${theme.accentTextMuted} ${theme.accentTextMutedDark} mt-0.5`}>
              Including employer match & NI savings
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-lg font-bold ${theme.accent} ${theme.accentDark}`}>
              {formatCurrency(result.totalPensionPotMonthly)}
              <span className={`text-sm font-normal ${theme.accentTextMuted} ${theme.accentTextMutedDark}`}>
                {" "}/ mo
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
