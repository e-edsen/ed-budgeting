'use client';

import { BriefcaseBusiness, TimerReset } from 'lucide-react';

import { DashboardNote, DualCurrencyAmount, SectionIntro } from '@/components/dashboard/display';
import { LiveProgressCards } from '@/components/live-salary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CALENDAR_PROGRESS_NOTE,
  SECONDARY_CURRENCY_NOTE,
  WORKDAY_MODEL_NOTE,
} from '@/lib/dashboard-content';

export function SalaryTabContent({
  hasDashboard,
  dailyTargetUSD,
  dailyTargetIDR,
  monthlyUSD,
  monthlyIDR,
  hourlyUSD,
  hourlyIDR,
}: {
  hasDashboard: boolean;
  dailyTargetUSD: number;
  dailyTargetIDR: number;
  monthlyUSD: number;
  monthlyIDR: number;
  hourlyUSD: number;
  hourlyIDR: number;
}) {
  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Salary"
        title="Timeline pace"
        description="Live calendar progress for today and this month, plus a simple workday estimate for hourly income."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {hasDashboard ? (
          <LiveProgressCards
            dailyTargetUSD={dailyTargetUSD}
            dailyTargetIDR={dailyTargetIDR}
            monthlyUSD={monthlyUSD}
            monthlyIDR={monthlyIDR}
          />
        ) : null}

        <Card className="border-zinc-300/70 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="size-4" />
              Hourly estimate
            </CardTitle>
            <CardDescription>Simple workday view of your monthly income.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DualCurrencyAmount
              idr={hourlyIDR}
              usd={hourlyUSD}
              primaryClassName="text-3xl"
              secondaryPrefix="USD reference:"
            />
            <DashboardNote>{WORKDAY_MODEL_NOTE}</DashboardNote>
          </CardContent>
        </Card>

        <Card className="border-zinc-300/70 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TimerReset className="size-4" />
              Calculation basis
            </CardTitle>
            <CardDescription>What drives the live numbers on this page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DashboardNote>{CALENDAR_PROGRESS_NOTE} Today and month progress follow this rule.</DashboardNote>
            <DashboardNote>{WORKDAY_MODEL_NOTE} Hourly estimates use this rule.</DashboardNote>
            <DashboardNote>{SECONDARY_CURRENCY_NOTE}</DashboardNote>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
