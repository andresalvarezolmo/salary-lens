# Pension Visualiser

A UK salary sacrifice and pension contribution calculator built with React, TypeScript, and Vite. It helps you understand how pension contributions affect your take-home pay, how much goes into your pension pot from various sources, and how to optimise your budget across spending, savings, and pension.

## Quick start

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build to dist/
npm run preview   # preview production build
```

## Tech stack

- **React 19** + **TypeScript 6**
- **Vite 8** with `@vitejs/plugin-react`
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **Recharts** for charts (pie, bar, stacked bar)
- **Lucide React** for icons

## Project structure

```
src/
  lib/
    pension.ts              # Core calculation engine (all tax/NI/pension logic)
  components/
    BudgetCategoryList.tsx  # Editable category list (spending/savings)
    CurrencyInput.tsx       # Currency input with optional slider
    Toggle.tsx              # Toggle switch component
    StatCard.tsx            # Stat display card (yearly/monthly)
    PayslipComparison.tsx   # Before/after monthly payslip table
    PensionBreakdownChart.tsx # Pension pot breakdown (donut, stacked bar)
    SalaryWaterfallChart.tsx  # Salary allocation waterfall chart
    SavingsComposition.tsx  # Combined savings + pension view
  App.tsx                   # Main app layout, state management, input UI
  main.tsx                  # Entry point
  index.css                 # Tailwind imports
```

## Architecture

All financial logic lives in `src/lib/pension.ts`. The UI components are purely presentational -- they receive a `PensionResult` object and render it. `App.tsx` owns all state (`PensionInputs`) and calls `calculatePension(inputs)` via `useMemo` to derive results.

See [docs/TAX_RULES.md](docs/TAX_RULES.md) for detailed tax and NI rules, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the calculation engine internals.

## Features

- **Two contribution modes**: percentage of qualifying earnings (workplace-style) or monthly net cost (budget-style), with seamless switching between them
- **Salary sacrifice** modelling with tax and NI relief
- **Employer contribution** as a percentage of qualifying earnings or gross salary
- **NI savings** from salary sacrifice (employee and employer), optionally redirected into the pension pot
- **Scottish tax rates** toggle
- **Dynamic budget categories** for spending and savings (ISA is built-in)
- **"Use max budget" buttons** for pension, spending, and savings that auto-calculate the maximum given other commitments
- **Monthly payslip comparison** (before vs after pension)
- **Pension breakdown chart** showing contribution sources with net cost vs pot boost
- **Savings composition** combining ISA, other savings, and pension
- **Personal allowance taper** above 100k handled correctly
- **Annual allowance** cap at 60k
