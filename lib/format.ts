import { CurrencyCode } from './contracts/dashboard';

const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_SALARY === '1';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const idrNumberFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatterDebugState = {
  windowStartedAtMs: 0,
  usdCalls: 0,
  idrCalls: 0,
};

function logFormatterUsage(currency: 'USD' | 'IDR') {
  if (!DEBUG_ENABLED || typeof window === 'undefined') {
    return;
  }

  if (currency === 'USD') {
    formatterDebugState.usdCalls += 1;
  } else {
    formatterDebugState.idrCalls += 1;
  }

  const now = performance.now();
  if (formatterDebugState.windowStartedAtMs === 0) {
    formatterDebugState.windowStartedAtMs = now;
    return;
  }

  const elapsedMs = now - formatterDebugState.windowStartedAtMs;
  if (elapsedMs < 1_000) {
    return;
  }

  console.debug('salary-debug-formatters', {
    windowMs: Number(elapsedMs.toFixed(2)),
    usdCalls: formatterDebugState.usdCalls,
    idrCalls: formatterDebugState.idrCalls,
    totalCalls: formatterDebugState.usdCalls + formatterDebugState.idrCalls,
  });

  formatterDebugState.windowStartedAtMs = now;
  formatterDebugState.usdCalls = 0;
  formatterDebugState.idrCalls = 0;
}

export function formatUSD(value: number): string {
  logFormatterUsage('USD');
  return usdFormatter.format(value);
}

export function formatIDR(value: number): string {
  logFormatterUsage('IDR');
  return idrFormatter.format(value);
}

export function formatIDRNumber(value: number): string {
  logFormatterUsage('IDR');
  return idrNumberFormatter.format(value);
}

export function formatCurrencyValue(currency: CurrencyCode, value: number): string {
  return currency === 'USD' ? formatUSD(value) : formatIDR(value);
}

export function formatUsdToIdrRate(value: number): string {
  return `1 USD = ${formatIDRNumber(value)} IDR`;
}

const amountInputIntegerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const amountInputDecimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function stripToNumericString(
  s: string,
  options?: { allowDecimals?: boolean }
): string {
  const allowDecimals = options?.allowDecimals !== false;
  if (allowDecimals) {
    const hasDot = s.includes('.');
    const digits = s.replace(/[^0-9.]/g, '');
    if (!hasDot) return digits;
    const [intPart, decPart] = digits.split('.');
    return decPart === undefined ? intPart : `${intPart}.${decPart.slice(0, 2)}`;
  }
  return s.replace(/[^0-9]/g, '');
}

export function formatAmountInputDisplay(
  raw: string,
  options?: { decimals?: boolean }
): string {
  if (raw === '' || raw === '.') return raw;
  const decimals = options?.decimals === true;
  const trailingDot = raw.endsWith('.');
  const num = parseFloat(raw);
  if (Number.isNaN(num)) return raw;
  const formatter = decimals ? amountInputDecimalFormatter : amountInputIntegerFormatter;
  return formatter.format(num) + (decimals && trailingDot ? '.' : '');
}
