import { CurrencyCode } from './contracts/dashboard';

export const PRIMARY_DASHBOARD_CURRENCY: CurrencyCode = 'IDR';

export const CALENDAR_PROGRESS_NOTE = 'Based on calendar time, including weekends.';
export const DAILY_SPENDING_PACE_NOTE =
  'Based on monthly spending minus monthly rent (if set in Config), spread across the days in this month.';
export const MONEY_NEEDED_UNTIL_EOM_NOTE =
  'Based on (monthly spending − monthly rent) from today through the last day of this month. Set monthly rent in Config if you pay rent upfront so this reflects what you need for the rest of the month.';
export const SURVIVAL_FROM_AMOUNT_NOTE =
  'Uses the same daily spending pace as above (monthly spending minus rent, spread over the month).';
export const SURVIVAL_DATE_ROUNDING_NOTE =
  'Date is rounded down to full days.';
export const SURVIVAL_INSERT_AMOUNT_HINT = 'Please insert an amount.';
export const EMERGENCY_FUND_EXPECTED_NOTE =
  'Assumes saving the full monthly amount each month until the target is reached.';
export const EMERGENCY_FUND_INSERT_TARGET_HINT = 'Enter a target amount.';
export const EMERGENCY_FUND_WHEN_REACH_LABEL = 'How much Emergency Fund you currently have';
export const EMERGENCY_FUND_YOULL_LAST = "You'll last";
export const EMERGENCY_FUND_MONTHS_OR_AROUND = 'months, or around';
export const EMERGENCY_FUND_MIN_ONE_MONTH_SALARY = "Target must be at least 1 month's salary.";
export const EMERGENCY_FUND_MIN_ONE_MONTH_SPENDING = "Target must be at least 1 month's spending.";
export const WORKDAY_MODEL_NOTE =
  'Based on a simple workweek: 8 hours a day, 5 days a week, 4 weeks a month.';
export const WORKDAY_DURATION_NOTE = 'Workday totals assume 8-hour days.';
export const WORK_HOURS_ROUNDING_NOTE =
  'Displayed hours are rounded up to the next whole hour for a practical planning estimate.';
export const SECONDARY_CURRENCY_NOTE = 'IDR is shown first. USD stays visible as a reference.';

export function getSavingsToneClass(savingsRate: number): string {
  if (savingsRate >= 30) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (savingsRate >= 15) {
    return 'text-blue-600 dark:text-blue-400';
  }
  return 'text-rose-600 dark:text-rose-400';
}

export function getFxBadgeLabel(isStale: boolean): string {
  return isStale ? 'Last known FX' : 'Live FX';
}

export function getFxStatusCopy(isStale: boolean): string {
  return isStale
    ? 'Using the last successfully fetched USD to IDR rate.'
    : 'Using the latest fetched USD to IDR rate.';
}
