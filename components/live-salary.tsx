'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { CalendarClock, DollarSign } from 'lucide-react';
import { DashboardNote, DualCurrencyAmount } from '@/components/dashboard/display';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CALENDAR_PROGRESS_NOTE } from '@/lib/dashboard-content';
import { DashboardDto } from '@/lib/contracts/dashboard';
import { calculateLiveSalaryMetrics, LiveSalaryMetrics } from '@/lib/live-salary';

const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_SALARY === '1';
const LIVE_TICKER_INTERVAL_MS = 250;
type LiveSalaryStore = {
  getSnapshot: () => LiveSalaryMetrics | null;
  subscribe: (listener: () => void) => () => void;
  setDashboard: (dashboard: DashboardDto | null) => void;
  destroy: () => void;
};

const LiveSalaryContext = createContext<LiveSalaryStore | null>(null);

function roundDebugMetric(value: number): number {
  return Number(value.toFixed(4));
}

function createSnapshot(dashboard: DashboardDto | null, nowMs?: number): LiveSalaryMetrics | null {
  if (!dashboard) {
    return null;
  }

  const timestamp = nowMs ?? Date.parse(dashboard.generatedAt);
  return calculateLiveSalaryMetrics(dashboard, new Date(timestamp));
}

function createLiveSalaryStore(initialDashboard: DashboardDto | null): LiveSalaryStore {
  let dashboard = initialDashboard;
  let snapshot = createSnapshot(initialDashboard);
  let intervalId: number | null = null;
  let seedServerNowMs = initialDashboard ? Date.parse(initialDashboard.generatedAt) : 0;
  let seedPerformanceNowMs = typeof performance === 'undefined' ? 0 : performance.now();
  let previousPayloadGeneratedAtMs = initialDashboard ? Date.parse(initialDashboard.generatedAt) : null;
  const listeners = new Set<() => void>();
  const tickerDebugState = {
    windowStartedAtMs: 0,
    publishCount: 0,
    maxPublishGapMs: 0,
    lastPublishAtMs: null as number | null,
  };

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const logTickerWindow = (now: number) => {
    if (!DEBUG_ENABLED) {
      return;
    }

    if (tickerDebugState.windowStartedAtMs === 0) {
      tickerDebugState.windowStartedAtMs = now;
    }

    const publishGapMs =
      tickerDebugState.lastPublishAtMs === null ? null : Number((now - tickerDebugState.lastPublishAtMs).toFixed(2));

    tickerDebugState.publishCount += 1;
    if (publishGapMs !== null && publishGapMs > tickerDebugState.maxPublishGapMs) {
      tickerDebugState.maxPublishGapMs = publishGapMs;
    }
    tickerDebugState.lastPublishAtMs = now;

    const elapsedMs = now - tickerDebugState.windowStartedAtMs;
    if (elapsedMs < 1_000 || snapshot === null) {
      return;
    }

    console.debug('salary-debug-live-ticker', {
      windowMs: Number(elapsedMs.toFixed(2)),
      publishCount: tickerDebugState.publishCount,
      maxPublishGapMs: Number(tickerDebugState.maxPublishGapMs.toFixed(2)),
      tickIntervalMs: LIVE_TICKER_INTERVAL_MS,
      dayProgressPercent: roundDebugMetric(snapshot.dayProgressPercent),
      monthProgressPercent: roundDebugMetric(snapshot.monthProgressPercent),
    });

    tickerDebugState.windowStartedAtMs = now;
    tickerDebugState.publishCount = 0;
    tickerDebugState.maxPublishGapMs = 0;
  };

  const stop = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  const publish = () => {
    if (!dashboard) {
      return;
    }

    const now = performance.now();
    const liveNowMs = seedServerNowMs + (now - seedPerformanceNowMs);
    snapshot = createSnapshot(dashboard, liveNowMs);
    logTickerWindow(now);
    notify();
  };

  const start = () => {
    if (intervalId !== null || typeof window === 'undefined' || !dashboard) {
      return;
    }

    intervalId = window.setInterval(publish, LIVE_TICKER_INTERVAL_MS);
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setDashboard: (nextDashboard) => {
      dashboard = nextDashboard;

      if (!dashboard) {
        snapshot = null;
        previousPayloadGeneratedAtMs = null;
        stop();
        notify();
        return;
      }

      const generatedAtMs = Date.parse(dashboard.generatedAt);
      const now = performance.now();
      const payloadIntervalMs =
        previousPayloadGeneratedAtMs === null ? null : Number((generatedAtMs - previousPayloadGeneratedAtMs).toFixed(2));

      seedServerNowMs = generatedAtMs;
      seedPerformanceNowMs = now;
      previousPayloadGeneratedAtMs = generatedAtMs;
      snapshot = createSnapshot(dashboard, generatedAtMs);

      if (DEBUG_ENABLED && snapshot !== null) {
        console.debug('salary-debug-live-seed', {
          payloadGeneratedAt: dashboard.generatedAt,
          payloadIntervalMs,
          clockSkewMs: Number((Date.now() - generatedAtMs).toFixed(2)),
          tickIntervalMs: LIVE_TICKER_INTERVAL_MS,
          dayProgressPercent: roundDebugMetric(snapshot.dayProgressPercent),
          monthProgressPercent: roundDebugMetric(snapshot.monthProgressPercent),
        });
      }

      notify();
      start();
    },
    destroy: () => {
      stop();
      listeners.clear();
    },
  };
}

