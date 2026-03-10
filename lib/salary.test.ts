import { describe, expect, it } from 'vitest';
import {
  addFractionalMonths,
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
} from './salary';

describe('salary helpers', () => {
  it('returns correct month progress bounds', () => {
    const start = new Date(2026, 0, 1, 0, 0, 0, 0);
    const almostEnd = new Date(2026, 0, 31, 23, 59, 59, 999);

    expect(getMonthProgress(start)).toBe(0);
    expect(getMonthProgress(almostEnd)).toBeGreaterThan(0.99);
    expect(getMonthProgress(almostEnd)).toBeLessThanOrEqual(1);
  });

  it('returns number of days in month including leap year', () => {
    expect(getDaysInMonth(new Date(2024, 1, 1))).toBe(29);
    expect(getDaysInMonth(new Date(2026, 1, 1))).toBe(28);
    expect(getDaysInMonth(new Date(2026, 3, 1))).toBe(30);
    expect(getDaysInMonth(new Date(2026, 0, 1))).toBe(31);
  });

  it('returns days remaining in month from today through last day inclusive', () => {
    expect(getDaysRemainingInMonth(new Date(2026, 2, 1))).toBe(31);
    expect(getDaysRemainingInMonth(new Date(2026, 2, 5))).toBe(27);
    expect(getDaysRemainingInMonth(new Date(2026, 2, 31))).toBe(1);
    expect(getDaysRemainingInMonth(new Date(2026, 1, 28))).toBe(1);
    expect(getDaysRemainingInMonth(new Date(2028, 1, 15))).toBe(15);
  });

  it('calculates day progress across the day', () => {
    const dayStart = new Date(2026, 0, 15, 0, 0, 0, 0);
    const midday = new Date(2026, 0, 15, 12, 0, 0, 0);
    const dayEnd = new Date(2026, 0, 15, 23, 59, 59, 999);

    expect(getDayProgress(dayStart)).toBe(0);
    expect(getDayProgress(midday)).toBeCloseTo(0.5, 2);
    expect(getDayProgress(dayEnd)).toBeGreaterThan(0.99);
    expect(getDayProgress(dayEnd)).toBeLessThanOrEqual(1);
  });

  it('calculates daily target and daily earned', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0, 0);
    const dailyTarget = getDailyTarget(3100, now);
    const dayProgress = getDayProgress(now);

    expect(dailyTarget).toBe(100);
    expect(calculateDailyEarned(dailyTarget, dayProgress)).toBeCloseTo(50, 5);
  });

  it('calculates hourly salary from monthly salary using 4x5x8 assumption', () => {
    expect(getHourlySalaryFromMonthlySalary(16_000)).toBe(100);
    expect(getHourlySalaryFromMonthlySalary(12_224_520)).toBeCloseTo(76403.25, 2);
  });

  it('estimates hours to reach spending target by rounding up', () => {
    expect(getEstimatedHoursToReachAmount(6_000_000, 76_403.25)).toBe(79);
    expect(getEstimatedHoursToReachAmount(6_000_000, 100_000)).toBe(60);
    expect(getEstimatedHoursToReachAmount(6_000_000, 0)).toBe(0);
  });

  it('calculates emergency fund targets from a monthly baseline', () => {
    expect(getEmergencyFundTargets(1_000_000)).toEqual({
      x6: 6_000_000,
      x12: 12_000_000,
      x24: 24_000_000,
      x36: 36_000_000,
    });
  });

  it('adds fractional months to a date', () => {
    const from = new Date(2026, 2, 10, 12, 0, 0, 0); // 10 Mar 2026
    expect(addFractionalMonths(from, 0)).toEqual(from);
    const sixMonths = addFractionalMonths(from, 6);
    expect(sixMonths.getFullYear()).toBe(2026);
    expect(sixMonths.getMonth()).toBe(8); // September
    expect(sixMonths.getDate()).toBe(10);
    const sixPoint25 = addFractionalMonths(from, 6.25); // 6 months + ~7–8 days in Sept
    expect(sixPoint25.getMonth()).toBe(8);
    expect(sixPoint25.getDate()).toBeGreaterThanOrEqual(17);
    expect(sixPoint25.getDate()).toBeLessThanOrEqual(19);
    const invalid = addFractionalMonths(from, -1);
    expect(invalid.getTime()).toBe(from.getTime());
  });

  it('calculates retirement target from monthly value using 4 percent rule math', () => {
    expect(getRetirementTarget(1_000_000)).toBe(300_000_000);
    expect(getRetirementTarget(0)).toBe(0);
  });

  it('calculates disposable income and savings rate', () => {
    expect(getDisposableIncome(12_000_000, 6_000_000)).toBe(6_000_000);
    expect(getSavingsRate(12_000_000, 6_000_000)).toBe(50);
    expect(getSavingsRate(0, 6_000_000)).toBe(0);
  });

  it('calculates monthly earned from progress', () => {
    expect(calculateEarned(1000, 0.25)).toBe(250);
    expect(calculateEarned(1000, 1)).toBe(1000);
  });

  it('calculates next day milestone percent and timestamp', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0, 0);
    const milestone = getNextPercentMilestone(now, 'day');

    expect(milestone.nextPercent).toBe(51);
    expect(milestone.timestamp).toEqual(new Date(2026, 0, 15, 12, 14, 24, 0));
  });

  it('calculates next month milestone from month start', () => {
    const now = new Date(2026, 0, 1, 0, 0, 0, 0);
    const milestone = getNextPercentMilestone(now, 'month');

    expect(milestone.nextPercent).toBe(1);
    expect(milestone.timestamp).toEqual(new Date(2026, 0, 1, 7, 26, 24, 0));
  });

  it('returns increasing next milestone timestamps through the day', () => {
    const earlier = getNextPercentMilestone(new Date(2026, 0, 15, 10, 0, 0, 0), 'day');
    const later = getNextPercentMilestone(new Date(2026, 0, 15, 10, 30, 0, 0), 'day');

    expect(earlier.timestamp).not.toBeNull();
    expect(later.timestamp).not.toBeNull();
    expect((later.timestamp as Date).getTime()).toBeGreaterThan((earlier.timestamp as Date).getTime());
  });
});
