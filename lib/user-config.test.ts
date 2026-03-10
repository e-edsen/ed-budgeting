import { describe, expect, it } from 'vitest';

import {
  USER_CONFIG_VERSION,
  createStoredUserConfig,
  normalizeDashboardRequest,
  normalizeStoredUserConfig,
  normalizeUserConfig,
} from './user-config';

describe('user config helpers', () => {
  it('normalizes valid user config', () => {
    expect(
      normalizeUserConfig({
        salaryAmount: '12224520',
        salaryCurrency: 'IDR',
        monthlySpendingAmount: '5000000',
        monthlySpendingCurrency: 'IDR',
      })
    ).toEqual({
      salaryAmount: 12_224_520,
      salaryCurrency: 'IDR',
      monthlySpendingAmount: 5_000_000,
      monthlySpendingCurrency: 'IDR',
      monthlyRentAmount: 0,
      monthlyRentCurrency: 'IDR',
    });
  });

  it('rejects invalid user config values', () => {
    expect(
      normalizeUserConfig({
        salaryAmount: 0,
        salaryCurrency: 'IDR',
        monthlySpendingAmount: 5_000_000,
        monthlySpendingCurrency: 'IDR',
      })
    ).toBeNull();

    expect(
      normalizeUserConfig({
        salaryAmount: 12_224_520,
        salaryCurrency: 'EUR',
        monthlySpendingAmount: 5_000_000,
        monthlySpendingCurrency: 'IDR',
      })
    ).toBeNull();
  });

  it('normalizes config with rent and accepts missing rent as zero', () => {
    expect(
      normalizeUserConfig({
        salaryAmount: 12_224_520,
        salaryCurrency: 'IDR',
        monthlySpendingAmount: 5_000_000,
        monthlySpendingCurrency: 'IDR',
        monthlyRentAmount: 2_000_000,
        monthlyRentCurrency: 'IDR',
      })
    ).toEqual({
      salaryAmount: 12_224_520,
      salaryCurrency: 'IDR',
      monthlySpendingAmount: 5_000_000,
      monthlySpendingCurrency: 'IDR',
      monthlyRentAmount: 2_000_000,
      monthlyRentCurrency: 'IDR',
    });
  });

  it('creates and restores stored config', () => {
    const storedConfig = createStoredUserConfig({
      salaryAmount: 12_224_520,
      salaryCurrency: 'IDR',
      monthlySpendingAmount: 5_000_000,
      monthlySpendingCurrency: 'IDR',
      monthlyRentAmount: 0,
      monthlyRentCurrency: 'IDR',
    });

    expect(storedConfig.version).toBe(USER_CONFIG_VERSION);
    expect(normalizeStoredUserConfig(storedConfig)).toEqual(storedConfig);
  });

  it('rejects request payloads that try to control runtime settings', () => {
    expect(
      normalizeDashboardRequest({
        clientTimezone: 'Asia/Jakarta',
        clientOffsetMinutes: -420,
        config: {
          salaryAmount: 12_224_520,
          salaryCurrency: 'IDR',
          monthlySpendingAmount: 5_000_000,
          monthlySpendingCurrency: 'IDR',
          tickMs: 1,
        },
      })
    ).toBeNull();
  });
});
