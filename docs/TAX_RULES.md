# UK Tax and NI Rules (2025/26)

This document describes the tax, National Insurance, and pension rules used by the calculation engine in `src/lib/pension.ts`. All values are for the **2025/26 tax year** (6 April 2025 -- 5 April 2026).

All thresholds and rates are defined in the `TAX_CONFIG` constant at the top of `pension.ts`. To update for a new tax year, edit that object.

---

## Income Tax

### Personal Allowance

| Parameter | Value |
|-----------|-------|
| Personal Allowance | 12,570 |
| Taper start | 100,000 |
| Taper rate | Reduced by 1 for every 2 above 100k |
| Fully removed at | 125,140 |

The personal allowance is calculated dynamically via `getPersonalAllowance(grossSalary)`. For salaries above 100k, the allowance reduces by 1 for every 2 earned above the taper start, reaching zero at 125,140.

**Important**: When salary sacrifice reduces gross pay, the personal allowance is recalculated on the *reduced* gross. This means sacrificing salary below the 100k threshold can restore lost personal allowance -- a significant benefit for earners in the 100k--125k range.

### Rest of UK (rUK) Rates

| Band | Taxable income range | Rate |
|------|---------------------|------|
| Basic | 12,571 -- 50,270 | 20% |
| Higher | 50,271 -- 125,140 | 40% |
| Additional | 125,141+ | 45% |

Implemented in `calculateIncomeTaxRUK()`. The bands are relative to the personal allowance, so the basic band width is `basicRateLimit - personalAllowance`.

### Scottish Rates

| Band | From | To | Rate |
|------|------|----|------|
| Starter | 12,571 | 15,397 | 19% |
| Basic | 15,398 | 27,491 | 20% |
| Intermediate | 27,492 | 43,662 | 21% |
| Higher | 43,663 | 75,000 | 42% |
| Advanced | 75,001 | 125,140 | 45% |
| Top | 125,141+ | -- | 47% |

Implemented in `calculateIncomeTaxScottish()` using a loop over `TAX_CONFIG.scottishBands`. Scottish tax applies to income tax only; NI thresholds and rates are UK-wide.

---

## National Insurance Contributions (NIC)

### Employee NI (Class 1)

| Threshold | Value | Rate |
|-----------|-------|------|
| Primary Threshold | 12,570 | -- |
| Upper Earnings Limit | 50,270 | -- |
| Main rate (PT to UEL) | -- | 8% |
| Upper rate (above UEL) | -- | 2% |

Implemented in `calculateEmployeeNi()`.

### Employer NI (Class 1)

| Threshold | Value | Rate |
|-----------|-------|------|
| Secondary Threshold | 5,000 | -- |
| Rate (above ST) | -- | 15% |

Implemented in `calculateEmployerNi()`. The employer NI rate was increased from 13.8% to 15% for 2025/26 and the secondary threshold reduced from 9,100 to 5,000.

---

## Salary Sacrifice

Under salary sacrifice, the employee's gross salary is reduced by the pension contribution amount **before** tax and NI are calculated. This means:

1. **Income tax saving**: The contribution comes from pre-tax income, so no income tax is paid on it.
2. **Employee NI saving**: The reduced gross falls into a lower NI band, saving employee NI.
3. **Employer NI saving**: The employer also pays less NI on the reduced gross.

The NI savings can optionally be redirected into the pension pot (controlled by `includeEmployeeNiSaving` and `includeEmployerNiSaving` flags).

### How salary sacrifice differs from relief at source

With relief at source (non-sacrifice), the pension contribution comes from net pay -- the employee pays full tax and NI on their gross salary, then the pension provider claims back basic rate tax relief. The app models this as a simple deduction from take-home pay.

With salary sacrifice, the contribution is taken before tax and NI, so the tax relief is automatic and includes NI savings. This is why salary sacrifice is more tax-efficient.

---

## Qualifying Earnings

| Parameter | Value |
|-----------|-------|
| Lower limit | 6,240 |
| Upper limit | 50,270 |
| Band width | 44,030 |

Qualifying earnings are the portion of salary between the lower and upper limits. They are used for:

1. **Percentage-based employee contributions** -- when `contributionMode = "percentage"`, the employee contribution is calculated as `qualifyingEarnings * employeeContributionPercent / 100`.
2. **Employer contributions** -- when `employerMatchOnGross = false`, the employer contribution is calculated as a percentage of qualifying earnings rather than gross salary.

For salaries above 50,270, qualifying earnings are capped at the upper limit. For salaries below 6,240, qualifying earnings are zero.

