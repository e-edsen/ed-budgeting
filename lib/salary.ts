export function getMonthProgress(now: Date): number {
  const { start, end } = getMonthBounds(now);
  const elapsed = now.getTime() - start.getTime();
  const total = end.getTime() - start.getTime();
  const progress = Math.max(0, Math.min(1, elapsed / total));
  return progress;
}

export function getDaysInMonth(now: Date): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  return new Date(year, month + 1, 0).getDate();
}

export function getDaysRemainingInMonth(now: Date): number {
  const daysInMonth = getDaysInMonth(now);
  const today = now.getDate();
  return daysInMonth - today + 1;
}

export function getDayProgress(now: Date): number {
  const { start, end } = getDayBounds(now);
  const elapsed = now.getTime() - start.getTime();
  const total = end.getTime() - start.getTime();
  return Math.max(0, Math.min(1, elapsed / total));
}

export type ProgressScope = 'day' | 'month';

export type NextPercentMilestone = {
  currentPercent: number;
  nextPercent: number | null;
  timestamp: Date | null;
};

export function getNextPercentMilestone(now: Date, scope: ProgressScope): NextPercentMilestone {
  const bounds = scope === 'day' ? getDayBounds(now) : getMonthBounds(now);
  const elapsed = now.getTime() - bounds.start.getTime();
  const total = bounds.end.getTime() - bounds.start.getTime();
  const progress = Math.max(0, Math.min(1, elapsed / total));
  const currentPercent = progress * 100;
  if (progress >= 1) {
    return {
      currentPercent,
      nextPercent: null,
      timestamp: null,
    };
  }

  const nextPercent = Math.min(100, Math.floor(currentPercent) + 1);
  const nextElapsed = (nextPercent / 100) * total;
  const timestamp = new Date(bounds.start.getTime() + nextElapsed);

  return {
    currentPercent,
    nextPercent,
    timestamp,
  };
}

function getMonthBounds(now: Date): { start: Date; end: Date } {
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1),
  };
}

function getDayBounds(now: Date): { start: Date; end: Date } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  return {
    start: new Date(year, month, day),
    end: new Date(year, month, day + 1),
  };
}

export function getDailyTarget(monthlySalary: number, now: Date): number {
  return monthlySalary / getDaysInMonth(now);
}

export function calculateEarned(
  monthlySalary: number,
  progress: number
): number {
  return monthlySalary * progress;
}

export function calculateDailyEarned(
  dailyTarget: number,
  progress: number
): number {
  return dailyTarget * progress;
}

export function getHourlySalaryFromMonthlySalary(monthlySalary: number): number {
  return monthlySalary / (4 * 5 * 8);
}

export function getEstimatedHoursToReachAmount(
  targetAmount: number,
  hourlySalary: number
): number {
  if (hourlySalary <= 0) {
    return 0;
  }
  return Math.ceil(targetAmount / hourlySalary);
}

export type EmergencyFundTargets = {
  x6: number;
  x12: number;
  x24: number;
  x36: number;
};

export function getEmergencyFundTargets(monthlyBaseline: number): EmergencyFundTargets {
  return {
    x6: monthlyBaseline * 6,
    x12: monthlyBaseline * 12,
    x24: monthlyBaseline * 24,
    x36: monthlyBaseline * 36,
  };
}

/**
 * Returns a date that is the given number of months after fromDate.
 * Fractional months are applied as a proportion of the days in the resulting month.
 */
export function addFractionalMonths(fromDate: Date, monthsDecimal: number): Date {
  if (!Number.isFinite(monthsDecimal) || monthsDecimal < 0) {
    return new Date(fromDate.getTime());
  }
  const wholeMonths = Math.floor(monthsDecimal);
  const fraction = monthsDecimal - wholeMonths;
  const result = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth() + wholeMonths,
    fromDate.getDate(),
    fromDate.getHours(),
    fromDate.getMinutes(),
    fromDate.getSeconds(),
    fromDate.getMilliseconds()
  );
  if (fraction > 0) {
    const daysInResultMonth = getDaysInMonth(result);
    const extraDays = Math.round(fraction * daysInResultMonth);
    result.setDate(result.getDate() + extraDays);
  }
  return result;
}

export function getRetirementTarget(monthlyValue: number): number {
  return monthlyValue * 12 * 25;
}

export function getDisposableIncome(monthlyIncome: number, monthlySpending: number): number {
  return monthlyIncome - monthlySpending;
}

export function getSavingsRate(monthlyIncome: number, monthlySpending: number): number {
  if (monthlyIncome <= 0) {
    return 0;
  }
  const disposableIncome = getDisposableIncome(monthlyIncome, monthlySpending);
  return (disposableIncome / monthlyIncome) * 100;
}
