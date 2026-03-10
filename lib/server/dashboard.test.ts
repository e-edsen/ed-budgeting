import { describe, expect, it } from 'vitest';
import { buildDashboardData } from './dashboard';
import { FxState } from '../fx';
import { DashboardUserConfigDto } from '../contracts/dashboard';

const fakeFxState: FxState = {
  usdToIdr: 16_000,
  lastUpdatedAt: new Date('2026-01-01T00:00:00.000Z').getTime(),
  isStale: false,
};

const defaultUserConfig: DashboardUserConfigDto = {
  salaryAmount: 12_224_520,
  salaryCurrency: 'IDR',
  monthlySpendingAmount: 5_000_000,
  monthlySpendingCurrency: 'IDR',
  monthlyRentAmount: 0,
  monthlyRentCurrency: 'IDR',
};

describe('dashboard service', () => {
  it('builds dashboard payload with expected fields', async () => {
    const now = new Date('2026-01-15T05:00:00.000Z');
    const { data, diagnostics } = await buildDashboardData({
      clientTimezone: 'Asia/Jakarta',
      clientOffsetMinutes: -420,
      config: defaultUserConfig,
      now,
      fxStateLoader: async () => fakeFxState,
    });

    expect(data.generatedAt).toBe(now.toISOString());
    expect(data.fx.usdToIdr).toBe(16_000);
    expect(data.fx.isStale).toBe(false);
    expect(data.salary.dayProgressPercent).toBeCloseTo(50, 5);
    expect(data.salary.monthProgressPercent).toBeCloseTo(46.774193, 5);
    expect(data.salary.earnedTodayIDR).toBeCloseTo(197_169.6774, 2);
    expect(data.finance.savingsRate).toBeCloseTo(59.098599, 5);
    expect(data.finance.retirementTargetFromSalaryIDR).toBe(3_667_356_000);
    expect(data.finance.retirementTargetFromSalaryUSD).toBe(229_209.75);
    expect(data.finance.retirementTargetFromSpendingIDR).toBe(1_500_000_000);
    expect(data.finance.retirementTargetFromSpendingUSD).toBe(93_750);
    expect(data.finance.estimatedDailySpendingIDR).toBeCloseTo(161_290.32258, 5);
    expect(data.finance.estimatedDailySpendingUSD).toBeCloseTo(10.080645, 5);
    expect(data.finance.moneyNeededUntilEndOfMonthIDR).toBeCloseTo(2_741_935.48387, 2);
    expect(data.finance.moneyNeededUntilEndOfMonthUSD).toBeCloseTo(171.370967, 2);
    expect(data.finance.emergencyFundFromSalaryIDR).toEqual({
      x6: 73_347_120,
      x12: 146_694_240,
      x24: 293_388_480,
      x36: 440_082_720,
    });
    expect(data.finance.emergencyFundFromSalaryUSD).toEqual({
      x6: 4_584.195,
      x12: 9_168.39,
      x24: 18_336.78,
      x36: 27_505.17,
    });
    expect(data.finance.emergencyFundFromSpendingIDR).toEqual({
      x6: 30_000_000,
      x12: 60_000_000,
      x24: 120_000_000,
      x36: 180_000_000,
    });
    expect(data.finance.emergencyFundFromSpendingUSD).toEqual({
      x6: 1_875,
      x12: 3_750,
      x24: 7_500,
      x36: 11_250,
    });
    expect(data.telemetry.clientTimezone).toBe('Asia/Jakarta');
    expect(data.telemetry.clientOffsetMinutes).toBe(-420);
    expect(diagnostics.fxIsStale).toBe(false);
  });

  it('uses client timezone for progress math', async () => {
    const now = new Date('2026-01-01T05:00:00.000Z');
    const jakarta = await buildDashboardData({
      clientTimezone: 'Asia/Jakarta',
      clientOffsetMinutes: -420,
      config: defaultUserConfig,
      now,
      fxStateLoader: async () => fakeFxState,
    });
    const utc = await buildDashboardData({
      clientTimezone: 'UTC',
      clientOffsetMinutes: 0,
      config: defaultUserConfig,
      now,
      fxStateLoader: async () => fakeFxState,
    });

    expect(jakarta.data.salary.dayProgressPercent).toBeCloseTo(50, 5);
    expect(utc.data.salary.dayProgressPercent).toBeCloseTo(20.833333, 5);
    expect(jakarta.data.salary.dayProgressPercent).toBeGreaterThan(
      utc.data.salary.dayProgressPercent
    );
  });

  it('falls back to offset when timezone is missing', async () => {
    const now = new Date('2026-01-01T05:00:00.000Z');
    const withOffset = await buildDashboardData({
      clientTimezone: null,
      clientOffsetMinutes: -420,
      config: defaultUserConfig,
      now,
      fxStateLoader: async () => fakeFxState,
    });

    expect(withOffset.data.salary.dayProgressPercent).toBeCloseTo(50, 5);
    expect(withOffset.data.timezoneLabel).toContain('GMT+7');
  });

  it('preserves stale fx status from backend source', async () => {
    const now = new Date('2026-01-01T05:00:00.000Z');
    const stale = await buildDashboardData({
      clientTimezone: 'Asia/Jakarta',
      clientOffsetMinutes: -420,
      config: defaultUserConfig,
      now,
      fxStateLoader: async () => ({
        usdToIdr: 16_000,
        lastUpdatedAt: null,
        isStale: true,
      }),
    });

    expect(stale.data.fx.isStale).toBe(true);
    expect(stale.data.fx.lastUpdatedLabel).toBe('No FX update yet');
  });

  it('money needed until end of month deducts rent', async () => {
    const withRent = await buildDashboardData({
      clientTimezone: 'UTC',
      clientOffsetMinutes: 0,
      config: {
        ...defaultUserConfig,
        monthlySpendingAmount: 5_000_000,
        monthlyRentAmount: 2_000_000,
        monthlyRentCurrency: 'IDR',
      },
      now: new Date('2026-03-01T06:00:00.000Z'),
      fxStateLoader: async () => fakeFxState,
    });

    expect(withRent.data.finance.moneyNeededUntilEndOfMonthIDR).toBeCloseTo(3_000_000, 0);
    expect(withRent.data.config.monthlyRent).toBe(2_000_000);
  });

  it('daily spending pace deducts rent and matches money needed until EOM baseline', async () => {
    const withRent = await buildDashboardData({
      clientTimezone: 'UTC',
      clientOffsetMinutes: 0,
      config: {
        ...defaultUserConfig,
        monthlySpendingAmount: 5_000_000,
        monthlyRentAmount: 2_000_000,
        monthlyRentCurrency: 'IDR',
      },
      now: new Date('2026-03-01T12:00:00.000Z'),
      fxStateLoader: async () => fakeFxState,
    });

    const expectedDaily = 3_000_000 / 31;
    expect(withRent.data.finance.estimatedDailySpendingIDR).toBeCloseTo(expectedDaily, 0);
    expect(withRent.data.finance.moneyNeededUntilEndOfMonthIDR).toBeCloseTo(3_000_000, 0);
  });

  it('computes money needed until end of month from today through last day inclusive', async () => {
    const configWithSpending = {
      ...defaultUserConfig,
      monthlySpendingAmount: 5_000_000,
    };
    const march1 = await buildDashboardData({
      clientTimezone: 'UTC',
      clientOffsetMinutes: 0,
      config: configWithSpending,
      now: new Date('2026-03-01T06:00:00.000Z'),
      fxStateLoader: async () => fakeFxState,
    });
    const march5 = await buildDashboardData({
      clientTimezone: 'UTC',
      clientOffsetMinutes: 0,
      config: configWithSpending,
      now: new Date('2026-03-05T14:00:00.000Z'),
      fxStateLoader: async () => fakeFxState,
    });
    const march31 = await buildDashboardData({
      clientTimezone: 'UTC',
      clientOffsetMinutes: 0,
      config: configWithSpending,
      now: new Date('2026-03-31T23:59:00.000Z'),
      fxStateLoader: async () => fakeFxState,
    });

    expect(march1.data.finance.moneyNeededUntilEndOfMonthIDR).toBeCloseTo(5_000_000, 0);
    expect(march5.data.finance.moneyNeededUntilEndOfMonthIDR).toBeCloseTo(4_354_838.70968, 0);
    expect(march31.data.finance.moneyNeededUntilEndOfMonthIDR).toBeCloseTo(161_290.32258, 0);
  });

  it('derives estimated daily spending from the local month length', async () => {
    const january = await buildDashboardData({
      clientTimezone: 'UTC',
      clientOffsetMinutes: 0,
      config: {
        ...defaultUserConfig,
        monthlySpendingAmount: 31_000,
        monthlyRentAmount: 0,
      },
      now: new Date('2026-01-15T12:00:00.000Z'),
      fxStateLoader: async () => fakeFxState,
    });

    const februaryLeapYear = await buildDashboardData({
      clientTimezone: 'UTC',
      clientOffsetMinutes: 0,
      config: {
        ...defaultUserConfig,
        monthlySpendingAmount: 29_000,
        monthlyRentAmount: 0,
      },
      now: new Date('2028-02-15T12:00:00.000Z'),
      fxStateLoader: async () => fakeFxState,
    });

    expect(january.data.finance.estimatedDailySpendingIDR).toBeCloseTo(1_000, 5);
    expect(februaryLeapYear.data.finance.estimatedDailySpendingIDR).toBeCloseTo(1_000, 5);
  });

  it('handles mixed salary and spending currencies', async () => {
    const result = await buildDashboardData({
      clientTimezone: 'UTC',
      clientOffsetMinutes: 0,
      config: {
        salaryAmount: 1_000,
        salaryCurrency: 'USD',
        monthlySpendingAmount: 8_000_000,
        monthlySpendingCurrency: 'IDR',
        monthlyRentAmount: 0,
        monthlyRentCurrency: 'IDR',
      },
      now: new Date('2026-01-15T12:00:00.000Z'),
      fxStateLoader: async () => fakeFxState,
    });

    expect(result.data.salary.monthlyUSD).toBe(1_000);
    expect(result.data.salary.monthlyIDR).toBe(16_000_000);
    expect(result.data.finance.monthlySpendingIDR).toBe(8_000_000);
    expect(result.data.finance.monthlySpendingUSD).toBe(500);
  });
});