function useRenderDebug(component: string) {
  const renderWindowRef = useRef({
    windowStartedAtMs: 0,
    renderCount: 0,
  });

  useEffect(() => {
    if (!DEBUG_ENABLED) {
      return;
    }

    const now = performance.now();
    if (renderWindowRef.current.windowStartedAtMs === 0) {
      renderWindowRef.current.windowStartedAtMs = now;
    }

    renderWindowRef.current.renderCount += 1;
    const elapsedMs = now - renderWindowRef.current.windowStartedAtMs;
    if (elapsedMs < 1_000) {
      return;
    }

    console.debug('salary-debug-render', {
      component,
      windowMs: Number(elapsedMs.toFixed(2)),
      renderCount: renderWindowRef.current.renderCount,
    });

    renderWindowRef.current.windowStartedAtMs = now;
    renderWindowRef.current.renderCount = 0;
  });
}

function useLiveSalarySnapshot(): LiveSalaryMetrics {
  const store = useContext(LiveSalaryContext);
  if (!store) {
    throw new Error('LiveSalaryProvider is missing');
  }

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  if (!snapshot) {
    throw new Error('Live salary snapshot is unavailable');
  }

  return snapshot;
}

export function LiveSalaryProvider({
  dashboard,
  children,
}: {
  dashboard: DashboardDto | null;
  children: ReactNode;
}) {
  const [store] = useState(() => createLiveSalaryStore(dashboard));

  useEffect(() => {
    store.setDashboard(dashboard);
  }, [dashboard, store]);

  useEffect(() => {
    return () => {
      store.destroy();
    };
  }, [store]);

  return <LiveSalaryContext.Provider value={store}>{children}</LiveSalaryContext.Provider>;
}

function EarningsCard({
  icon,
  label,
  earnedIDR,
  earnedUSD,
}: {
  icon: ReactNode;
  label: string;
  earnedIDR: number;
  earnedUSD: number;
}) {
  return (
    <Card className="border-zinc-300/70 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-2xl">
          <DualCurrencyAmount
            idr={earnedIDR}
            usd={earnedUSD}
            className="space-y-1"
            primaryClassName="text-2xl"
            secondaryClassName="text-sm font-normal text-zinc-500 dark:text-zinc-400"
            secondaryPrefix="USD reference:"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <DashboardNote>{CALENDAR_PROGRESS_NOTE}</DashboardNote>
      </CardContent>
    </Card>
  );
}

export function StaticEarningsCards({
  earnedTodayIDR,
  earnedTodayUSD,
  earnedMonthIDR,
  earnedMonthUSD,
}: {
  earnedTodayIDR: number;
  earnedTodayUSD: number;
  earnedMonthIDR: number;
  earnedMonthUSD: number;
}) {
  return (
    <>
      <EarningsCard
        icon={<DollarSign className="size-4" />}
        label="Earned today"
        earnedIDR={earnedTodayIDR}
        earnedUSD={earnedTodayUSD}
      />
      <EarningsCard
        icon={<CalendarClock className="size-4" />}
        label="Earned this month"
        earnedIDR={earnedMonthIDR}
        earnedUSD={earnedMonthUSD}
      />
    </>
  );
}

export function LiveEarningsCards() {
  const snapshot = useLiveSalarySnapshot();
  useRenderDebug('LiveEarningsCards');

  return (
    <>
      <EarningsCard
        icon={<DollarSign className="size-4" />}
        label="Earned today"
        earnedIDR={snapshot.earnedTodayIDR}
        earnedUSD={snapshot.earnedTodayUSD}
      />
      <EarningsCard
        icon={<CalendarClock className="size-4" />}
        label="Earned this month"
        earnedIDR={snapshot.earnedMonthIDR}
        earnedUSD={snapshot.earnedMonthUSD}
      />
    </>
  );
}

export function LiveProgressCards({
  dailyTargetUSD,
  dailyTargetIDR,
  monthlyUSD,
  monthlyIDR,
}: {
  dailyTargetUSD: number;
  dailyTargetIDR: number;
  monthlyUSD: number;
  monthlyIDR: number;
}) {
  const snapshot = useLiveSalarySnapshot();
  useRenderDebug('LiveProgressCards');

  return (
    <>
      <Card className="border-zinc-300/70 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Today&apos;s progress</CardTitle>
          <CardDescription>Calendar-time progress for the current day.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
              <span className="font-semibold">{snapshot.dayProgressPercent.toFixed(2)}%</span>
            </div>
            <Progress value={snapshot.dayProgressPercent} />
          </div>
          <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Next milestone</p>
            <p className="font-semibold">{snapshot.dayMilestoneLabel}</p>
          </div>
          <Separator />
          <div>
            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Daily target</p>
            <DualCurrencyAmount
              idr={dailyTargetIDR}
              usd={dailyTargetUSD}
              primaryClassName="text-lg"
              secondaryClassName="text-sm"
              secondaryPrefix="USD reference:"
            />
          </div>
          <DashboardNote>{CALENDAR_PROGRESS_NOTE}</DashboardNote>
        </CardContent>
      </Card>

      <Card className="border-zinc-300/70 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Monthly progress</CardTitle>
          <CardDescription>Calendar-time progress for the current month.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
              <span className="font-semibold">{snapshot.monthProgressPercent.toFixed(2)}%</span>
            </div>
            <Progress value={snapshot.monthProgressPercent} />
          </div>
          <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Next milestone</p>
            <p className="font-semibold">{snapshot.monthMilestoneLabel}</p>
          </div>
          <Separator />
          <div>
            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Monthly target</p>
            <DualCurrencyAmount
              idr={monthlyIDR}
              usd={monthlyUSD}
              primaryClassName="text-lg"
              secondaryClassName="text-sm"
              secondaryPrefix="USD reference:"
            />
          </div>
          <DashboardNote>{CALENDAR_PROGRESS_NOTE}</DashboardNote>
        </CardContent>
      </Card>
    </>
  );
}
