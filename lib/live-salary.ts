import { DashboardDto } from './contracts/dashboard';
import { calculateDailyEarned, calculateEarned, getDayProgress, getMonthProgress, getNextPercentMilestone } from './salary';

export type LiveSalaryMetrics = {
  earnedTodayUSD: number;
  earnedTodayIDR: number;
  earnedMonthUSD: number;
  earnedMonthIDR: number;
  dayProgressPercent: number;
  monthProgressPercent: number;
  dayMilestoneLabel: string;
  monthMilestoneLabel: string;
};

const milestoneFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatMilestoneLabel(now: Date, scope: 'day' | 'month'): string {
  const milestone = getNextPercentMilestone(now, scope);
  if (milestone.nextPercent === null || milestone.timestamp === null) {
    return 'Completed';
  }

  return `${milestone.nextPercent}% at ${milestoneFormatter.format(milestone.timestamp)}`;
}

export function calculateLiveSalaryMetrics(dashboard: DashboardDto, now: Date): LiveSalaryMetrics {
  const dayProgress = getDayProgress(now);
  const monthProgress = getMonthProgress(now);

  return {
    earnedTodayUSD: calculateDailyEarned(dashboard.salary.dailyTargetUSD, dayProgress),
    earnedTodayIDR: calculateDailyEarned(dashboard.salary.dailyTargetIDR, dayProgress),
    earnedMonthUSD: calculateEarned(dashboard.salary.monthlyUSD, monthProgress),
    earnedMonthIDR: calculateEarned(dashboard.salary.monthlyIDR, monthProgress),
    dayProgressPercent: dayProgress * 100,
    monthProgressPercent: monthProgress * 100,
    dayMilestoneLabel: formatMilestoneLabel(now, 'day'),
    monthMilestoneLabel: formatMilestoneLabel(now, 'month'),
  };
}
