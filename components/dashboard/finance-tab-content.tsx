'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Gauge, PiggyBank, ShieldCheck, TrendingDown, WalletCards } from 'lucide-react';

import { DashboardNote, DualCurrencyAmount, SectionIntro } from '@/components/dashboard/display';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatAmountInputDisplay, stripToNumericString } from '@/lib/format';
import { addFractionalMonths } from '@/lib/salary';
import {
  CALENDAR_PROGRESS_NOTE,
  DAILY_SPENDING_PACE_NOTE,
  EMERGENCY_FUND_EXPECTED_NOTE,
  EMERGENCY_FUND_INSERT_TARGET_HINT,
  EMERGENCY_FUND_MIN_ONE_MONTH_SALARY,
  EMERGENCY_FUND_MIN_ONE_MONTH_SPENDING,
  EMERGENCY_FUND_MONTHS_OR_AROUND,
  EMERGENCY_FUND_WHEN_REACH_LABEL,
  EMERGENCY_FUND_YOULL_LAST,
  MONEY_NEEDED_UNTIL_EOM_NOTE,
  SURVIVAL_FROM_AMOUNT_NOTE,
  SURVIVAL_DATE_ROUNDING_NOTE,
  SURVIVAL_INSERT_AMOUNT_HINT,
  WORKDAY_DURATION_NOTE,
  WORK_HOURS_ROUNDING_NOTE,
  WORKDAY_MODEL_NOTE,
} from '@/lib/dashboard-content';

type EmergencyFundTargets = {
  x6: number;
  x12: number;
  x24: number;
  x36: number;
};

const EMERGENCY_FUND_PERIODS = [
  { key: 'x6', label: '6 months' },
  { key: 'x12', label: '12 months' },
  { key: 'x24', label: '24 months' },
  { key: 'x36', label: '36 months' },
] as const;

const SURVIVAL_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const MAX_EMERGENCY_FUND_MONTHS = 600;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function TargetBlock({
  label,
  idr,
  usd,
}: {
  label: string;
  idr: number;
  usd: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <DualCurrencyAmount
        idr={idr}
        usd={usd}
        className="mt-2"
        primaryClassName="text-xl"
        secondaryPrefix="USD reference:"
      />
    </div>
  );
}

function EmergencyFundTile({
  label,
  idr,
  usd,
}: {
  label: string;
  idr: number;
  usd: number;
}) {
  return (
    <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <DualCurrencyAmount
        idr={idr}
        usd={usd}
        className="mt-2 space-y-1.5"
        primaryClassName="text-base sm:text-lg"
        secondaryClassName="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-sm"
        secondaryPrefix="USD reference:"
      />
    </div>
  );
}

