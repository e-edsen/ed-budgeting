import { describe, expect, it } from 'vitest';
import { DashboardDto } from './contracts/dashboard';
import { calculateLiveSalaryMetrics } from './live-salary';
import { calculateDailyEarned, calculateEarned, getDayProgress, getMonthProgress } from './salary';

function createDashboard(now: Date): DashboardDto {
  const dayProgress = getDayProgress(now);
  const monthProgress = getMonthProgress(now);

  return {
    generatedAt: now.toISOString(),
    nowLabel: '',
    timezoneLabel: 'Local, GMT+0',
    fx: {
      usdToIdr: 16_000,
      isStale: false,
      lastUpdatedAt: null,
      lastUpdatedLabel: 'No update timestamp',
    },
    salary: {
      earnedTodayUSD: calculateDailyEarned(100, dayProgress),
      earnedTodayIDR: calculateDailyEarned(1_600_000, dayProgress),
      earnedMonthUSD: calculateEarned(3_100, monthProgress),
      earnedMonthIDR: calculateEarned(49_600_000, monthProgress),
      dailyTargetUSD: 100,
      dailyTargetIDR: 1_600_000,
      monthlyUSD: 3_100,
      monthlyIDR: 49_600_000,
      hourlyUSD: 19.375,
      hourlyIDR: 310_000,
      dayProgressPercent: dayProgress * 100,
      monthProgressPercent: monthProgress * 100,
      dayMilestoneLabel: 'placeholder',
      monthMilestoneLabel: 'placeholder',
    },
    finance: {
      monthlySpendingUSD: 1_200,
      monthlySpendingIDR: 19_200_000,
      estimatedDailySpendingUSD: 38.709677,
      estimatedDailySpendingIDR: 619_354.83871,
      moneyNeededUntilEndOfMonthUSD: 12_000,
      moneyNeededUntilEndOfMonthIDR: 192_000_000,
      retirementTargetFromSalaryUSD: 930_000,
      retirementTargetFromSalaryIDR: 14_880_000_000,
      retirementTargetFromSpendingUSD: 360_000,
      retirementTargetFromSpendingIDR: 5_760_000_000,
      estimatedHoursToReachSpending: 62,
      estimatedDaysHoursToReachSpendingLabel: '7 days + 6 hours',
      disposableIncomeUSD: 1_900,
      disposableIncomeIDR: 30_400_000,
      savingsRate: 61.29,
      emergencyFundFromSalaryUSD: {
        x6: 18_600,
        x12: 37_200,
        x24: 74_400,
        x36: 111_600,
      },
      emergencyFundFromSalaryIDR: {
        x6: 297_600_000,
        x12: 595_200_000,
        x24: 1_190_400_000,
        x36: 1_785_600_000,
      },
      emergencyFundFromSpendingUSD: {
        x6: 7_200,
        x12: 14_400,
        x24: 28_800,
        x36: 43_200,
      },
      emergencyFundFromSpendingIDR: {
        x6: 115_200_000,
        x12: 230_400_000,
        x24: 460_800_000,
        x36: 691_200_000,
      },
    },
    config: {
      amount: 49_600_000,
      currency: 'IDR',
      refreshIntervalMs: 60_000,
      fxRefreshMs: 3_600_000,
      monthlySpending: 19_200_000,
      monthlySpendingCurrency: 'IDR',
      monthlyRent: 0,
      monthlyRentCurrency: 'IDR',
    },
    telemetry: {
      clientTimezone: 'UTC',
      clientOffsetMinutes: 0,
    },
  };
}

describe('live salary metrics', () => {
  it('derives live values from the current time and snapshot totals', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0);
    const dashboard = createDashboard(now);

    const metrics = calculateLiveSalaryMetrics(dashboard, now);

    expect(metrics.dayProgressPercent).toBeCloseTo(getDayProgress(now) * 100, 5);
    expect(metrics.monthProgressPercent).toBeCloseTo(getMonthProgress(now) * 100, 5);
    expect(metrics.earnedTodayUSD).toBeCloseTo(calculateDailyEarned(100, getDayProgress(now)), 5);
    expect(metrics.earnedTodayIDR).toBeCloseTo(calculateDailyEarned(1_600_000, getDayProgress(now)), 5);
    expect(metrics.earnedMonthUSD).toBeCloseTo(calculateEarned(3_100, getMonthProgress(now)), 5);
    expect(metrics.earnedMonthIDR).toBeCloseTo(calculateEarned(49_600_000, getMonthProgress(now)), 5);
  });

  it('moves forward smoothly when time advances', () => {
    const start = new Date(2026, 0, 15, 12, 0, 0);
    const later = new Date(2026, 0, 15, 12, 0, 10);
    const dashboard = createDashboard(start);

    const startMetrics = calculateLiveSalaryMetrics(dashboard, start);
    const laterMetrics = calculateLiveSalaryMetrics(dashboard, later);

    expect(laterMetrics.dayProgressPercent).toBeGreaterThan(startMetrics.dayProgressPercent);
    expect(laterMetrics.monthProgressPercent).toBeGreaterThan(startMetrics.monthProgressPercent);
    expect(laterMetrics.earnedTodayIDR).toBeGreaterThan(startMetrics.earnedTodayIDR);
    expect(laterMetrics.earnedMonthIDR).toBeGreaterThan(startMetrics.earnedMonthIDR);
  });
});
