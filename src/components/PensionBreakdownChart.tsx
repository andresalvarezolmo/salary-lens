import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "../lib/pension";
import type { PensionResult } from "../lib/pension";

interface Props {
  result: PensionResult;
}

export function PensionBreakdownChart({ result }: Props) {
  const { pensionBreakdown } = result;

  if (pensionBreakdown.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
        <p className="text-sm">Adjust your inputs to see pension breakdown</p>
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pensionBreakdown}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            nameKey="label"
            strokeWidth={0}
          >
            {pensionBreakdown.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              background: "rgba(30, 41, 59, 0.95)",
              border: "none",
              borderRadius: "12px",
              color: "#f1f5f9",
              fontSize: "13px",
              padding: "8px 14px",
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
