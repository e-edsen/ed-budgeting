import { describe, expect, it } from 'vitest';
import { buildDashboardDto } from './build-dashboard';
import { DASHBOARD_RUNTIME_CONFIG } from '../config';
import type { FxState } from '../fx';
import type { DashboardUserConfigDto } from '../contracts/dashboard';

const baseFxState: FxState = {
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

describe('buildDashboardDto', () => {
  it('builds a dashboard payload with stable config fields', () => {
    const now = new Date('2026-01-15T05:00:00.000Z');
    const data = buildDashboardDto({
      clientTimezone: 'Asia/Jakarta',
      clientOffsetMinutes: -420,
      config: defaultUserConfig,
      fxState: baseFxState,
      now,
    });

    expect(data.generatedAt).toBe(now.toISOString());
    expect(data.fx.usdToIdr).toBe(16_000);
    expect(data.config.refreshIntervalMs).toBe(DASHBOARD_RUNTIME_CONFIG.refreshIntervalMs);
    expect(data.config.fxRefreshMs).toBe(DASHBOARD_RUNTIME_CONFIG.fxRefreshMs);
  });

  it('formats last updated label using the client timezone', () => {
    const data = buildDashboardDto({
      clientTimezone: 'Asia/Jakarta',
      clientOffsetMinutes: -420,
      config: defaultUserConfig,
      fxState: baseFxState,
      now: new Date('2026-01-15T05:00:00.000Z'),
    });

    expect(data.fx.lastUpdatedLabel).toContain('Updated Jan 1, 07:00');
    expect(data.fx.lastUpdatedLabel).toContain('AM');
  });
});
