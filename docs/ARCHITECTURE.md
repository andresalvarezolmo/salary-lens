# Architecture

This document describes the codebase structure, data flow, and key design decisions for the Salary Lens app.

---

## Data Flow

```
PensionInputs (state in App.tsx)
        |
        v
calculatePension(inputs)   <-- src/lib/pension.ts
        |
        v
PensionResult
        |
        +---> StatCard (headline numbers)
        +---> PayslipComparison (before/after payslip)
        +---> PensionBreakdownChart (pension pot sources)
        +---> SalaryWaterfallChart (salary allocation)
        +---> SavingsComposition (ISA + pension combined)
        +---> FireDashboard (FIRE planner tab)
                    |
                    v
              calculateFire(fireInputs)   <-- src/lib/fire.ts
                    |
                    v
              FireResult
                    |
                    +---> MetricCard (FIRE number, years, savings rate, Coast FIRE)
                    +---> AreaChart (portfolio projection)
                    +---> FIRE Variants table (Lean/Regular/Fat)
                    +---> Pension Bridge warning
```

All state lives in `App.tsx` as a single `PensionInputs` object. The `calculatePension()` function is pure -- it takes inputs and returns a complete `PensionResult` with every derived value the UI needs. This is called inside `useMemo` so results are recomputed only when inputs change.

No component calls `calculatePension()` directly. Each component receives the relevant slice of `PensionResult` as props.

The FIRE planner tab derives its inputs from `PensionResult` (spending, savings, take-home pay) combined with FIRE-specific local state (age, portfolio, return rate, withdrawal rate). The `calculateFire()` function is also pure and called inside `useMemo`.

---

## Key Files

### `src/lib/pension.ts` -- Calculation Engine

This is the most important file in the project. It contains:

- **`TAX_CONFIG`** -- All tax/NI thresholds and rates for the current tax year. To update for a new tax year, edit this object only.
- **`PensionInputs`** interface -- Everything the user can configure.
- **`PensionResult`** interface -- Everything the UI needs to render.
- **`calculatePension()`** -- The main function. ~330 lines. Computes tax, NI, pension contributions, employer match, NI savings, payslip lines, chart data, and max budget values.
- **`netCostToGrossContribution()`** -- Binary search that converts a desired net cost (take-home reduction) into the gross salary sacrifice that produces that exact net cost. Needed because tax/NI bands make this relationship non-linear.
- **`calculateStudentLoan()`** -- Calculates undergraduate student loan repayment for a given plan (Plan 1/2/4/5). 9% of earnings above the plan-specific threshold.
- **`calculatePostgradLoan()`** -- Calculates postgraduate loan repayment. 6% of earnings above £21,000. Stacks independently with undergraduate loans.
- **`parseTaxCode()`** -- Parses a UK PAYE tax code string into a `ParsedTaxCode` object. Handles standard codes, K codes, flat-rate codes (BR/D0/D1), NT, 0T, and S/C prefixes.
- **`computeIncomeTax()`** -- Wrapper that routes income tax calculation through the parsed tax code (flat rate, K code, fixed allowance, or no-tax), falling back to standard calculation when no code is provided.
- **Helper functions** -- `calculateIncomeTaxRUK()`, `calculateIncomeTaxScottish()`, `calculateEmployeeNi()`, `calculateEmployerNi()`, `getPersonalAllowance()`.

### `src/lib/fire.ts` -- FIRE Calculation Engine

Implements the Financial Independence, Retire Early (FIRE) calculations:

- **`FireInputs`** interface -- Age, portfolio, return rate, withdrawal rate, and derived spending/savings from the main calculator.
- **`FireResult`** interface -- FIRE number, savings rate, years to FIRE, variants, Coast FIRE, projection, and pension bridge analysis.
- **`yearsToTarget()`** -- Compound interest solver: given current portfolio, annual contributions, and return rate, calculates years to reach a target value using `n = ln((F + C/r) / (P + C/r)) / ln(1+r)`.
- **`calculateFire()`** -- Main function computing all FIRE metrics:
  - **FIRE number**: `annualSpending / withdrawalRate` (default 4% rule → 25× spending)
  - **FIRE variants**: Lean (80%), Regular (100%), Fat (150%) of current spending
  - **Coast FIRE**: portfolio needed now so compound growth alone reaches FIRE by state retirement age (67)
  - **Pension bridge**: years and amount needed in accessible (non-pension) accounts to cover spending between FIRE age and pension access age (57)
  - **Projection**: year-by-year portfolio growth for charting

### `src/App.tsx` -- State and Layout

Owns the `PensionInputs` state and renders the two-column layout:
- **Left column**: Input controls (salary, spending, savings, contribution, pension options)
- **Right column**: Result visualisations (stats, charts, payslip)

Contains helpers for CRUD operations on dynamic budget categories (`updateSpending`, `addSpending`, `removeSpending`, etc.).

The contribution mode toggle (`percentage` / `netCost`) includes logic to sync equivalent values when switching -- e.g. converting a 5% contribution to the equivalent monthly net cost.

### `src/components/` -- UI Components

All components are presentational. They receive props and render. No component manages significant state beyond local UI state (e.g. monthly/yearly toggle in charts).

