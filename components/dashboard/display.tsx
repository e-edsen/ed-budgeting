'use client';

import { ReactNode } from 'react';

import { CurrencyCode } from '@/lib/contracts/dashboard';
import { PRIMARY_DASHBOARD_CURRENCY } from '@/lib/dashboard-content';
import { formatCurrencyValue, formatUsdToIdrRate } from '@/lib/format';
import { cn } from '@/lib/utils';

type DualCurrencyAmountProps = {
  idr: number;
  usd: number;
  primaryCurrency?: CurrencyCode;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  secondaryPrefix?: string;
};

export function getPrimaryCurrencyAmount(
  idr: number,
  usd: number,
  primaryCurrency: CurrencyCode = PRIMARY_DASHBOARD_CURRENCY
) {
  return primaryCurrency === 'USD'
    ? {
        primary: { currency: 'USD' as const, value: usd },
        secondary: { currency: 'IDR' as const, value: idr },
      }
    : {
        primary: { currency: 'IDR' as const, value: idr },
        secondary: { currency: 'USD' as const, value: usd },
      };
}

export function DualCurrencyAmount({
  idr,
  usd,
  primaryCurrency = PRIMARY_DASHBOARD_CURRENCY,
  className,
  primaryClassName,
  secondaryClassName,
  secondaryPrefix = 'Approx.',
}: DualCurrencyAmountProps) {
  const amounts = getPrimaryCurrencyAmount(idr, usd, primaryCurrency);

  return (
    <div className={cn('space-y-1.5', className)}>
      <p className={cn('text-2xl font-semibold tracking-tight', primaryClassName)}>
        {formatCurrencyValue(amounts.primary.currency, amounts.primary.value)}
      </p>
      <p className={cn('text-sm text-zinc-500 dark:text-zinc-400', secondaryClassName)}>
        {secondaryPrefix} {formatCurrencyValue(amounts.secondary.currency, amounts.secondary.value)}
      </p>
    </div>
  );
}

export function DashboardNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-zinc-300/80 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/50',
        className
      )}
    >
      <p className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="font-mono text-zinc-400 dark:text-zinc-500">*</span>
        <span>{children}</span>
      </p>
    </div>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  description,
  className,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function FxRateLine({ rate }: { rate: number }) {
  return <>{formatUsdToIdrRate(rate)}</>;
}