---

## Pension Annual Allowance

| Parameter | Value |
|-----------|-------|
| Annual Allowance | 60,000 |

The total of employee contribution + employer contribution is capped at the annual allowance. If the combined total exceeds 60,000, the employee contribution is reduced to fit within the cap.

Note: the app does not model the carry-forward of unused annual allowance from previous years, the money purchase annual allowance (MPAA), or the tapered annual allowance for very high earners (adjusted income above 260,000).

---

## Contribution Modes

### Percentage Mode (`contributionMode = "percentage"`)

The employee specifies a percentage of qualifying earnings. The gross salary sacrifice is:

```
employeeContribution = qualifyingEarnings * employeeContributionPercent / 100
```

This matches how workplace pension schemes typically work (e.g. "5% employee contribution").

### Net Cost Mode (`contributionMode = "netCost"`)

The employee specifies how much take-home pay they want to sacrifice per month. The engine uses a **binary search** to find the gross salary sacrifice that produces exactly that net cost:

```
netCostToGrossContribution(grossSalary, desiredNetCost, takeHomeNoPension, scottishTax)
```

The binary search is necessary because the relationship between gross sacrifice and net cost is non-linear -- it depends on which tax and NI bands are crossed. The search converges in 50 iterations (sub-penny precision).

### Mode switching

When switching between modes, the app calculates the equivalent value for the other mode:
- Percentage to net cost: uses `effectiveTakeHomeGain / 12` from the current result
- Net cost to percentage: uses `employeeContribution / qualifyingEarnings * 100` from the current result

---

## Max Budget Calculations

The engine computes "max" values for each budget category, answering "given everything else fixed, what is the maximum for this one?"

| Field | Formula |
|-------|---------|
| `maxContribution` | `takeHomeNoPension - annualSpending` (max affordable net cost) |
| `maxEmployeePercent` | Convert max net cost to gross contribution via binary search, then to % of qualifying earnings |
| `maxSpendingMonthly` | `(takeHomeNoPension - pensionNetCost - annualSavings) / 12` |
| `maxSavingsMonthly` | `(takeHomeNoPension - pensionNetCost - annualSpending) / 12` |

---

## Student Loan Repayments

Student loan repayments are calculated on gross pay (or post-sacrifice gross for salary sacrifice schemes). Undergraduate and postgraduate loans are independent and can stack.

### Undergraduate Plans

| Plan | Threshold | Rate | Description |
|------|-----------|------|-------------|
| Plan 1 | £26,065 | 9% | Pre-2012 England/Wales, or NI |
| Plan 2 | £28,470 | 9% | Post-2012 England/Wales |
| Plan 4 | £32,745 | 9% | Scotland (post-1998) |
| Plan 5 | £25,000 | 9% | Post-2023 England |

Repayment = `max(0, (earnings - threshold) * 0.09)`

Implemented in `calculateStudentLoan(earnings, plan)`.

### Postgraduate Loan

| Parameter | Value |
|-----------|-------|
| Threshold | £21,000 |
| Rate | 6% |

Postgraduate loans stack with undergraduate loans — if someone has both, they pay both independently. The postgraduate rate is lower (6% vs 9%).

Implemented in `calculatePostgradLoan(earnings)`.

### Salary sacrifice interaction

When salary sacrifice is used, student loan repayments are calculated on the **reduced** gross pay. This means salary sacrifice reduces student loan repayments — an often-overlooked benefit. The saving is shown in the payslip comparison and contribution breakdown.

The binary search in `netCostToGrossContribution()` includes student loan repayments in the net cost calculation, ensuring accurate conversion between net cost and gross contribution amounts.

---

## Sources

- [HMRC Income Tax rates 2025/26](https://www.gov.uk/income-tax-rates)
- [Scottish Income Tax rates 2025/26](https://www.gov.scot/policies/taxes/income-tax/)
- [HMRC National Insurance rates 2025/26](https://www.gov.uk/national-insurance-rates-letters)
- [The Pensions Regulator -- Automatic enrolment earnings thresholds](https://www.thepensionsregulator.gov.uk/en/employers/new-employers/automatic-enrolment-and-your-staff)
- [HMRC Annual Allowance](https://www.gov.uk/tax-on-your-private-pension/annual-allowance)
- [Student Loan repayment thresholds 2025/26](https://www.gov.uk/repaying-your-student-loan/what-you-pay)
- [Postgraduate Loan repayment](https://www.gov.uk/repaying-your-student-loan/what-you-pay)
