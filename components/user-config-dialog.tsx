'use client';

import { FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurrencyCode, DashboardUserConfigDto } from '@/lib/contracts/dashboard';
import {
  formatAmountInputDisplay,
  formatCurrencyValue,
  stripToNumericString,
} from '@/lib/format';
import { normalizeUserConfig } from '@/lib/user-config';

const MAX_SAVINGS_RATE_PERCENT = 99.99;

type SpendingInputMode = 'amount' | 'savingsRate';

function getSavingsRateFromAmounts(salaryAmount: number, monthlySpendingAmount: number): number {
  if (salaryAmount <= 0) return 0;
  const rate = ((salaryAmount - monthlySpendingAmount) / salaryAmount) * 100;
  return Math.max(0, Math.min(MAX_SAVINGS_RATE_PERCENT, rate));
}

function getSpendingFromSavingsRate(salaryAmount: number, savingsRatePercent: number): number {
  const clamped = Math.max(0, Math.min(MAX_SAVINGS_RATE_PERCENT, savingsRatePercent));
  return salaryAmount * (1 - clamped / 100);
}

type UserConfigDialogProps = {
  open: boolean;
  title: string;
  description: string;
  initialConfig: DashboardUserConfigDto;
  submitLabel: string;
  persistByDefault?: boolean;
  isSubmitting?: boolean;
  lockOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (
    config: DashboardUserConfigDto,
    options: { persistInBrowser: boolean }
  ) => void;
};

type UserConfigDialogFormProps = {
  initialConfig: DashboardUserConfigDto;
  submitLabel: string;
  persistByDefault: boolean;
  isSubmitting: boolean;
  lockOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (
    config: DashboardUserConfigDto,
    options: { persistInBrowser: boolean }
  ) => void;
};

