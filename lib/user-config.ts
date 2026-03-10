import { DEFAULT_USER_CONFIG } from './config';
import { CurrencyCode, DashboardRequestDto, DashboardUserConfigDto } from './contracts/dashboard';
import {
  parseDashboardRequest,
  parseStoredUserConfig,
  parseUserConfig,
} from './validation/dashboard';

export const USER_CONFIG_STORAGE_KEY = 'ed-budgeting:user-config';
export const USER_CONFIG_VERSION = 1;

export interface StoredUserConfig extends DashboardUserConfigDto {
  version: typeof USER_CONFIG_VERSION;
  updatedAt: string;
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === 'USD' || value === 'IDR';
}

export function normalizeUserConfig(value: unknown): DashboardUserConfigDto | null {
  return parseUserConfig(value);
}

export function createStoredUserConfig(config: DashboardUserConfigDto): StoredUserConfig {
  return {
    ...config,
    version: USER_CONFIG_VERSION,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeStoredUserConfig(value: unknown): StoredUserConfig | null {
  return parseStoredUserConfig(value);
}

export function normalizeDashboardRequest(value: unknown): DashboardRequestDto | null {
  return parseDashboardRequest(value);
}

export function getDefaultUserConfig(): DashboardUserConfigDto {
  return {
    ...DEFAULT_USER_CONFIG,
  };
}

export function loadStoredUserConfig(): StoredUserConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(USER_CONFIG_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return normalizeStoredUserConfig(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function saveStoredUserConfig(
  config: DashboardUserConfigDto,
  options?: { persistInBrowser?: boolean }
): StoredUserConfig {
  const storedConfig = createStoredUserConfig(config);
  if (typeof window !== 'undefined') {
    if (options?.persistInBrowser) {
      window.localStorage.setItem(USER_CONFIG_STORAGE_KEY, JSON.stringify(storedConfig));
    } else {
      window.localStorage.removeItem(USER_CONFIG_STORAGE_KEY);
    }
  }
  return storedConfig;
}

export function resetStoredUserConfig(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USER_CONFIG_STORAGE_KEY);
  }
}