| Component | Purpose |
|-----------|---------|
| `BudgetCategoryList` | Renders editable category rows with add/remove. Built-in categories (ISA) cannot be removed. |
| `CurrencyInput` | Text input with currency prefix, optional suffix, and optional range slider. |
| `Toggle` | Switch with label and description text. |
| `StatCard` | Displays a yearly value with monthly subtitle. Optional colour highlight. |
| `PayslipComparison` | Side-by-side monthly payslip table (before/after pension). Shows diff badges. |
| `PensionBreakdownChart` | "What's Going Into Your Pension" card. Stacked horizontal bar, donut chart, line items, net cost vs pot comparison, and contribution breakdown (net cost + tax savings + NI savings). Monthly/yearly toggle. |
| `SalaryWaterfallChart` | Bar chart showing gross salary allocation across tax, NI, pension, and budget. |
| `SavingsComposition` | "Total Savings & Investments" card combining ISA/savings categories with pension total. Stacked bar, donut, line items. Monthly/yearly toggle. |
| `FireDashboard` | FIRE planner tab. Owns FIRE-specific inputs (age, portfolio, return, withdrawal rate). Derives spending/savings from `PensionResult`. Renders key metrics, projection chart, variants table, pension bridge warning, and numbers summary. |

---

## PensionInputs

```typescript
interface PensionInputs {
  grossSalary: number;                    // Annual gross salary
  spendingCategories: BudgetCategory[];   // Monthly spending items
  savingsCategories: BudgetCategory[];    // Monthly savings items (ISA is built-in)
  employerMatchEnabled: boolean;          // Employer contributes to pension
  employerMatchPercent: number;           // Employer contribution %
  employerMatchOnGross: boolean;          // true = % of gross salary, false = % of qualifying earnings
  salarySacrifice: boolean;               // Salary sacrifice vs relief at source
  includeEmployeeNiSaving: boolean;       // Redirect employee NI saving into pot
  includeEmployerNiSaving: boolean;       // Redirect employer NI saving into pot
  scottishTax: boolean;                   // Use Scottish income tax bands
  contributionMode: "netCost" | "percentage" | "gross";
  chosenMonthlyContribution: number;      // Net cost mode: monthly take-home reduction
  employeeContributionPercent: number;    // Percentage mode: % of qualifying earnings
  chosenMonthlyGross: number;             // Gross mode: monthly gross salary sacrifice
  studentLoanPlan: StudentLoanPlan;       // "none" | "plan1" | "plan2" | "plan4" | "plan5"
  hasPostgradLoan: boolean;               // Whether user has a postgraduate loan
  taxCode: string;                        // PAYE tax code (e.g. "1257L", "S1257L", "K500", "BR")
}
```

## PensionResult

The result interface has ~40 fields. Key groups:

- **Before pension**: `takeHomeNoPension`, `incomeTaxNoPension`, `employeeNiNoPension`, `studentLoanNoPension`, `postgradLoanNoPension`
- **Budget**: `totalMonthlySpending`, `totalMonthlySavings`, `availableForPension`, `qualifyingEarnings`
- **Max budgets**: `maxContribution`, `maxEmployeePercent`, `maxSpendingMonthly`, `maxSavingsMonthly`
- **Contributions**: `employeeContribution`, `employerMatch`, `employeeNiSaving`, `employerNiSaving`
- **Student loans**: `studentLoanWithPension`, `postgradLoanWithPension`, `studentLoanSaving`, `postgradLoanSaving`
- **Totals**: `totalPensionPot` (all sources combined)
- **After pension**: `takeHomeWithPension`, `incomeTaxWithPension`, `effectiveTakeHomeGain`, `taxRelief`
- **Tax code**: `parsedTaxCode` (parsed result or null), `effectiveScottish` (resolved from code or toggle)
- **Chart data**: `pensionBreakdown[]`, `savingsComposition[]`, `payslip[]`

All monetary values are annual unless suffixed with `Monthly`.

---

## Design Decisions

### Why binary search for net cost to gross?

Tax and NI have multiple bands with different rates, plus the personal allowance taper. There is no closed-form formula to go from "I want my take-home to drop by X" to "sacrifice Y gross." Binary search handles all edge cases (band crossings, taper zones) with 50 iterations converging to sub-penny precision.

### Why two contribution modes?

Workplace pension schemes specify contributions as a percentage of qualifying earnings (e.g. "5% employee, 3% employer"). But when thinking about personal budgeting, it is more intuitive to think in terms of "how much does this actually cost me from my take-home?" The two modes serve these two mental models, and switching between them preserves the equivalent contribution.

### Why does the FIRE tab have its own local state?

The FIRE planner needs inputs (current age, existing portfolio, expected return, withdrawal rate) that are personal financial planning parameters unrelated to the tax/pension engine. These live as `useState` in `FireDashboard` rather than in `App.tsx` because they don't affect any other calculation. The FIRE engine reads spending and savings from `PensionResult` (which updates live as the user adjusts salary/pension/budget), keeping the two systems in sync without coupling their state.

### Why separate spending and savings categories?

Spending (rent, food, bills) and savings (ISA, emergency fund) compete for the same take-home budget, but they have different characteristics for the "max budget" calculations. Savings can be redirected to pension; spending cannot. ISA is a built-in savings category that cannot be removed.

### Why is all logic in one function?

`calculatePension()` is intentionally a single large function rather than broken into smaller calculation steps. The intermediate values (e.g. `takeHomeNoPension`, `availableForPension`, `employeeContribution`) form a dependency chain where later calculations need earlier results. A single function with local variables makes the flow readable and avoids passing dozens of intermediates between functions.

---

## Updating for a New Tax Year

1. Edit `TAX_CONFIG` in `src/lib/pension.ts`
2. Update the comment at the top of the file with the new tax year
3. Update the Scottish bands if they changed
4. Update this documentation and `docs/TAX_RULES.md`

The rest of the codebase is tax-year agnostic -- all thresholds and rates are read from `TAX_CONFIG`.
