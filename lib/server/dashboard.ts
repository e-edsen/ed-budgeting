import { DASHBOARD_RUNTIME_CONFIG } from '../config';
import {
  calculateDailyEarned,
  calculateEarned,
  getDailyTarget,
  getDayProgress,
  getDaysInMonth,
  getDaysRemainingInMonth,
  getDisposableIncome,
  getEmergencyFundTargets,
  getEstimatedHoursToReachAmount,
  getHourlySalaryFromMonthlySalary,
  getMonthProgress,
  getNextPercentMilestone,
  getRetirementTarget,
  getSavingsRate,
} from '../salary';
import { FxState, getFxStateWithAutoRefresh } from '../fx';
import { DashboardDiagnostics, DashboardDto, DashboardUserConfigDto } from '../contracts/dashboard';

export interface BuildDashboardParams {
  clientTimezone: string | null;
  clientOffsetMinutes: number | null;
  config: DashboardUserConfigDto;
  now?: Date;
  fxStateLoader?: () => Promise<FxState>;
}

export interface BuildDashboardResult {
  data: DashboardDto;
  diagnostics: DashboardDiagnostics;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function getSafeTimezone(timeZone: string | null): string | null {
  if (!timeZone) {
    return null;
  }
  const trimmed = timeZone.trim();
  if (!trimmed) {
    return null;
  }
  if (!isValidTimeZone(trimmed)) {
    return null;
  }
  return trimmed;
}

function getGmtOffsetLabel(clientOffsetMinutes: number): string {
  const offsetMinutes = -clientOffsetMinutes;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteOffsetMinutes / 60);
  const minutes = absoluteOffsetMinutes % 60;
  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }
  return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

function toPseudoDateFromTimeZone(now: Date, timeZone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1');
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  const second = Number(parts.find((part) => part.type === 'second')?.value ?? '0');
  return new Date(year, month - 1, day, hour, minute, second, now.getMilliseconds());
}

function toPseudoDateFromOffset(now: Date, clientOffsetMinutes: number): Date {
  const shifted = new Date(now.getTime() - clientOffsetMinutes * 60_000);
  return new Date(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    shifted.getUTCMinutes(),
    shifted.getUTCSeconds(),
    shifted.getUTCMilliseconds()
  );
}

function getLocalNow(now: Date, timeZone: string | null, clientOffsetMinutes: number | null): Date {
  if (timeZone) {
    return toPseudoDateFromTimeZone(now, timeZone);
  }
  if (clientOffsetMinutes !== null) {
    return toPseudoDateFromOffset(now, clientOffsetMinutes);
  }
  return new Date(now);
}

function getNowLabel(localNow: Date): string {
  const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return dateTimeFormatter.format(localNow);
}

function getMilestoneLabel(localNow: Date, scope: 'day' | 'month'): string {
  const milestoneFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const milestone = getNextPercentMilestone(localNow, scope);
  if (milestone.nextPercent === null || milestone.timestamp === null) {
    return 'Completed';
  }
  return `${milestone.nextPercent}% at ${milestoneFormatter.format(milestone.timestamp)}`;
}

function getFxLastUpdatedLabel(
  lastUpdatedAt: number | null,
  timeZone: string | null,
  clientOffsetMinutes: number | null
): string {
  if (!lastUpdatedAt) {
    return 'No FX update yet';
  }
  const value = new Date(lastUpdatedAt);
  if (timeZone) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone,
    });
    return `Updated ${formatter.format(value)}`;
  }
  if (clientOffsetMinutes !== null) {
    const pseudoDate = toPseudoDateFromOffset(value, clientOffsetMinutes);
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `Updated ${formatter.format(pseudoDate)}`;
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `Updated ${formatter.format(value)}`;
}