function UserConfigDialogForm({
  initialConfig,
  submitLabel,
  persistByDefault,
  isSubmitting,
  lockOpen,
  onOpenChange,
  onSubmit,
}: UserConfigDialogFormProps) {
  const [salaryAmount, setSalaryAmount] = useState(
    initialConfig.salaryAmount === 0 ? '' : String(initialConfig.salaryAmount)
  );
  const [salaryCurrency, setSalaryCurrency] = useState<CurrencyCode>(initialConfig.salaryCurrency);
  const [spendingInputMode, setSpendingInputMode] = useState<SpendingInputMode>('amount');
  const [monthlySpendingAmount, setMonthlySpendingAmount] = useState(
    initialConfig.monthlySpendingAmount === 0 ? '' : String(initialConfig.monthlySpendingAmount)
  );
  const [monthlySpendingCurrency, setMonthlySpendingCurrency] = useState<CurrencyCode>(
    initialConfig.monthlySpendingCurrency
  );
  const [savingsRatePercent, setSavingsRatePercent] = useState(() => {
    const salary = Number(initialConfig.salaryAmount);
    const spending = Number(initialConfig.monthlySpendingAmount);
    return String(
      salary > 0 ? getSavingsRateFromAmounts(salary, spending).toFixed(2) : ''
    );
  });
  const [monthlyRentAmount, setMonthlyRentAmount] = useState(
    (initialConfig.monthlyRentAmount ?? 0) === 0 ? '' : String(initialConfig.monthlyRentAmount ?? 0)
  );
  const [monthlyRentCurrency, setMonthlyRentCurrency] = useState<CurrencyCode>(
    initialConfig.monthlyRentCurrency ?? 'IDR'
  );
  const [persistInBrowser, setPersistInBrowser] = useState(persistByDefault);
  const [formError, setFormError] = useState<string | null>(null);

  const salaryNum = Number(salaryAmount);
  const derivedSpendingAmount =
    spendingInputMode === 'savingsRate'
      ? getSpendingFromSavingsRate(salaryNum, Number(savingsRatePercent) || 0)
      : null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const spendingAmount =
      spendingInputMode === 'savingsRate'
        ? derivedSpendingAmount ?? 0
        : monthlySpendingAmount;
    const spendingCurrency =
      spendingInputMode === 'savingsRate' ? salaryCurrency : monthlySpendingCurrency;

    const normalizedConfig = normalizeUserConfig({
      salaryAmount,
      salaryCurrency,
      monthlySpendingAmount: spendingAmount,
      monthlySpendingCurrency: spendingCurrency,
      monthlyRentAmount,
      monthlyRentCurrency,
    });

    if (!normalizedConfig) {
      if (spendingInputMode === 'savingsRate') {
        if (salaryNum <= 0) {
          setFormError('Enter a positive monthly income to use savings rate.');
          return;
        }
        const pct = Number(savingsRatePercent);
        if (Number.isNaN(pct) || pct <= 0 || pct > MAX_SAVINGS_RATE_PERCENT) {
          setFormError(`Enter a savings rate between 0 and ${MAX_SAVINGS_RATE_PERCENT}%.`);
          return;
        }
      }
      setFormError('Enter positive amounts for income and spending, and choose currencies.');
      return;
    }

    setFormError(null);
    onSubmit(normalizedConfig, {
      persistInBrowser,
    });
  };

  const handleSpendingModeChange = (mode: string) => {
    const nextMode = mode as SpendingInputMode;
    setSpendingInputMode(nextMode);
    if (nextMode === 'savingsRate' && salaryNum > 0) {
      const currentSpending = Number(monthlySpendingAmount);
      const pct = getSavingsRateFromAmounts(salaryNum, currentSpending);
      setSavingsRatePercent(String(pct.toFixed(2)));
    }
    if (nextMode === 'amount' && derivedSpendingAmount != null && derivedSpendingAmount > 0) {
      setMonthlySpendingAmount(String(Math.round(derivedSpendingAmount)));
      setMonthlySpendingCurrency(salaryCurrency);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
        <div className="space-y-2">
          <Label htmlFor="salary-amount">Monthly Income</Label>
          <Input
            id="salary-amount"
            inputMode="decimal"
            placeholder="e.g. 15,000,000"
            value={
              salaryAmount === ''
                ? ''
                : formatAmountInputDisplay(salaryAmount, { decimals: false })
            }
            onChange={(event) =>
              setSalaryAmount(
                stripToNumericString(event.target.value, { allowDecimals: false })
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary-currency">Currency</Label>
          <Select
            value={salaryCurrency}
            onValueChange={(value) => setSalaryCurrency(value as CurrencyCode)}
          >
            <SelectTrigger id="salary-currency">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IDR">IDR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Monthly Spending Baseline</Label>
        <Tabs
          value={spendingInputMode}
          onValueChange={handleSpendingModeChange}
          className="w-full"
        >
          <TabsList variant="default" className="grid w-full grid-cols-2">
            <TabsTrigger value="amount">Amount</TabsTrigger>
            <TabsTrigger value="savingsRate">Savings rate (%)</TabsTrigger>
          </TabsList>
          <TabsContent value="amount" className="mt-3">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
              <div className="space-y-2">
                <Label htmlFor="monthly-spending-amount">Amount</Label>
                <Input
                  id="monthly-spending-amount"
                  inputMode="decimal"
                  placeholder="e.g. 5,000,000"
                  value={
                    monthlySpendingAmount === ''
                      ? ''
                      : formatAmountInputDisplay(monthlySpendingAmount, {
                          decimals: false,
                        })
                  }
                  onChange={(event) =>
                    setMonthlySpendingAmount(
                      stripToNumericString(event.target.value, {
                        allowDecimals: false,
                      })
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-spending-currency">Currency</Label>
                <Select
                  value={monthlySpendingCurrency}
                  onValueChange={(value) =>
                    setMonthlySpendingCurrency(value as CurrencyCode)
                  }
                >
                  <SelectTrigger id="monthly-spending-currency">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="savingsRate" className="mt-3 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="savings-rate-percent">Target savings rate (%)</Label>
              <Input
                id="savings-rate-percent"
                inputMode="decimal"
                placeholder="e.g. 64"
                value={savingsRatePercent}
                onChange={(event) => setSavingsRatePercent(event.target.value)}
              />
            </div>
            {salaryNum > 0 && derivedSpendingAmount != null && derivedSpendingAmount > 0 ? (
              <p className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                Monthly Spending Baseline:{' '}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrencyValue(salaryCurrency, Math.round(derivedSpendingAmount))}
                </span>
              </p>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
        <div className="space-y-2">
          <Label htmlFor="monthly-rent-amount">Monthly Rent (optional)</Label>
          <Input
            id="monthly-rent-amount"
            inputMode="decimal"
            placeholder="e.g. 0"
            value={
              monthlyRentAmount === ''
                ? ''
                : formatAmountInputDisplay(monthlyRentAmount, { decimals: false })
            }
            onChange={(event) =>
              setMonthlyRentAmount(
                stripToNumericString(event.target.value, { allowDecimals: false })
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthly-rent-currency">Currency</Label>
          <Select
            value={monthlyRentCurrency}
            onValueChange={(value) => setMonthlyRentCurrency(value as CurrencyCode)}
          >
            <SelectTrigger id="monthly-rent-currency">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IDR">IDR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formError ? (
        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{formError}</p>
      ) : null}

      <label className="flex items-start gap-3 rounded-lg border border-zinc-200 px-3 py-3 text-sm dark:border-zinc-800">
        <input
          className="mt-0.5 size-4 rounded border-zinc-300 text-zinc-900 accent-zinc-900 dark:accent-zinc-100"
          type="checkbox"
          checked={persistInBrowser}
          onChange={(event) => setPersistInBrowser(event.target.checked)}
        />
        <span className="space-y-1">
          <span className="block font-medium text-zinc-900 dark:text-zinc-100">
            Remember on this browser
          </span>
          <span className="block text-zinc-500 dark:text-zinc-400">
            Leave this off if you only want to keep the values for the current browser session.
          </span>
          <span className="block text-zinc-500 dark:text-zinc-400">
            Values are sent for calculation only and are not stored on our servers.
          </span>
        </span>
      </label>

      <DialogFooter>
        {lockOpen ? null : (
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function UserConfigDialog({
  open,
  title,
  description,
  initialConfig,
  submitLabel,
  persistByDefault = false,
  isSubmitting = false,
  lockOpen = false,
  onOpenChange,
  onSubmit,
}: UserConfigDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (lockOpen && !nextOpen) {
          return;
        }
        onOpenChange?.(nextOpen);
      }}
    >
      <DialogContent
        hideClose={lockOpen}
        onEscapeKeyDown={(event) => {
          if (lockOpen) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (lockOpen) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <UserConfigDialogForm
          key={`${open}-${title}-${persistByDefault}-${initialConfig.salaryAmount}-${initialConfig.salaryCurrency}-${initialConfig.monthlySpendingAmount}-${initialConfig.monthlySpendingCurrency}-${initialConfig.monthlyRentAmount ?? 0}-${initialConfig.monthlyRentCurrency ?? 'IDR'}`}
          initialConfig={initialConfig}
          submitLabel={submitLabel}
          persistByDefault={persistByDefault}
          isSubmitting={isSubmitting}
          lockOpen={lockOpen}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
