import { CurrencyCode, DashboardUserConfigDto } from './contracts/dashboard';

export const DEFAULT_USER_CONFIG: DashboardUserConfigDto = {
  salaryAmount: 0,
  salaryCurrency: 'IDR',
  monthlySpendingAmount: 0,
  monthlySpendingCurrency: 'IDR',
  monthlyRentAmount: 0,
  monthlyRentCurrency: 'IDR',
};

export const DASHBOARD_RUNTIME_CONFIG = {
  refreshIntervalMs: 60_000,
  fxRefreshMs: 3_600_000,
};

export const DEFAULT_CURRENCY: CurrencyCode = 'IDR';
