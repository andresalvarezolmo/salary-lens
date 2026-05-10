import { formatCurrency } from "../lib/pension";

interface StatCardProps {
  title: string;
  yearlyValue: number;
  monthlyValue: number;
  color?: string;
  highlight?: boolean;
  subtitle?: string;
}

export function StatCard({
  title,
  yearlyValue,
  monthlyValue,
  color = "indigo",
  highlight = false,
  subtitle,
}: StatCardProps) {
  const colorMap: Record<string, string> = {
    indigo: "from-indigo-500 to-indigo-600",
    green: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    cyan: "from-cyan-500 to-cyan-600",
    purple: "from-purple-500 to-purple-600",
  };

  if (highlight) {
    return (
      <div
        className={`rounded-2xl bg-gradient-to-br ${
          colorMap[color] || colorMap.indigo
        } p-5 text-white shadow-lg`}
      >
        <p className="text-sm font-medium text-white/80">{title}</p>
        {subtitle && (
          <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>
        )}
        <p className="text-3xl font-bold mt-2">{formatCurrency(yearlyValue)}</p>
        <p className="text-sm text-white/70 mt-1">
          {formatCurrency(monthlyValue)} / month
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {subtitle}
        </p>
      )}
      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
        {formatCurrency(yearlyValue)}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        {formatCurrency(monthlyValue)} / month
      </p>
    </div>
  );
}
