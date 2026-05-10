import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "../lib/pension";
import type { PensionResult } from "../lib/pension";

interface Props {
  result: PensionResult;
}

export function SalaryWaterfallChart({ result }: Props) {
  const data = [
    {
      name: "Gross Salary",
      value: result.grossSalary,
      color: "#6366f1",
    },
    {
      name: "Income Tax",
      value: result.incomeTaxWithPension,
      color: "#ef4444",
    },
    {
      name: "Employee NI",
      value: result.employeeNiWithPension,
      color: "#f97316",
    },
    {
      name: "Pension",
      value: result.employeeContribution,
      color: "#8b5cf6",
    },
    {
      name: "Budget",
      value: result.annualBudget,
      color: "#ec4899",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
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
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
