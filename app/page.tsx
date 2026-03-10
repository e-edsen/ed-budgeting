'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardDto, DashboardUserConfigDto } from '@/lib/contracts/dashboard';
import { LiveSalaryProvider } from '@/components/live-salary';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserConfigDialog } from '@/components/user-config-dialog';
import { DashboardHeaderCard } from '@/components/dashboard/header-card';
import { DashboardOverviewSection } from '@/components/dashboard/overview-section';
import { SalaryTabContent } from '@/components/dashboard/salary-tab-content';
import { FinanceTabContent } from '@/components/dashboard/finance-tab-content';
import { ConfigTabContent } from '@/components/dashboard/config-tab-content';
import { DASHBOARD_RUNTIME_CONFIG } from '@/lib/config';
import { buildDashboardDto } from '@/lib/dashboard/build-dashboard';
import { getSavingsToneClass } from '@/lib/dashboard-content';
import {
  getDefaultUserConfig,
  loadStoredUserConfig,
  resetStoredUserConfig,
  saveStoredUserConfig,
  StoredUserConfig,
  USER_CONFIG_STORAGE_KEY,
} from '@/lib/user-config';
import type { FxState } from '@/lib/fx';
import { parseFxResponse } from '@/lib/validation/fx';

const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_SALARY === '1';
const FX_STORAGE_KEY = 'ed-budgeting:fx-state';
const FX_STORAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const EMPTY_EMERGENCY_FUND_TARGETS = {
  x6: 0,
  x12: 0,
  x24: 0,
  x36: 0,
};

type StoredFxState = {
  storedAt: number;
  value: FxState;
};

function loadStoredFxState(): FxState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(FX_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredFxState | null;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (typeof parsed.storedAt !== 'number' || !Number.isFinite(parsed.storedAt)) {
      return null;
    }
    if (Date.now() - parsed.storedAt > FX_STORAGE_MAX_AGE_MS) {
      return null;
    }
    const value = parseFxResponse(parsed.value);
    return value ?? null;
  } catch {
    return null;
  }
}

