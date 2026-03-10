'use client';

import { DatabaseZap, RefreshCcw, Settings2, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardNote, FxRateLine, SectionIntro } from '@/components/dashboard/display';
import { getFxStatusCopy } from '@/lib/dashboard-content';
import { CurrencyCode } from '@/lib/contracts/dashboard';
import { formatCurrencyValue } from '@/lib/format';

function formatDuration(valueMs: number): string {
  const totalSeconds = Math.round(valueMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const totalHours = Math.round(totalMinutes / 60);
  return `${totalHours} hr`;
}

function InputBlock({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: number;
  currency: CurrencyCode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        <Badge variant="secondary">{currency}</Badge>
      </div>
      <p className="mt-2 text-xl font-semibold">{formatCurrencyValue(currency, amount)}</p>
    </div>
  );
}

export function ConfigTabContent({
  activeSalaryAmount,
  activeSalaryCurrency,
  activeMonthlySpending,
  activeMonthlySpendingCurrency,
  activeMonthlyRent,
  activeMonthlyRentCurrency,
  isConfigPersisted,
  savedAtLabel,
  timezoneLabel,
  fxRate,
  isFxStale,
  lastUpdatedLabel,
  refreshIntervalMs,
  fxRefreshMs,
  onEditValues,
  onResetValues,
}: {
  activeSalaryAmount: number;
  activeSalaryCurrency: CurrencyCode;
  activeMonthlySpending: number;
  activeMonthlySpendingCurrency: CurrencyCode;
  activeMonthlyRent: number;
  activeMonthlyRentCurrency: CurrencyCode;
  isConfigPersisted: boolean;
  savedAtLabel: string | null;
  timezoneLabel: string;
  fxRate: number;
  isFxStale: boolean;
  lastUpdatedLabel: string;
  refreshIntervalMs: number;
  fxRefreshMs: number;
  onEditValues: () => void;
  onResetValues: () => void;
}) {
  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Config"
        title="Inputs and data source"
        description="Your current inputs, storage choice, and the live FX context behind the dashboard."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-zinc-300/70 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="size-4" />
              Current inputs
            </CardTitle>
            <CardDescription>The values the dashboard is using right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputBlock
              label="Monthly income"
              amount={activeSalaryAmount}
              currency={activeSalaryCurrency}
            />
            <InputBlock
              label="Monthly spending baseline"
              amount={activeMonthlySpending}
              currency={activeMonthlySpendingCurrency}
            />
            <InputBlock
              label="Monthly rent (optional)"
              amount={activeMonthlyRent}
              currency={activeMonthlyRentCurrency}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {isConfigPersisted ? 'Remembered in this browser' : 'This session only'}
              </Badge>
              {savedAtLabel ? (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Last updated {savedAtLabel}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-300/70 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCcw className="size-4" />
              Time and FX source
            </CardTitle>
            <CardDescription>Useful context for the live numbers, without the extra noise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Time zone</p>
              <p className="mt-2 font-semibold">{timezoneLabel}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Current FX</p>
              <p className="mt-2 font-semibold">
                <FxRateLine rate={fxRate} />
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Last FX update</p>
              <p className="mt-2 font-semibold">{lastUpdatedLabel}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Dashboard refresh</p>
                <p className="mt-2 font-semibold">{formatDuration(refreshIntervalMs)}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">FX refresh window</p>
                <p className="mt-2 font-semibold">{formatDuration(fxRefreshMs)}</p>
              </div>
            </div>
            <DashboardNote>{getFxStatusCopy(isFxStale)}</DashboardNote>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-300/70 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseZap className="size-4" />
            Actions
          </CardTitle>
          <CardDescription>Update the inputs or clear the saved browser copy.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button className="sm:flex-1" variant="secondary" onClick={onEditValues}>
            Edit values
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="sm:flex-1" variant="outline">
                <Trash2 className="size-4" />
                Reset values
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset saved values?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears the current income and spending inputs and removes any browser-saved copy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onResetValues}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
