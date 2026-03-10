'use client';

import { Landmark, Wallet } from 'lucide-react';

import { StaticEarningsCards, LiveEarningsCards } from '@/components/live-salary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardNote, DualCurrencyAmount, FxRateLine } from '@/components/dashboard/display';
import { getFxStatusCopy } from '@/lib/dashboard-content';

export function DashboardOverviewSection({
  hasDashboard,
  earnedTodayIDR,
  earnedTodayUSD,
  earnedMonthIDR,
  earnedMonthUSD,
  savingsRate,
  savingsToneClass,
  disposableIncomeIDR,
  disposableIncomeUSD,
  fxRate,
  isFxStale,
  lastUpdatedLabel,
}: {
  hasDashboard: boolean;
  earnedTodayIDR: number;
  earnedTodayUSD: number;
  earnedMonthIDR: number;
  earnedMonthUSD: number;
  savingsRate: number;
  savingsToneClass: string;
  disposableIncomeIDR: number;
  disposableIncomeUSD: number;
  fxRate: number;
  isFxStale: boolean;
  lastUpdatedLabel: string;
}) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {hasDashboard ? (
        <LiveEarningsCards />
      ) : (
        <StaticEarningsCards
          earnedTodayIDR={earnedTodayIDR}
          earnedTodayUSD={earnedTodayUSD}
          earnedMonthIDR={earnedMonthIDR}
          earnedMonthUSD={earnedMonthUSD}
        />
      )}

      <Card className="border-zinc-300/70 dark:border-zinc-800">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Wallet className="size-4" />
            Savings rate
          </CardDescription>
          <CardTitle className={`text-2xl ${savingsToneClass}`}>{savingsRate.toFixed(2)}%</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Monthly buffer</p>
            <DualCurrencyAmount
              idr={disposableIncomeIDR}
              usd={disposableIncomeUSD}
              className="space-y-1"
              primaryClassName="text-lg"
              secondaryClassName="text-sm"
              secondaryPrefix="USD reference:"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-300/70 dark:border-zinc-800">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Landmark className="size-4" />
            USD to IDR
          </CardDescription>
          <CardTitle className="text-2xl">
            <FxRateLine rate={fxRate} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{lastUpdatedLabel}</p>
          <DashboardNote>{getFxStatusCopy(isFxStale)}</DashboardNote>
        </CardContent>
      </Card>
    </section>
  );
}