function formatUnit(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function getEstimatedWorktimeLabel(totalHours: number): string {
  const workdays = Math.floor(totalHours / 8);
  const remainingHours = totalHours % 8;
  const parts: string[] = [];

  if (workdays > 0) {
    parts.push(formatUnit(workdays, 'workday', 'workdays'));
  }

  if (remainingHours > 0 || parts.length === 0) {
    parts.push(formatUnit(remainingHours, 'hour', 'hours'));
  }

  return parts.join(', ');
}

export async function buildDashboardData({
  clientTimezone,
  clientOffsetMinutes,
  config,
  now = new Date(),
  fxStateLoader,
}: BuildDashboardParams): Promise<BuildDashboardResult> {
  const computeStartedAt = Date.now();
  const safeTimezone = getSafeTimezone(clientTimezone);
  const localNow = getLocalNow(now, safeTimezone, clientOffsetMinutes);

  const fxStartedAt = Date.now();
  const fxState = await (fxStateLoader
    ? fxStateLoader()
    : getFxStateWithAutoRefresh(DASHBOARD_RUNTIME_CONFIG.fxRefreshMs));
  const fxFetchDurationMs = Date.now() - fxStartedAt;

  const monthProgress = getMonthProgress(localNow);
  const dayProgress = getDayProgress(localNow);
  const monthProgressPercent = monthProgress * 100;
  const dayProgressPercent = dayProgress * 100;
  const earnedMonthSource = calculateEarned(config.salaryAmount, monthProgress);
  const dailyTargetSource = getDailyTarget(config.salaryAmount, localNow);
  const dailyEarnedSource = calculateDailyEarned(dailyTargetSource, dayProgress);

  let earnedMonthUSD: number;
  let earnedMonthIDR: number;
  let earnedTodayUSD: number;
  let earnedTodayIDR: number;
  let dailyTargetUSD: number;
  let dailyTargetIDR: number;
  let monthlyUSD: number;
  let monthlyIDR: number;
  let hourlyUSD: number;
  let hourlyIDR: number;

  if (config.salaryCurrency === 'USD') {
    earnedMonthUSD = earnedMonthSource;
    earnedMonthIDR = earnedMonthSource * fxState.usdToIdr;
    earnedTodayUSD = dailyEarnedSource;
    earnedTodayIDR = dailyEarnedSource * fxState.usdToIdr;
    dailyTargetUSD = dailyTargetSource;
    dailyTargetIDR = dailyTargetSource * fxState.usdToIdr;
    monthlyUSD = config.salaryAmount;
    monthlyIDR = config.salaryAmount * fxState.usdToIdr;
    hourlyUSD = getHourlySalaryFromMonthlySalary(config.salaryAmount);
    hourlyIDR = hourlyUSD * fxState.usdToIdr;
  } else {
    earnedMonthIDR = earnedMonthSource;
    earnedMonthUSD = earnedMonthSource / fxState.usdToIdr;
    earnedTodayIDR = dailyEarnedSource;
    earnedTodayUSD = dailyEarnedSource / fxState.usdToIdr;
    dailyTargetIDR = dailyTargetSource;
    dailyTargetUSD = dailyTargetSource / fxState.usdToIdr;
    monthlyIDR = config.salaryAmount;
    monthlyUSD = config.salaryAmount / fxState.usdToIdr;
    hourlyIDR = getHourlySalaryFromMonthlySalary(config.salaryAmount);
    hourlyUSD = hourlyIDR / fxState.usdToIdr;
  }

  let monthlySpendingUSD: number;
  let monthlySpendingIDR: number;
  if (config.monthlySpendingCurrency === 'USD') {
    monthlySpendingUSD = config.monthlySpendingAmount;
    monthlySpendingIDR = config.monthlySpendingAmount * fxState.usdToIdr;
  } else {
    monthlySpendingIDR = config.monthlySpendingAmount;
    monthlySpendingUSD = config.monthlySpendingAmount / fxState.usdToIdr;
  }

  let rentIDR: number;
  let rentUSD: number;
  const monthlyRentAmount = config.monthlyRentAmount ?? 0;
  if (config.monthlyRentCurrency === 'USD') {
    rentUSD = monthlyRentAmount;
    rentIDR = monthlyRentAmount * fxState.usdToIdr;
  } else {
    rentIDR = monthlyRentAmount;
    rentUSD = monthlyRentAmount / fxState.usdToIdr;
  }

  const nonRentSpendingIDR = Math.max(0, monthlySpendingIDR - rentIDR);
  const nonRentSpendingUSD = Math.max(0, monthlySpendingUSD - rentUSD);
  const daysInMonth = getDaysInMonth(localNow);
  const daysRemaining = getDaysRemainingInMonth(localNow);
  const estimatedDailySpendingIDR = nonRentSpendingIDR / daysInMonth;
  const estimatedDailySpendingUSD = nonRentSpendingUSD / daysInMonth;
  const moneyNeededUntilEndOfMonthIDR = estimatedDailySpendingIDR * daysRemaining;
  const moneyNeededUntilEndOfMonthUSD = estimatedDailySpendingUSD * daysRemaining;

  const retirementTargetFromSalaryIDR = getRetirementTarget(monthlyIDR);
  const retirementTargetFromSalaryUSD = retirementTargetFromSalaryIDR / fxState.usdToIdr;
  const retirementTargetFromSpendingIDR = getRetirementTarget(monthlySpendingIDR);
  const retirementTargetFromSpendingUSD = retirementTargetFromSpendingIDR / fxState.usdToIdr;
  const estimatedHoursToReachSpending = getEstimatedHoursToReachAmount(monthlySpendingIDR, hourlyIDR);
  const estimatedDaysHoursToReachSpendingLabel = getEstimatedWorktimeLabel(
    estimatedHoursToReachSpending
  );
  const emergencyFundFromSalaryIDR = getEmergencyFundTargets(monthlyIDR);
  const emergencyFundFromSalaryUSD = {
    x6: emergencyFundFromSalaryIDR.x6 / fxState.usdToIdr,
    x12: emergencyFundFromSalaryIDR.x12 / fxState.usdToIdr,
    x24: emergencyFundFromSalaryIDR.x24 / fxState.usdToIdr,
    x36: emergencyFundFromSalaryIDR.x36 / fxState.usdToIdr,
  };
  const emergencyFundFromSpendingIDR = getEmergencyFundTargets(monthlySpendingIDR);
  const emergencyFundFromSpendingUSD = {
    x6: emergencyFundFromSpendingIDR.x6 / fxState.usdToIdr,
    x12: emergencyFundFromSpendingIDR.x12 / fxState.usdToIdr,
    x24: emergencyFundFromSpendingIDR.x24 / fxState.usdToIdr,
    x36: emergencyFundFromSpendingIDR.x36 / fxState.usdToIdr,
  };
  const disposableIncomeIDR = getDisposableIncome(monthlyIDR, monthlySpendingIDR);
  const disposableIncomeUSD = disposableIncomeIDR / fxState.usdToIdr;
  const savingsRate = getSavingsRate(monthlyIDR, monthlySpendingIDR);

  const effectiveOffset = clientOffsetMinutes ?? now.getTimezoneOffset();
  const timezonePrefix = safeTimezone ?? 'Local';
  const timezoneLabel = `${timezonePrefix}, ${getGmtOffsetLabel(effectiveOffset)}`;

  const data: DashboardDto = {
    generatedAt: now.toISOString(),
    nowLabel: getNowLabel(localNow),
    timezoneLabel,
    fx: {
      usdToIdr: fxState.usdToIdr,
      isStale: fxState.isStale,
      lastUpdatedAt: fxState.lastUpdatedAt,
      lastUpdatedLabel: getFxLastUpdatedLabel(
        fxState.lastUpdatedAt,
        safeTimezone,
        clientOffsetMinutes
      ),
    },
    salary: {
      earnedTodayUSD,
      earnedTodayIDR,
      earnedMonthUSD,
      earnedMonthIDR,
      dailyTargetUSD,
      dailyTargetIDR,
      monthlyUSD,
      monthlyIDR,
      hourlyUSD,
      hourlyIDR,
      dayProgressPercent,
      monthProgressPercent,
      dayMilestoneLabel: getMilestoneLabel(localNow, 'day'),
      monthMilestoneLabel: getMilestoneLabel(localNow, 'month'),
    },
    finance: {
      monthlySpendingUSD,
      monthlySpendingIDR,
      estimatedDailySpendingUSD,
      estimatedDailySpendingIDR,
      moneyNeededUntilEndOfMonthUSD,
      moneyNeededUntilEndOfMonthIDR,
      retirementTargetFromSalaryUSD,
      retirementTargetFromSalaryIDR,
      retirementTargetFromSpendingUSD,
      retirementTargetFromSpendingIDR,
      estimatedHoursToReachSpending,
      estimatedDaysHoursToReachSpendingLabel,
      disposableIncomeUSD,
      disposableIncomeIDR,
      savingsRate,
      emergencyFundFromSalaryUSD,
      emergencyFundFromSalaryIDR,
      emergencyFundFromSpendingUSD,
      emergencyFundFromSpendingIDR,
    },
    config: {
      amount: config.salaryAmount,
      currency: config.salaryCurrency,
      refreshIntervalMs: DASHBOARD_RUNTIME_CONFIG.refreshIntervalMs,
      fxRefreshMs: DASHBOARD_RUNTIME_CONFIG.fxRefreshMs,
      monthlySpending: config.monthlySpendingAmount,
      monthlySpendingCurrency: config.monthlySpendingCurrency,
      monthlyRent: monthlyRentAmount,
      monthlyRentCurrency: config.monthlyRentCurrency ?? 'IDR',
    },
    telemetry: {
      clientTimezone: safeTimezone,
      clientOffsetMinutes,
    },
  };

  const diagnostics: DashboardDiagnostics = {
    computeDurationMs: Date.now() - computeStartedAt,
    fxFetchDurationMs,
    fxIsStale: fxState.isStale,
    fxAgeMs: fxState.lastUpdatedAt === null ? null : Date.now() - fxState.lastUpdatedAt,
    clientTimezone: safeTimezone,
    clientOffsetMinutes,
  };

  return {
    data,
    diagnostics,
  };
}