function saveStoredFxState(value: FxState): void {
  if (typeof window === 'undefined') {
    return;
  }
  const payload: StoredFxState = {
    storedAt: Date.now(),
    value,
  };
  window.localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(payload));
}

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapReady, setIsBootstrapReady] = useState(false);
  const [userConfig, setUserConfig] = useState<StoredUserConfig | null>(null);
  const [isConfigPersisted, setIsConfigPersisted] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fxState, setFxState] = useState<FxState | null>(null);
  const fxRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fxRequestInFlightRef = useRef(false);
  const fxStateRef = useRef<FxState | null>(null);

  useEffect(() => {
    fxStateRef.current = fxState;
  }, [fxState]);

  useEffect(() => {
    const rawStoredValue =
      typeof window === 'undefined' ? null : window.localStorage.getItem(USER_CONFIG_STORAGE_KEY);
    const restoredConfig = loadStoredUserConfig();

    if (!restoredConfig && rawStoredValue) {
      resetStoredUserConfig();
    }

    if (DEBUG_ENABLED) {
      console.debug('salary-debug-config-bootstrap', {
        hasStoredValue: Boolean(rawStoredValue),
        restoredConfig: restoredConfig ? 'available' : null,
        willShowOnboarding: !restoredConfig,
      });
    }

    setUserConfig(restoredConfig);
    setIsConfigPersisted(Boolean(restoredConfig));
    setIsBootstrapReady(true);
    setIsLoading(Boolean(restoredConfig));
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!isBootstrapReady) {
      return;
    }

    if (!userConfig) {
      setDashboard(null);
      setErrorMessage(null);
      setIsLoading(false);
      if (fxRefreshTimerRef.current) {
        clearTimeout(fxRefreshTimerRef.current);
        fxRefreshTimerRef.current = null;
      }
      return;
    }

    const restoredFx = loadStoredFxState();
    if (restoredFx && !fxStateRef.current) {
      setFxState(restoredFx);
    }

    const clearRefreshTimer = () => {
      if (fxRefreshTimerRef.current) {
        clearTimeout(fxRefreshTimerRef.current);
        fxRefreshTimerRef.current = null;
      }
    };

    const scheduleNextRefresh = (delayMs = DASHBOARD_RUNTIME_CONFIG.fxRefreshMs) => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      clearRefreshTimer();
      fxRefreshTimerRef.current = setTimeout(() => {
        void fetchFxState('timer');
      }, delayMs);
    };

    const fetchFxState = async (trigger: 'initial' | 'timer' | 'visibility') => {
      if (fxRequestInFlightRef.current) {
        return;
      }

      fxRequestInFlightRef.current = true;
      clearRefreshTimer();

      const startedAt = performance.now();
      const requestStartedAt = new Date().toISOString();

      if (!fxStateRef.current) {
        setIsLoading(true);
      }

      try {
        if (DEBUG_ENABLED) {
          console.debug('salary-debug-fx-request', {
            requestStartedAt,
            configSource: isConfigPersisted ? 'local-storage' : 'session-memory',
            trigger,
          });
        }

        const response = await fetch('/api/fx');
        const requestDurationMs = Number((performance.now() - startedAt).toFixed(2));

        if (!response.ok) {
          throw new Error(`status-${response.status}`);
        }

        const responsePayload: unknown = await response.json();
        const payload = parseFxResponse(responsePayload);
        if (!payload) {
          throw new Error('invalid-fx-response');
        }

        if (isCancelled) {
          return;
        }

        setFxState(payload);
        saveStoredFxState(payload);
        setErrorMessage(null);

        if (DEBUG_ENABLED) {
          console.debug('salary-debug-fx-response', {
            requestStartedAt,
            requestDurationMs,
            responseStatus: response.status,
            usdToIdr: payload.usdToIdr,
            lastUpdatedAt: payload.lastUpdatedAt,
            isStale: payload.isStale,
          });
        }
      } catch (error) {
        const requestDurationMs = Number((performance.now() - startedAt).toFixed(2));
        if (isCancelled) {
          return;
        }

        setErrorMessage('Failed to load FX rate');

        if (DEBUG_ENABLED) {
          console.debug('salary-debug-fx-response', {
            requestStartedAt,
            requestDurationMs,
            responseStatus: null,
            error: error instanceof Error ? error.message : 'unknown-error',
          });
        }
      } finally {
        fxRequestInFlightRef.current = false;

        if (isCancelled) {
          return;
        }

        setIsLoading(false);
        scheduleNextRefresh();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchFxState('visibility');
      } else {
        clearRefreshTimer();
      }
    };

    void fetchFxState('initial');
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      clearRefreshTimer();
      fxRequestInFlightRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isBootstrapReady, isConfigPersisted, userConfig]);

  useEffect(() => {
    if (!isBootstrapReady) {
      return;
    }

    if (!userConfig) {
      setDashboard(null);
      return;
    }

    if (!fxState) {
      return;
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const clientOffsetMinutes = new Date().getTimezoneOffset();
    const config: DashboardUserConfigDto = {
      salaryAmount: userConfig.salaryAmount,
      salaryCurrency: userConfig.salaryCurrency,
      monthlySpendingAmount: userConfig.monthlySpendingAmount,
      monthlySpendingCurrency: userConfig.monthlySpendingCurrency,
      monthlyRentAmount: userConfig.monthlyRentAmount ?? 0,
      monthlyRentCurrency: userConfig.monthlyRentCurrency ?? 'IDR',
    };

    const payload = buildDashboardDto({
      clientTimezone: timeZone || null,
      clientOffsetMinutes,
      config,
      fxState,
      now: new Date(),
    });

    setDashboard(payload);
    setIsLoading(false);
  }, [isBootstrapReady, userConfig, fxState]);

  const fxDisplay = dashboard?.fx ?? {
    usdToIdr: 16000,
    isStale: true,
    lastUpdatedAt: null,
    lastUpdatedLabel: 'No FX update yet',
  };
  const earnedTodayUSD = dashboard?.salary.earnedTodayUSD ?? 0;
  const earnedTodayIDR = dashboard?.salary.earnedTodayIDR ?? 0;
  const earnedMonthUSD = dashboard?.salary.earnedMonthUSD ?? 0;
  const earnedMonthIDR = dashboard?.salary.earnedMonthIDR ?? 0;
  const dailyTargetUSD = dashboard?.salary.dailyTargetUSD ?? 0;
  const dailyTargetIDR = dashboard?.salary.dailyTargetIDR ?? 0;
  const monthlyUSD = dashboard?.salary.monthlyUSD ?? 0;
  const monthlyIDR = dashboard?.salary.monthlyIDR ?? 0;
  const hourlyUSD = dashboard?.salary.hourlyUSD ?? 0;
  const hourlyIDR = dashboard?.salary.hourlyIDR ?? 0;
  const monthlySpendingUSD = dashboard?.finance.monthlySpendingUSD ?? 0;
  const monthlySpendingIDR = dashboard?.finance.monthlySpendingIDR ?? 0;
  const retirementTargetFromSalaryUSD = dashboard?.finance.retirementTargetFromSalaryUSD ?? 0;
  const retirementTargetFromSalaryIDR = dashboard?.finance.retirementTargetFromSalaryIDR ?? 0;
  const retirementTargetFromSpendingUSD = dashboard?.finance.retirementTargetFromSpendingUSD ?? 0;
  const retirementTargetFromSpendingIDR = dashboard?.finance.retirementTargetFromSpendingIDR ?? 0;
  const estimatedHoursToReachSpending = dashboard?.finance.estimatedHoursToReachSpending ?? 0;
  const estimatedDaysHoursToReachSpendingLabel =
    dashboard?.finance.estimatedDaysHoursToReachSpendingLabel ?? '0 hours';
  const emergencyFundFromSalaryIDR =
    dashboard?.finance.emergencyFundFromSalaryIDR ?? EMPTY_EMERGENCY_FUND_TARGETS;
  const emergencyFundFromSalaryUSD =
    dashboard?.finance.emergencyFundFromSalaryUSD ?? EMPTY_EMERGENCY_FUND_TARGETS;
  const emergencyFundFromSpendingIDR =
    dashboard?.finance.emergencyFundFromSpendingIDR ?? EMPTY_EMERGENCY_FUND_TARGETS;
  const emergencyFundFromSpendingUSD =
    dashboard?.finance.emergencyFundFromSpendingUSD ?? EMPTY_EMERGENCY_FUND_TARGETS;
  const disposableIncomeIDR = dashboard?.finance.disposableIncomeIDR ?? 0;
  const disposableIncomeUSD = dashboard?.finance.disposableIncomeUSD ?? 0;
  const savingsRate = dashboard?.finance.savingsRate ?? 0;
  const nowLabel = dashboard?.nowLabel ?? 'Loading time...';
  const timezoneLabel = dashboard?.timezoneLabel ?? 'Local, GMT';
  const dashboardConfig = dashboard?.config;
  const estimatedDailySpendingUSD = dashboard?.finance.estimatedDailySpendingUSD ?? 0;
  const estimatedDailySpendingIDR = dashboard?.finance.estimatedDailySpendingIDR ?? 0;
  const moneyNeededUntilEndOfMonthUSD = dashboard?.finance.moneyNeededUntilEndOfMonthUSD ?? 0;
  const moneyNeededUntilEndOfMonthIDR = dashboard?.finance.moneyNeededUntilEndOfMonthIDR ?? 0;
  const dialogInitialConfig = userConfig ?? getDefaultUserConfig();
  const shouldShowOnboarding = isBootstrapReady && !userConfig;
  const activeSalaryAmount = dashboardConfig?.amount ?? userConfig?.salaryAmount ?? 0;
  const activeSalaryCurrency = dashboardConfig?.currency ?? userConfig?.salaryCurrency ?? 'IDR';
  const activeMonthlySpending = dashboardConfig?.monthlySpending ?? userConfig?.monthlySpendingAmount ?? 0;
  const activeMonthlySpendingCurrency =
    dashboardConfig?.monthlySpendingCurrency ?? userConfig?.monthlySpendingCurrency ?? 'IDR';
  const activeMonthlyRent = dashboardConfig?.monthlyRent ?? userConfig?.monthlyRentAmount ?? 0;
  const activeMonthlyRentCurrency =
    dashboardConfig?.monthlyRentCurrency ?? userConfig?.monthlyRentCurrency ?? 'IDR';
  const emergencyFundSections = [
    {
      label: 'From Monthly Salary',
      idrTargets: emergencyFundFromSalaryIDR,
      usdTargets: emergencyFundFromSalaryUSD,
    },
    {
      label: 'From Monthly Spending',
      idrTargets: emergencyFundFromSpendingIDR,
      usdTargets: emergencyFundFromSpendingUSD,
    },
  ];
  const savedAtLabel = userConfig
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(userConfig.updatedAt))
    : null;

  const handleSaveUserConfig = (
    nextConfig: DashboardUserConfigDto,
    options: { persistInBrowser: boolean }
  ) => {
    const storedConfig = saveStoredUserConfig(nextConfig, options);
    if (DEBUG_ENABLED) {
      console.debug('salary-debug-config-save', {
        persistInBrowser: options.persistInBrowser,
      });
    }
    setUserConfig(storedConfig);
    setIsConfigPersisted(options.persistInBrowser);
    setIsConfigDialogOpen(false);
    setErrorMessage(null);
    setIsLoading(!fxState);
  };

  const handleResetUserConfig = () => {
    if (DEBUG_ENABLED) {
      console.debug('salary-debug-config-reset', {
        hadPersistedConfig: isConfigPersisted,
      });
    }
    resetStoredUserConfig();
    setIsConfigDialogOpen(false);
    setDashboard(null);
    setUserConfig(null);
    setIsConfigPersisted(false);
    setErrorMessage(null);
    setIsLoading(false);
  };

  const savingsToneClass = getSavingsToneClass(savingsRate);
  const refreshIntervalMs = dashboardConfig?.refreshIntervalMs ?? DASHBOARD_RUNTIME_CONFIG.refreshIntervalMs;
  const fxRefreshMs = dashboardConfig?.fxRefreshMs ?? DASHBOARD_RUNTIME_CONFIG.fxRefreshMs;

  return (
    <div className="min-h-screen bg-zinc-100/70 dark:bg-zinc-950">
      <UserConfigDialog
        open={shouldShowOnboarding || isConfigDialogOpen}
        title={shouldShowOnboarding ? 'Set up your tracker' : 'Edit your values'}
        description={
          shouldShowOnboarding
            ? 'Add your monthly income and monthly spending baseline to start the dashboard. You can keep them for this session or remember them in this browser.'
            : 'Update the values used by the dashboard and choose whether this browser should remember them.'
        }
        initialConfig={dialogInitialConfig}
        submitLabel={shouldShowOnboarding ? 'Save and start tracking' : 'Save changes'}
        lockOpen={shouldShowOnboarding}
        persistByDefault={isConfigPersisted}
        onOpenChange={setIsConfigDialogOpen}
        onSubmit={handleSaveUserConfig}
      />

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:px-8 md:py-10">
        <DashboardHeaderCard
          nowLabel={nowLabel}
          timezoneLabel={timezoneLabel}
          isFxStale={fxDisplay.isStale}
          onEditValues={() => setIsConfigDialogOpen(true)}
        />

        {!isBootstrapReady ? (
          <Card className="border-zinc-300/70 dark:border-zinc-800">
            <CardContent className="py-6 text-sm text-zinc-500 dark:text-zinc-400">
              Restoring saved config...
            </CardContent>
          </Card>
        ) : null}

        {isLoading && !dashboard && userConfig ? (
          <Card className="border-zinc-300/70 dark:border-zinc-800">
            <CardContent className="py-6 text-sm text-zinc-500 dark:text-zinc-400">
              Fetching FX rate...
            </CardContent>
          </Card>
        ) : null}

        {errorMessage ? (
          <Card className="border-rose-300/70 dark:border-rose-700/70">
            <CardContent className="py-6 text-sm font-medium text-rose-700 dark:text-rose-300">
              {errorMessage}
            </CardContent>
          </Card>
        ) : null}

        {shouldShowOnboarding ? (
          <Card className="border-zinc-300/70 dark:border-zinc-800">
            <CardContent className="py-6 text-sm text-zinc-500 dark:text-zinc-400">
              Add your monthly income and spending baseline to unlock the live dashboard.
            </CardContent>
          </Card>
        ) : (
          <LiveSalaryProvider key={dashboard ? 'ready' : 'empty'} dashboard={dashboard}>
            <DashboardOverviewSection
              hasDashboard={Boolean(dashboard)}
              earnedTodayIDR={earnedTodayIDR}
              earnedTodayUSD={earnedTodayUSD}
              earnedMonthIDR={earnedMonthIDR}
              earnedMonthUSD={earnedMonthUSD}
              savingsRate={savingsRate}
              savingsToneClass={savingsToneClass}
              disposableIncomeIDR={disposableIncomeIDR}
              disposableIncomeUSD={disposableIncomeUSD}
              fxRate={fxDisplay.usdToIdr}
              isFxStale={fxDisplay.isStale}
              lastUpdatedLabel={fxDisplay.lastUpdatedLabel}
            />

            <Tabs defaultValue="salary" className="space-y-6">
              <TabsList
                variant="line"
                className="grid w-full grid-cols-3 gap-1 border-b border-zinc-200 pb-1 dark:border-zinc-800"
              >
                <TabsTrigger className="px-3 sm:px-4" value="salary">
                  Salary
                </TabsTrigger>
                <TabsTrigger className="px-3 sm:px-4" value="finance">
                  Finance
                </TabsTrigger>
                <TabsTrigger className="px-3 sm:px-4" value="config">
                  Config
                </TabsTrigger>
              </TabsList>

              <TabsContent value="salary" className="pt-2">
                <SalaryTabContent
                  hasDashboard={Boolean(dashboard)}
                  dailyTargetUSD={dailyTargetUSD}
                  dailyTargetIDR={dailyTargetIDR}
                  monthlyUSD={monthlyUSD}
                  monthlyIDR={monthlyIDR}
                  hourlyUSD={hourlyUSD}
                  hourlyIDR={hourlyIDR}
                />
              </TabsContent>

              <TabsContent value="finance" className="pt-2">
                <FinanceTabContent
                  estimatedHoursToReachSpending={estimatedHoursToReachSpending}
                  estimatedDaysHoursToReachSpendingLabel={estimatedDaysHoursToReachSpendingLabel}
                  estimatedDailySpendingIDR={estimatedDailySpendingIDR}
                  estimatedDailySpendingUSD={estimatedDailySpendingUSD}
                  moneyNeededUntilEndOfMonthIDR={moneyNeededUntilEndOfMonthIDR}
                  moneyNeededUntilEndOfMonthUSD={moneyNeededUntilEndOfMonthUSD}
                  disposableIncomeIDR={disposableIncomeIDR}
                  disposableIncomeUSD={disposableIncomeUSD}
                  savingsRate={savingsRate}
                  savingsToneClass={savingsToneClass}
                  monthlySalaryIDR={monthlyIDR}
                  monthlySalaryUSD={monthlyUSD}
                  monthlySpendingIDR={monthlySpendingIDR}
                  monthlySpendingUSD={monthlySpendingUSD}
                  retirementTargetFromSalaryIDR={retirementTargetFromSalaryIDR}
                  retirementTargetFromSalaryUSD={retirementTargetFromSalaryUSD}
                  retirementTargetFromSpendingIDR={retirementTargetFromSpendingIDR}
                  retirementTargetFromSpendingUSD={retirementTargetFromSpendingUSD}
                  emergencyFundSections={emergencyFundSections}
                />
              </TabsContent>

              <TabsContent value="config" className="pt-2">
                <ConfigTabContent
                  activeSalaryAmount={activeSalaryAmount}
                  activeSalaryCurrency={activeSalaryCurrency}
                  activeMonthlySpending={activeMonthlySpending}
                  activeMonthlySpendingCurrency={activeMonthlySpendingCurrency}
                  activeMonthlyRent={activeMonthlyRent}
                  activeMonthlyRentCurrency={activeMonthlyRentCurrency}
                  isConfigPersisted={isConfigPersisted}
                  savedAtLabel={savedAtLabel}
                  timezoneLabel={timezoneLabel}
                  fxRate={fxDisplay.usdToIdr}
                  isFxStale={fxDisplay.isStale}
                  lastUpdatedLabel={fxDisplay.lastUpdatedLabel}
                  refreshIntervalMs={refreshIntervalMs}
                  fxRefreshMs={fxRefreshMs}
                  onEditValues={() => setIsConfigDialogOpen(true)}
                  onResetValues={handleResetUserConfig}
                />
              </TabsContent>
            </Tabs>
          </LiveSalaryProvider>
        )}
      </main>
    </div>
  );
}
