export interface FxState {
  usdToIdr: number;
  lastUpdatedAt: number | null;
  isStale: boolean;
}

const FX_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
const DEFAULT_FX_WINDOW_MS = 3_600_000;
const DEFAULT_FETCH_TIMEOUT_MS = 5_000;
const FALLBACK_USD_TO_IDR = 16_000;

let cachedFxState: FxState = {
  usdToIdr: FALLBACK_USD_TO_IDR,
  lastUpdatedAt: null,
  isStale: true,
};
let refreshPromise: Promise<FxState> | null = null;

export async function fetchUsdToIdrRate(): Promise<number | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, DEFAULT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(FX_API_URL, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();
    const rate =
      typeof data === 'object' && data !== null && 'rates' in data
        ? (data.rates as { IDR?: unknown }).IDR
        : null;

    if (typeof rate === 'number' && rate > 0) {
      return rate;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runRefresh(maxStaleMs: number): Promise<FxState> {
  const rate = await fetchUsdToIdrRate();
  const now = Date.now();

  if (rate !== null) {
    cachedFxState = {
      usdToIdr: rate,
      lastUpdatedAt: now,
      isStale: false,
    };
  } else {
    cachedFxState = {
      ...cachedFxState,
      isStale:
        cachedFxState.lastUpdatedAt === null ||
        now - (cachedFxState.lastUpdatedAt || 0) > maxStaleMs,
    };
  }

  return cachedFxState;
}

export async function refreshFxRate(maxStaleMs = DEFAULT_FX_WINDOW_MS): Promise<FxState> {
  if (!refreshPromise) {
    refreshPromise = runRefresh(maxStaleMs).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function getFxStateWithAutoRefresh(
  refreshIntervalMs = DEFAULT_FX_WINDOW_MS
): Promise<FxState> {
  const now = Date.now();
  const isFreshEnough =
    cachedFxState.lastUpdatedAt !== null &&
    now - cachedFxState.lastUpdatedAt < refreshIntervalMs;

  if (isFreshEnough) {
    return cachedFxState;
  }

  return refreshFxRate(refreshIntervalMs);
}

export function getFxState(): FxState {
  return cachedFxState;
}
