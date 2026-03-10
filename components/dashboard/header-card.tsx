'use client';

import { Clock3, PencilLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFxBadgeLabel } from '@/lib/dashboard-content';

export function DashboardHeaderCard({
  nowLabel,
  timezoneLabel,
  isFxStale,
  onEditValues,
}: {
  nowLabel: string;
  timezoneLabel: string;
  isFxStale: boolean;
  onEditValues: () => void;
}) {
  return (
    <Card className="overflow-hidden border-zinc-300/70 dark:border-zinc-800">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="gap-1">
              <Clock3 className="size-3.5" />
              Live dashboard
            </Badge>
            <div className="space-y-1">
              <CardTitle className="text-3xl md:text-4xl">Ed Budgeting - Salary, Budgeting and More</CardTitle>
              <CardDescription className="text-base">
                Fast salary, finance, and FX context in one place.
              </CardDescription>
            </div>
          </div>

          <Button variant="secondary" onClick={onEditValues} className="w-full justify-center sm:w-auto">
            <PencilLine className="size-4" />
            Edit values
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Local time</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{nowLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="max-w-full whitespace-normal text-center">
              {timezoneLabel}
            </Badge>
            <Badge variant={isFxStale ? 'outline' : 'default'}>{getFxBadgeLabel(isFxStale)}</Badge>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
