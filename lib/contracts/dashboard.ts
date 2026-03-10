export type CurrencyCode = 'USD' | 'IDR';

export interface DashboardUserConfigDto {
  salaryAmount: number;
  salaryCurrency: CurrencyCode;
  monthlySpendingAmount: number;
  monthlySpendingCurrency: CurrencyCode;
  monthlyRentAmount: number;
  monthlyRentCurrency: CurrencyCode;
}

export interface DashboardRequestDto {
  clientTimezone: string | null;
  clientOffsetMinutes: number | null;
  config: DashboardUserConfigDto;
}

export interface DashboardFxDto {
  usdToIdr: number;
  isStale: boolean;
  lastUpdatedAt: number | null;
  lastUpdatedLabel: string;
}

export interface DashboardSalaryDto {
  earnedTodayUSD: number;
  earnedTodayIDR: number;
  earnedMonthUSD: number;
  earnedMonthIDR: number;
  dailyTargetUSD: number;
  dailyTargetIDR: number;
  monthlyUSD: number;
  monthlyIDR: number;
  hourlyUSD: number;
  hourlyIDR: number;
  dayProgressPercent: number;
  monthProgressPercent: number;
  dayMilestoneLabel: string;
  monthMilestoneLabel: string;
}

export interface EmergencyFundTargetsDto {
  x6: number;
  x12: number;
  x24: number;
  x36: number;
}

export interface DashboardFinanceDto {
  monthlySpendingUSD: number;
  monthlySpendingIDR: number;
  estimatedDailySpendingUSD: number;
  estimatedDailySpendingIDR: number;
  moneyNeededUntilEndOfMonthUSD: number;
  moneyNeededUntilEndOfMonthIDR: number;
  retirementTargetFromSalaryUSD: number;
  retirementTargetFromSalaryIDR: number;
  retirementTargetFromSpendingUSD: number;
  retirementTargetFromSpendingIDR: number;
  estimatedHoursToReachSpending: number;
  estimatedDaysHoursToReachSpendingLabel: string;
  disposableIncomeUSD: number;
  disposableIncomeIDR: number;
  savingsRate: number;
  emergencyFundFromSalaryUSD: EmergencyFundTargetsDto;
  emergencyFundFromSalaryIDR: EmergencyFundTargetsDto;
  emergencyFundFromSpendingUSD: EmergencyFundTargetsDto;
  emergencyFundFromSpendingIDR: EmergencyFundTargetsDto;
}

export interface DashboardConfigDto {
  amount: number;
  currency: CurrencyCode;
  refreshIntervalMs: number;
  fxRefreshMs: number;
  monthlySpending: number;
  monthlySpendingCurrency: CurrencyCode;
  monthlyRent: number;
  monthlyRentCurrency: CurrencyCode;
}

export interface DashboardTelemetryDto {
  clientTimezone: string | null;
  clientOffsetMinutes: number | null;
}

export interface DashboardDto {
  generatedAt: string;
  nowLabel: string;
  timezoneLabel: string;
  fx: DashboardFxDto;
  salary: DashboardSalaryDto;
  finance: DashboardFinanceDto;
  config: DashboardConfigDto;
  telemetry: DashboardTelemetryDto;
}

export interface DashboardDiagnostics {
  computeDurationMs: number;
  fxFetchDurationMs: number;
  fxIsStale: boolean;
  fxAgeMs: number | null;
  clientTimezone: string | null;
  clientOffsetMinutes: number | null;
}