export function FinanceTabContent({
  estimatedHoursToReachSpending,
  estimatedDaysHoursToReachSpendingLabel,
  estimatedDailySpendingIDR,
  estimatedDailySpendingUSD,
  moneyNeededUntilEndOfMonthIDR,
  moneyNeededUntilEndOfMonthUSD,
  disposableIncomeIDR,
  disposableIncomeUSD,
  savingsRate,
  savingsToneClass,
  monthlySalaryIDR,
  monthlySalaryUSD,
  monthlySpendingIDR,
  monthlySpendingUSD,
  retirementTargetFromSalaryIDR,
  retirementTargetFromSalaryUSD,
  retirementTargetFromSpendingIDR,
  retirementTargetFromSpendingUSD,
  emergencyFundSections,
}: {
  estimatedHoursToReachSpending: number;
  estimatedDaysHoursToReachSpendingLabel: string;
  estimatedDailySpendingIDR: number;
  estimatedDailySpendingUSD: number;
  moneyNeededUntilEndOfMonthIDR: number;
  moneyNeededUntilEndOfMonthUSD: number;
  disposableIncomeIDR: number;
  disposableIncomeUSD: number;
  savingsRate: number;
  savingsToneClass: string;
  monthlySalaryIDR: number;
  monthlySalaryUSD: number;
  monthlySpendingIDR: number;
  monthlySpendingUSD: number;
  retirementTargetFromSalaryIDR: number;
  retirementTargetFromSalaryUSD: number;
  retirementTargetFromSpendingIDR: number;
  retirementTargetFromSpendingUSD: number;
  emergencyFundSections: Array<{
    label: string;
    idrTargets: EmergencyFundTargets;
    usdTargets: EmergencyFundTargets;
  }>;
}) {
  const [survivalAmount, setSurvivalAmount] = useState('');
  const [survivalCurrency, setSurvivalCurrency] = useState<'USD' | 'IDR'>('IDR');
  const [emergencyTargetSalary, setEmergencyTargetSalary] = useState('');
  const [emergencyCurrencySalary, setEmergencyCurrencySalary] = useState<'USD' | 'IDR'>('IDR');
  const [emergencyTargetSpending, setEmergencyTargetSpending] = useState('');
  const [emergencyCurrencySpending, setEmergencyCurrencySpending] = useState<'USD' | 'IDR'>('IDR');

  const survivalAmountDebounced = useDebouncedValue(survivalAmount, 400);
  const emergencyTargetSalaryDebounced = useDebouncedValue(emergencyTargetSalary, 400);
  const emergencyTargetSpendingDebounced = useDebouncedValue(emergencyTargetSpending, 400);
  const amountNum =
    survivalAmountDebounced.trim() === '' ? NaN : parseFloat(survivalAmountDebounced);
  const dailySpending =
    survivalCurrency === 'IDR' ? estimatedDailySpendingIDR : estimatedDailySpendingUSD;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const maxAmountIDR = estimatedDailySpendingIDR * daysInMonth;
  const maxAmountUSD = estimatedDailySpendingUSD * daysInMonth;
  const maxAmount = survivalCurrency === 'IDR' ? maxAmountIDR : maxAmountUSD;

  const withinMax = Number.isFinite(amountNum) && amountNum > 0 && amountNum <= maxAmount;
  const canCompute = withinMax && dailySpending > 0;
  const daysCovered = canCompute ? amountNum / dailySpending : 0;
  const survivalDate = canCompute
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + Math.floor(daysCovered));
        return d;
      })()
    : null;

  const handleSurvivalAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = stripToNumericString(e.target.value, { allowDecimals: true });
    setSurvivalAmount(next);
  };

  const monthlySalaryForCalc =
    emergencyCurrencySalary === 'IDR' ? monthlySalaryIDR : monthlySalaryUSD;
  const monthlySpendingForCalc =
    emergencyCurrencySpending === 'IDR' ? monthlySpendingIDR : monthlySpendingUSD;
  const targetSalaryNum =
    emergencyTargetSalaryDebounced.trim() === ''
      ? NaN
      : parseFloat(emergencyTargetSalaryDebounced);
  const targetSpendingNum =
    emergencyTargetSpendingDebounced.trim() === ''
      ? NaN
      : parseFloat(emergencyTargetSpendingDebounced);
  const canComputeSalary =
    Number.isFinite(targetSalaryNum) &&
    targetSalaryNum >= monthlySalaryForCalc &&
    monthlySalaryForCalc > 0 &&
    targetSalaryNum / monthlySalaryForCalc <= MAX_EMERGENCY_FUND_MONTHS;
  const canComputeSpending =
    Number.isFinite(targetSpendingNum) &&
    targetSpendingNum >= monthlySpendingForCalc &&
    monthlySpendingForCalc > 0 &&
    targetSpendingNum / monthlySpendingForCalc <= MAX_EMERGENCY_FUND_MONTHS;
  const monthsSalary = canComputeSalary ? targetSalaryNum / monthlySalaryForCalc : 0;
  const monthsSpending = canComputeSpending ? targetSpendingNum / monthlySpendingForCalc : 0;
  const nowForEmergency = new Date();
  const expectedDateSalary = canComputeSalary
    ? addFractionalMonths(nowForEmergency, monthsSalary)
    : null;
  const expectedDateSpending = canComputeSpending
    ? addFractionalMonths(nowForEmergency, monthsSpending)
    : null;

  const survivalNoteParts = SURVIVAL_FROM_AMOUNT_NOTE.split('daily spending pace');

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Finance"
        title="Spending, saving, and planning"
        description="Track spending accountability, current savings, and longer-range targets in one place."
      />

      <div className="space-y-4">
        <SectionIntro
          eyebrow="Spending"
          title="Spending accountability"
          description="See what your spending baseline means in work time and daily pace."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="border-zinc-300/70 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="size-4" />
                Work hours to cover spending
              </CardTitle>
              <CardDescription>Approximate work needed to cover this month&apos;s spending.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-4xl font-semibold">{Math.round(estimatedHoursToReachSpending)}h</p>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                About {estimatedDaysHoursToReachSpendingLabel}
              </p>
              <DashboardNote>
                {WORK_HOURS_ROUNDING_NOTE} {WORKDAY_DURATION_NOTE}
              </DashboardNote>
            </CardContent>
          </Card>

          <Card className="border-zinc-300/70 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="size-4" />
                Daily spending pace
              </CardTitle>
              <CardDescription>
                Monthly spending minus monthly rent (if set), spread across the days in this month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DualCurrencyAmount
                idr={estimatedDailySpendingIDR}
                usd={estimatedDailySpendingUSD}
                primaryClassName="text-3xl"
                secondaryPrefix="USD reference:"
              />
              <DashboardNote>{DAILY_SPENDING_PACE_NOTE}</DashboardNote>
            </CardContent>
          </Card>

          <Card className="border-zinc-300/70 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4" />
                Money needed until end of month
              </CardTitle>
              <CardDescription>
                From today through the last day of this month at your daily spending pace. Monthly
                rent, if set in Config, is deducted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DualCurrencyAmount
                idr={moneyNeededUntilEndOfMonthIDR}
                usd={moneyNeededUntilEndOfMonthUSD}
                primaryClassName="text-3xl"
                secondaryPrefix="USD reference:"
              />
              <DashboardNote>{MONEY_NEEDED_UNTIL_EOM_NOTE}</DashboardNote>

              <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  With this amount you&apos;ll last until
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={survivalCurrency === 'IDR' ? 'e.g. 5,000,000' : 'e.g. 300'}
                    value={
                      survivalAmount === ''
                        ? ''
                        : formatAmountInputDisplay(survivalAmount, { decimals: true })
                    }
                    onChange={handleSurvivalAmountChange}
                    className="w-36"
                    aria-label="Amount"
                  />
                  <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 [&_button]:rounded-md">
                    <button
                      type="button"
                      onClick={() => setSurvivalCurrency('IDR')}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        survivalCurrency === 'IDR'
                          ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      }`}
                    >
                      IDR
                    </button>
                    <button
                      type="button"
                      onClick={() => setSurvivalCurrency('USD')}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        survivalCurrency === 'USD'
                          ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      }`}
                    >
                      USD
                    </button>
                  </div>
                </div>
                {survivalAmountDebounced.trim() !== '' && !canCompute && (
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {dailySpending <= 0
                      ? 'Cannot compute (no daily spending pace).'
                      : amountNum > maxAmount
                        ? 'Maximum is one month of spending (minus rent).'
                        : 'Enter a positive amount.'}
                  </p>
                )}
                <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {survivalDate !== null
                    ? `You'll last until ${SURVIVAL_DATE_FORMATTER.format(survivalDate)}`
                    : SURVIVAL_INSERT_AMOUNT_HINT}
                </p>
                <DashboardNote className="mt-2">{SURVIVAL_DATE_ROUNDING_NOTE}</DashboardNote>
                <DashboardNote className="mt-3">
                  {survivalNoteParts[0]}
                  <strong>daily spending pace</strong>
                  {survivalNoteParts[1]}
                </DashboardNote>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <SectionIntro
          eyebrow="Saving"
          title="Current savings"
          description="Focus on what remains from your income after your current monthly spending baseline."
        />

        <Card className="border-zinc-300/70 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="size-4" />
              Monthly buffer
            </CardTitle>
            <CardDescription>Income left after your current monthly spending baseline.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-2xl border border-zinc-200 px-4 py-4 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Available to save</p>
              <DualCurrencyAmount
                idr={disposableIncomeIDR}
                usd={disposableIncomeUSD}
                className="mt-3"
                primaryClassName="text-3xl"
                secondaryPrefix="USD reference:"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Savings rate</p>
                <Badge variant="secondary" className={savingsToneClass}>
                  {savingsRate.toFixed(2)}%
                </Badge>
              </div>

              <div className="rounded-xl border border-zinc-200 px-3 py-3 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Monthly spending baseline</p>
                <DualCurrencyAmount
                  idr={monthlySpendingIDR}
                  usd={monthlySpendingUSD}
                  className="mt-2"
                  primaryClassName="text-lg"
                  secondaryClassName="text-sm leading-relaxed"
                  secondaryPrefix="USD reference:"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <SectionIntro
          eyebrow="Planning"
          title="Long-range targets"
          description="Reference targets built from monthly income and monthly spending."
        />

        <div className="grid grid-cols-1 gap-4">
          <Card className="border-zinc-300/70 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="size-4" />
                Retirement target
              </CardTitle>
              <CardDescription>Simple 25x annual spending or income reference.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TargetBlock
                label="Based on monthly income"
                idr={retirementTargetFromSalaryIDR}
                usd={retirementTargetFromSalaryUSD}
              />
              <TargetBlock
                label="Based on monthly spending"
                idr={retirementTargetFromSpendingIDR}
                usd={retirementTargetFromSpendingUSD}
              />
            </CardContent>
          </Card>

          <Card className="border-zinc-300/70 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Emergency fund targets
              </CardTitle>
              <CardDescription>Coverage targets from both your income and spending baselines.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 px-3 py-3 dark:border-zinc-800">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Monthly Salary</p>
                  <DualCurrencyAmount
                    idr={monthlySalaryIDR}
                    usd={monthlySalaryUSD}
                    className="mt-2"
                    primaryClassName="text-lg"
                    secondaryClassName="text-sm leading-relaxed"
                    secondaryPrefix="USD reference:"
                  />
                </div>
                <div className="rounded-xl border border-zinc-200 px-3 py-3 dark:border-zinc-800">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Monthly Spending</p>
                  <DualCurrencyAmount
                    idr={monthlySpendingIDR}
                    usd={monthlySpendingUSD}
                    className="mt-2"
                    primaryClassName="text-lg"
                    secondaryClassName="text-sm leading-relaxed"
                    secondaryPrefix="USD reference:"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 px-4 py-4 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {emergencyFundSections[0]?.label ?? 'From Monthly Salary'}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {EMERGENCY_FUND_PERIODS.map((period) => (
                      <EmergencyFundTile
                        key={period.key}
                        label={period.label}
                        idr={emergencyFundSections[0]?.idrTargets[period.key] ?? 0}
                        usd={emergencyFundSections[0]?.usdTargets[period.key] ?? 0}
                      />
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {EMERGENCY_FUND_WHEN_REACH_LABEL}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={emergencyCurrencySalary === 'IDR' ? 'e.g. 50,000,000' : 'e.g. 3,000'}
                        value={
                          emergencyTargetSalary === ''
                            ? ''
                            : formatAmountInputDisplay(emergencyTargetSalary, {
                                decimals: true,
                              })
                        }
                        onChange={(e) =>
                          setEmergencyTargetSalary(
                            stripToNumericString(e.target.value, {
                              allowDecimals: true,
                            })
                          )
                        }
                        className="w-36"
                        aria-label="Target amount (from salary)"
                      />
                      <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 [&_button]:rounded-md">
                        <button
                          type="button"
                          onClick={() => setEmergencyCurrencySalary('IDR')}
                          className={`px-3 py-2 text-sm font-medium transition-colors ${
                            emergencyCurrencySalary === 'IDR'
                              ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                          }`}
                        >
                          IDR
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmergencyCurrencySalary('USD')}
                          className={`px-3 py-2 text-sm font-medium transition-colors ${
                            emergencyCurrencySalary === 'USD'
                              ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                          }`}
                        >
                          USD
                        </button>
                      </div>
                    </div>
                    {emergencyTargetSalaryDebounced.trim() !== '' && !canComputeSalary && (
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {monthlySalaryForCalc <= 0
                          ? 'Cannot compute (no monthly salary).'
                          : Number.isFinite(targetSalaryNum) && targetSalaryNum > 0 && targetSalaryNum < monthlySalaryForCalc
                            ? EMERGENCY_FUND_MIN_ONE_MONTH_SALARY
                            : targetSalaryNum > 0 && targetSalaryNum / monthlySalaryForCalc > MAX_EMERGENCY_FUND_MONTHS
                              ? `Maximum is ${MAX_EMERGENCY_FUND_MONTHS} months.`
                              : 'Enter a positive amount.'}
                      </p>
                    )}
                    <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {expectedDateSalary !== null
                        ? `${EMERGENCY_FUND_YOULL_LAST} ${monthsSalary.toFixed(1)} ${EMERGENCY_FUND_MONTHS_OR_AROUND} ${SURVIVAL_DATE_FORMATTER.format(expectedDateSalary)}`
                        : EMERGENCY_FUND_INSERT_TARGET_HINT}
                    </p>
                    <DashboardNote className="mt-2">{EMERGENCY_FUND_EXPECTED_NOTE}</DashboardNote>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 px-4 py-4 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {emergencyFundSections[1]?.label ?? 'From Monthly Spending'}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {EMERGENCY_FUND_PERIODS.map((period) => (
                      <EmergencyFundTile
                        key={period.key}
                        label={period.label}
                        idr={emergencyFundSections[1]?.idrTargets[period.key] ?? 0}
                        usd={emergencyFundSections[1]?.usdTargets[period.key] ?? 0}
                      />
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {EMERGENCY_FUND_WHEN_REACH_LABEL}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={emergencyCurrencySpending === 'IDR' ? 'e.g. 50,000,000' : 'e.g. 3,000'}
                        value={
                          emergencyTargetSpending === ''
                            ? ''
                            : formatAmountInputDisplay(emergencyTargetSpending, {
                                decimals: true,
                              })
                        }
                        onChange={(e) =>
                          setEmergencyTargetSpending(
                            stripToNumericString(e.target.value, {
                              allowDecimals: true,
                            })
                          )
                        }
                        className="w-36"
                        aria-label="Target amount (from spending)"
                      />
                      <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 [&_button]:rounded-md">
                        <button
                          type="button"
                          onClick={() => setEmergencyCurrencySpending('IDR')}
                          className={`px-3 py-2 text-sm font-medium transition-colors ${
                            emergencyCurrencySpending === 'IDR'
                              ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                          }`}
                        >
                          IDR
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmergencyCurrencySpending('USD')}
                          className={`px-3 py-2 text-sm font-medium transition-colors ${
                            emergencyCurrencySpending === 'USD'
                              ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                          }`}
                        >
                          USD
                        </button>
                      </div>
                    </div>
                    {emergencyTargetSpendingDebounced.trim() !== '' && !canComputeSpending && (
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {monthlySpendingForCalc <= 0
                          ? 'Cannot compute (no monthly spending).'
                          : Number.isFinite(targetSpendingNum) && targetSpendingNum > 0 && targetSpendingNum < monthlySpendingForCalc
                            ? EMERGENCY_FUND_MIN_ONE_MONTH_SPENDING
                            : targetSpendingNum > 0 && targetSpendingNum / monthlySpendingForCalc > MAX_EMERGENCY_FUND_MONTHS
                              ? `Maximum is ${MAX_EMERGENCY_FUND_MONTHS} months.`
                              : 'Enter a positive amount.'}
                      </p>
                    )}
                    <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {expectedDateSpending !== null
                        ? `${EMERGENCY_FUND_YOULL_LAST} ${monthsSpending.toFixed(1)} ${EMERGENCY_FUND_MONTHS_OR_AROUND} ${SURVIVAL_DATE_FORMATTER.format(expectedDateSpending)}`
                        : EMERGENCY_FUND_INSERT_TARGET_HINT}
                    </p>
                    <DashboardNote className="mt-2">{EMERGENCY_FUND_EXPECTED_NOTE}</DashboardNote>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DashboardNote>{WORKDAY_MODEL_NOTE}</DashboardNote>
        </div>
      </div>
    </div>
  );
}
