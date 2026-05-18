import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceDot,
} from "recharts";
import { calculatePension, formatCurrency, TAX_CONFIG } from "../lib/pension";
import type { PensionInputs, PensionResult } from "../lib/pension";

interface Props {
  inputs: PensionInputs;
  result: PensionResult;
}

interface EfficiencyPoint {
  grossMonthly: number;
  netCostMonthly: number;
  totalPotMonthly: number;
  freeMoneyMonthly: number;
  costPerPound: number;
  marginalCost: number;
  isCurrentPoint?: boolean;
}

const STEPS = 80;

const tooltipStyle = {
  background: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(148, 163, 184, 0.15)",
  borderRadius: "12px",
  color: "#f1f5f9",
  fontSize: "13px",
  padding: "10px 14px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
};

export function PensionEfficiencyChart({ inputs, result }: Props) {
  const [viewMode, setViewMode] = useState<"breakdown" | "efficiency">("breakdown");

  const { data, currentPoint, currentPointData } = useMemo(() => {
    const maxGross = Math.max(
      result.maxGrossMonthly * 1.1,
      result.employeeContributionMonthly * 1.5,
      Math.round(result.grossSalary / 12 * 0.4)
    );
    const step = Math.max(Math.round(maxGross / STEPS), 10);
    const rawPoints: Omit<EfficiencyPoint, "marginalCost">[] = [];

    for (let g = 0; g <= maxGross + step; g += step) {
      const testInputs: PensionInputs = {
        ...inputs,
        contributionMode: "gross",
        chosenMonthlyGross: g,
      };
      const r = calculatePension(testInputs);
      const netCost = Math.round(r.effectiveTakeHomeGain / 12);
      const totalPot = r.totalPensionPotMonthly;
      const freeMoney = Math.max(0, totalPot - netCost);

      rawPoints.push({
        grossMonthly: g,
        netCostMonthly: netCost,
        totalPotMonthly: totalPot,
        freeMoneyMonthly: freeMoney,
        costPerPound: r.effectivePensionCostPerPound,
      });
    }

    // Inject the user's actual current contribution as a data point
    const currentGross = result.employeeContributionMonthly;
    if (currentGross > 0 && !rawPoints.some(p => p.grossMonthly === currentGross)) {
      const testInputs: PensionInputs = {
        ...inputs,
        contributionMode: "gross",
        chosenMonthlyGross: currentGross,
      };
      const r = calculatePension(testInputs);
      const netCost = Math.round(r.effectiveTakeHomeGain / 12);
      const totalPot = r.totalPensionPotMonthly;
      const freeMoney = Math.max(0, totalPot - netCost);
      rawPoints.push({
        grossMonthly: currentGross,
        netCostMonthly: netCost,
        totalPotMonthly: totalPot,
        freeMoneyMonthly: freeMoney,
        costPerPound: r.effectivePensionCostPerPound,
      });
      rawPoints.sort((a, b) => a.grossMonthly - b.grossMonthly);
    }

    // Compute smoothed marginal cost
    const rawMarginals = rawPoints.map((pt, i) => {
      if (i === 0) return pt.costPerPound;
      const prev = rawPoints[i - 1];
      const deltaPot = pt.totalPotMonthly - prev.totalPotMonthly;
      const deltaNet = pt.netCostMonthly - prev.netCostMonthly;
      return deltaPot > 0 ? deltaNet / deltaPot : 1;
    });

    const smoothed = rawMarginals.map((val, i) => {
      if (i === 0 || i === rawMarginals.length - 1) return val;
      return (rawMarginals[i - 1] + val + rawMarginals[i + 1]) / 3;
    });

    const points: EfficiencyPoint[] = rawPoints.map((pt, i) => {
      const minGross = Math.max(step * 2, 50);
      const marginalCost = pt.grossMonthly < minGross ? pt.costPerPound : smoothed[i];
      return {
        ...pt,
        marginalCost: Math.max(0, Math.min(marginalCost, 1.15)),
        isCurrentPoint: pt.grossMonthly === currentGross,
      };
    });

    const cpd = points.find(p => p.isCurrentPoint) ?? null;
    return { data: points, currentPoint: currentGross, currentPointData: cpd };
  }, [
    inputs.grossSalary,
    inputs.salarySacrifice,
    inputs.employerMatchEnabled,
    inputs.employerMatchPercent,
    inputs.employerMatchOnGross,
    inputs.includeEmployeeNiSaving,
    inputs.includeEmployerNiSaving,
    inputs.scottishTax,
    inputs.studentLoanPlan,
    inputs.hasPostgradLoan,
    inputs.taxCode,
    inputs.spendingCategories,
    inputs.savingsCategories,
    result.maxGrossMonthly,
    result.employeeContributionMonthly,
    result.grossSalary,
  ]);

  // Compute tax band boundaries as contribution ranges
  const taxBandBoundaries = useMemo(() => {
    const gross = result.grossSalary;
    const isScottish = result.effectiveScottish;
    const isSS = inputs.salarySacrifice;
    const maxChart = data[data.length - 1]?.grossMonthly ?? 0;
    if (maxChart === 0) return [];

    interface BandZone {
      from: number;
      to: number;
      label: string;
      taxRate: number;
      niRate: number;
      color: string;
    }

    const zones: BandZone[] = [];

    // NI saving rate depends on whether contribution is in the NI band
    const getNiRate = (monthlyContrib: number) => {
      if (!isSS) return 0;
      const niUelContrib = gross > TAX_CONFIG.niUpperEarningsLimit
        ? Math.round((gross - TAX_CONFIG.niUpperEarningsLimit) / 12)
        : 0;
      return monthlyContrib < niUelContrib ? 0.02 : 0.08;
    };

    const palette = {
      additional: "#14b8a6",
      taper:      "#10b981",
      higher:     "#06b6d4",
      intermediate: "#818cf8",
      basic:      "#f59e0b",
      starter:    "#94a3b8",
    };

    if (!isScottish) {
      // Build thresholds from top of salary downward (first £ contributed saves at highest rate)
      const thresholds: { limit: number; label: string; key: keyof typeof palette; taxRate: number }[] = [];

      if (gross > TAX_CONFIG.higherRateLimit) {
        thresholds.push({ limit: TAX_CONFIG.higherRateLimit, label: "Additional (45%)", key: "additional", taxRate: 0.45 });
      }
      if (gross > TAX_CONFIG.personalAllowanceTaperStart) {
        thresholds.push({ limit: TAX_CONFIG.personalAllowanceTaperStart, label: "PA taper (60%)", key: "taper", taxRate: 0.60 });
      }
      if (gross > TAX_CONFIG.basicRateLimit) {
        thresholds.push({ limit: TAX_CONFIG.basicRateLimit, label: "Higher (40%)", key: "higher", taxRate: 0.40 });
      }
      thresholds.push({ limit: TAX_CONFIG.personalAllowance, label: "Basic (20%)", key: "basic", taxRate: 0.20 });

      // Sort descending by limit (highest salary threshold = lowest contribution)
      thresholds.sort((a, b) => b.limit - a.limit);

      let contrib = 0;
      for (const t of thresholds) {
        const bandEnd = Math.round((gross - t.limit) / 12);
        if (bandEnd <= contrib) continue;
        const clampedEnd = Math.min(bandEnd, maxChart);
        if (contrib >= maxChart) break;

        const mid = (contrib + clampedEnd) / 2;
        const niRate = getNiRate(mid);

        zones.push({
          from: contrib,
          to: clampedEnd,
          label: t.label,
          taxRate: t.taxRate,
          niRate,
          color: palette[t.key],
        });

        contrib = clampedEnd;
      }
    } else {
      // Scottish bands — from highest rate down
      const relevantBands = TAX_CONFIG.scottishBands
        .filter(b => gross > b.from)
        .reverse();

      let contrib = 0;
      for (const band of relevantBands) {
        const bandTop = band.to === Infinity ? gross : Math.min(band.to, gross);
        const bandWidth = Math.round((bandTop - band.from) / 12);
        if (bandWidth <= 0) continue;

        const bandEnd = contrib + bandWidth;
        const clampedEnd = Math.min(bandEnd, maxChart);
        if (contrib >= maxChart) break;

        const mid = (contrib + clampedEnd) / 2;
        const niRate = getNiRate(mid);
        const key: keyof typeof palette = band.rate >= 0.42 ? "higher" : band.rate >= 0.21 ? "intermediate" : "starter";

        zones.push({
          from: contrib,
          to: clampedEnd,
          label: `${band.name} (${Math.round(band.rate * 100)}%)`,
          taxRate: band.rate,
          niRate,
          color: palette[key],
        });

        contrib = clampedEnd;
      }
    }

    return zones;
  }, [result.grossSalary, result.effectiveScottish, inputs.salarySacrifice, data]);

  const costPerPound = result.effectivePensionCostPerPound;
  const multiplier = costPerPound > 0 ? (1 / costPerPound) : 0;

  // Custom tooltip for breakdown view
  const breakdownTooltip = useCallback(({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: number }) => {
    if (!active || !payload?.length || label === undefined) return null;
    const netCost = payload.find(p => p.name === "Your Net Cost")?.value ?? 0;
    const freeMoney = payload.find(p => p.name === "Free Money")?.value ?? 0;
    const total = netCost + freeMoney;
    const freePercent = total > 0 ? Math.round((freeMoney / total) * 100) : 0;
    const point = data.find(d => d.grossMonthly === label);
    const band = taxBandBoundaries.find(z => (label ?? 0) >= z.from && (label ?? 0) < z.to);

    return (
      <div style={tooltipStyle}>
        <p className="font-medium mb-1.5" style={{ color: "#e2e8f0" }}>
          £{label}/mo gross contribution
        </p>
        <div className="space-y-1">
          <p><span style={{ color: "#f43f5e" }}>■</span> Net cost: <span className="font-medium">{formatCurrency(netCost)}/mo</span></p>
          <p><span style={{ color: "#22c55e" }}>■</span> Free money: <span className="font-medium">{formatCurrency(freeMoney)}/mo</span> ({freePercent}%)</p>
          <p><span style={{ color: "#94a3b8" }}>■</span> Total pot: <span className="font-medium">{formatCurrency(total)}/mo</span></p>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-600">
          {band && (
            <p className="text-xs">
              Tax band: <span style={{ color: band.color }} className="font-medium">{band.label}</span>
              {band.niRate > 0 && <span className="text-slate-400"> + NI {Math.round(band.niRate * 100)}%</span>}
            </p>
          )}
          {point && point.costPerPound > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              Effective cost: £{point.costPerPound.toFixed(2)} per £1 in pension
            </p>
          )}
        </div>
      </div>
    );
  }, [data, taxBandBoundaries]);

  // Custom tooltip for efficiency view
  const efficiencyTooltip = useCallback(({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; dataKey: string }>; label?: number }) => {
    if (!active || !payload?.length || label === undefined) return null;
    const avg = payload.find(p => p.dataKey === "costPerPound")?.value ?? 0;
    const marginal = payload.find(p => p.dataKey === "marginalCost")?.value ?? 0;
    const band = taxBandBoundaries.find(z => (label ?? 0) >= z.from && (label ?? 0) < z.to);

    return (
      <div style={tooltipStyle}>
        <p className="font-medium mb-1.5" style={{ color: "#e2e8f0" }}>
          £{label}/mo gross contribution
        </p>
        <div className="space-y-1">
          <p><span style={{ color: "#6366f1" }}>━</span> Average cost: <span className="font-medium">£{avg.toFixed(2)}</span> per £1</p>
          <p><span style={{ color: "#f59e0b" }}>━</span> Marginal cost: <span className="font-medium">£{marginal.toFixed(2)}</span> per £1</p>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-600">
          {band && (
            <p className="text-xs mb-0.5">
              Tax band: <span style={{ color: band.color }} className="font-medium">{band.label}</span>
              {band.niRate > 0 && <span className="text-slate-400"> + NI {Math.round(band.niRate * 100)}%</span>}
            </p>
          )}
          <p className="text-xs text-slate-400">
            {marginal < avg
              ? <span style={{ color: "#10b981" }}>↑ Next £1 costs less than average — still efficient</span>
              : <span style={{ color: "#f59e0b" }}>↓ Next £1 costs more than average — diminishing returns</span>
            }
          </p>
        </div>
      </div>
    );
  }, [taxBandBoundaries]);

  // Measure the chart plot area to align the band bar
  const chartRef = useRef<HTMLDivElement>(null);
  const [plotArea, setPlotArea] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = chartRef.current;
      if (!el) return;
      // Recharts renders the plot background as .recharts-cartesian-grid
      const grid = el.querySelector(".recharts-cartesian-grid");
      if (!grid) return;
      const containerRect = el.getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      setPlotArea({
        left: gridRect.left - containerRect.left,
        width: gridRect.width,
      });
    };
    // Measure after Recharts renders
    const timer = setTimeout(measure, 50);
    const observer = new ResizeObserver(measure);
    if (chartRef.current) observer.observe(chartRef.current);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [viewMode, data]);

  // Compute band bar segment widths as percentages of chart width
  const bandBarSegments = useMemo(() => {
    if (taxBandBoundaries.length === 0 || data.length === 0) return [];
    const maxX = data[data.length - 1]?.grossMonthly ?? 0;
    if (maxX === 0) return [];
    return taxBandBoundaries.map(z => ({
      ...z,
      widthPct: ((z.to - z.from) / maxX) * 100,
    }));
  }, [taxBandBoundaries, data]);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:ring-1 dark:ring-white/5 p-5 shadow-sm">
      {/* Header with metrics + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Pension Efficiency
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                How your contribution translates into pension value
              </p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 shrink-0 ml-3">
              <button
                onClick={() => setViewMode("breakdown")}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === "breakdown"
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Breakdown
              </button>
              <button
                onClick={() => setViewMode("efficiency")}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === "efficiency"
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Cost per £1
              </button>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your net cost</p>
              <p className="text-lg font-bold text-rose-500 tabular-nums">
                -{formatCurrency(Math.round(result.effectiveTakeHomeGain / 12))}
                <span className="text-xs font-normal text-slate-400"> /mo</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total into pension</p>
              <p className="text-lg font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">
                {formatCurrency(result.totalPensionPotMonthly)}
                <span className="text-xs font-normal text-slate-400"> /mo</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cost per £1 in pension</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                {costPerPound > 0 ? `£${costPerPound.toFixed(2)}` : "—"}
              </p>
              {multiplier > 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  £1 net cost → £{multiplier.toFixed(2)} in pension
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tax band bar — aligned to the chart plot area */}
      {bandBarSegments.length > 0 && plotArea && (
        <div
          className="flex mb-1 h-5"
          style={{ marginLeft: plotArea.left, width: plotArea.width }}
        >
          {bandBarSegments.map((z, i) => (
            <div
              key={i}
              className="flex items-center justify-center overflow-hidden border-r last:border-r-0"
              style={{
                width: `${z.widthPct}%`,
                backgroundColor: `${z.color}18`,
                borderColor: `${z.color}40`,
                borderRadius: i === 0 ? "4px 0 0 4px" : i === bandBarSegments.length - 1 ? "0 4px 4px 0" : 0,
              }}
            >
              <span
                className="text-[9px] sm:text-[10px] font-semibold truncate px-1"
                style={{ color: z.color }}
              >
                {z.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="h-64 sm:h-72" ref={chartRef}>
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "breakdown" ? (
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="netCostGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="freeMoneyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
              {/* Dashed boundary lines between bands */}
              {taxBandBoundaries.map((z, i) => (
                i > 0 ? (
                  <ReferenceLine
                    key={`bl-${i}`}
                    x={z.from}
                    stroke={z.color}
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    strokeOpacity={0.4}
                  />
                ) : null
              ))}
              <XAxis
                dataKey="grossMonthly"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `£${v}`}
                label={{ value: "Monthly gross contribution", position: "insideBottom", offset: -2, fontSize: 11, fill: "#94a3b8" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `£${v}`}
                label={{ value: "Monthly amount (£)", position: "insideLeft", angle: -90, fontSize: 11, fill: "#94a3b8", offset: -5, style: { textAnchor: "middle" } }}
              />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip content={breakdownTooltip as any} />
              {currentPoint > 0 && (
                <ReferenceLine
                  x={currentPoint}
                  stroke="#6366f1"
                  strokeDasharray="4 3"
                  strokeWidth={2}
                />
              )}
              <Area
                type="monotone"
                dataKey="netCostMonthly"
                name="Your Net Cost"
                stackId="1"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="url(#netCostGrad)"
              />
              <Area
                type="monotone"
                dataKey="freeMoneyMonthly"
                name="Free Money"
                stackId="1"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#freeMoneyGrad)"
              />
              {/* "You" dots */}
              {currentPointData && (
                <>
                  <ReferenceDot
                    x={currentPoint}
                    y={currentPointData.netCostMonthly}
                    r={5}
                    fill="#6366f1"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                  <ReferenceDot
                    x={currentPoint}
                    y={currentPointData.totalPotMonthly}
                    r={5}
                    fill="#6366f1"
                    stroke="#fff"
                    strokeWidth={2}
                    label={{ value: `You: ${formatCurrency(currentPointData.totalPotMonthly)}/mo`, position: "top", fontSize: 10, fill: "#6366f1", offset: 8 }}
                  />
                </>
              )}
            </AreaChart>
          ) : (
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="costPerPoundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
              {/* Dashed boundary lines */}
              {taxBandBoundaries.map((z, i) => (
                i > 0 ? (
                  <ReferenceLine
                    key={`bl2-${i}`}
                    x={z.from}
                    stroke={z.color}
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    strokeOpacity={0.4}
                  />
                ) : null
              ))}
              <XAxis
                dataKey="grossMonthly"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `£${v}`}
                label={{ value: "Monthly gross contribution", position: "insideBottom", offset: -2, fontSize: 11, fill: "#94a3b8" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `£${v.toFixed(2)}`}
                domain={[0, (max: number) => Math.min(Math.max(max * 1.1, 1.05), 1.3)]}
                label={{ value: "Cost per £1 in pension", position: "insideLeft", angle: -90, fontSize: 11, fill: "#94a3b8", offset: -5, style: { textAnchor: "middle" } }}
              />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip content={efficiencyTooltip as any} />
              {currentPoint > 0 && (
                <ReferenceLine
                  x={currentPoint}
                  stroke="#6366f1"
                  strokeDasharray="4 3"
                  strokeWidth={2}
                />
              )}
              <ReferenceLine
                y={1}
                stroke="#f43f5e"
                strokeDasharray="6 3"
                strokeWidth={1}
                label={{ value: "£1 = no benefit", position: "insideTopRight", fontSize: 9, fill: "#f43f5e", offset: 5 }}
              />
              <Area
                type="monotone"
                dataKey="costPerPound"
                name="Average Cost"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#costPerPoundGrad)"
              />
              <Line
                type="monotone"
                dataKey="marginalCost"
                name="Marginal Cost"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="6 3"
                strokeOpacity={0.8}
              />
              {/* "You" dot */}
              {currentPointData && currentPointData.costPerPound > 0 && (
                <ReferenceDot
                  x={currentPoint}
                  y={currentPointData.costPerPound}
                  r={5}
                  fill="#6366f1"
                  stroke="#fff"
                  strokeWidth={2}
                  label={{ value: `You: £${currentPointData.costPerPound.toFixed(2)}`, position: "top", fontSize: 10, fill: "#6366f1", offset: 8 }}
                />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Explanation */}
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
        {viewMode === "breakdown"
          ? "The bar above shows which income tax band each contribution range reduces. Dashed lines mark where bands change. Green area is \"free money\" — tax relief, NI savings, and employer contributions."
          : "The bar above shows tax bands. Notice how the cost per £1 steps up at each dashed line as you move into lower-rate bands. Purple = your average cost; amber = marginal cost of the next £1."
        }
        {inputs.salarySacrifice ? " NI savings included via salary sacrifice." : ""}
      </p>
    </div>
  );
}
