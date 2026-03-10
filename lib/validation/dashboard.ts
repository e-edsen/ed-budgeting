import { z } from 'zod';

const finiteNumberSchema = z.number().finite();
const positiveNumberSchema = z.coerce.number().finite().positive();
const positiveIntegerSchema = z.number().int().positive();
const nullableOffsetSchema = z
  .preprocess((value) => (value === null || value === undefined ? null : value), z.coerce.number().int().min(-14 * 60).max(14 * 60).nullable());
const nullableTimezoneSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}, z.string().min(1).nullable());

export const currencyCodeSchema = z.enum(['USD', 'IDR']);

const nonNegativeNumberSchema = z.coerce.number().finite().min(0);

export const dashboardUserConfigSchema = z
  .object({
    salaryAmount: positiveNumberSchema,
    salaryCurrency: currencyCodeSchema,
    monthlySpendingAmount: positiveNumberSchema,
    monthlySpendingCurrency: currencyCodeSchema,
    monthlyRentAmount: nonNegativeNumberSchema.optional().default(0),
    monthlyRentCurrency: currencyCodeSchema.optional().default('IDR'),
  })
  .strict();

export const dashboardRequestSchema = z
  .object({
    clientTimezone: nullableTimezoneSchema.optional().default(null),
    clientOffsetMinutes: nullableOffsetSchema.optional().default(null),
    config: dashboardUserConfigSchema,
  })
  .strict();

export const storedUserConfigSchema = dashboardUserConfigSchema
  .extend({
    version: z.literal(1),
    updatedAt: z.string().min(1),
  })
  .strict();

const emergencyFundTargetsSchema = z
  .object({
    x6: finiteNumberSchema,
    x12: finiteNumberSchema,
    x24: finiteNumberSchema,
    x36: finiteNumberSchema,
  })
  .strict();

export const dashboardResponseSchema = z
  .object({
    generatedAt: z.string().min(1),
    nowLabel: z.string().min(1),
    timezoneLabel: z.string().min(1),
    fx: z
      .object({
        usdToIdr: finiteNumberSchema.positive(),
        isStale: z.boolean(),
        lastUpdatedAt: z.number().int().nonnegative().nullable(),
        lastUpdatedLabel: z.string().min(1),
      })
      .strict(),
    salary: z
      .object({
        earnedTodayUSD: finiteNumberSchema,
        earnedTodayIDR: finiteNumberSchema,
        earnedMonthUSD: finiteNumberSchema,
        earnedMonthIDR: finiteNumberSchema,
        dailyTargetUSD: finiteNumberSchema,
        dailyTargetIDR: finiteNumberSchema,
        monthlyUSD: finiteNumberSchema,
        monthlyIDR: finiteNumberSchema,
        hourlyUSD: finiteNumberSchema,
        hourlyIDR: finiteNumberSchema,
        dayProgressPercent: finiteNumberSchema,
        monthProgressPercent: finiteNumberSchema,
        dayMilestoneLabel: z.string().min(1),
        monthMilestoneLabel: z.string().min(1),
      })
      .strict(),
    finance: z
      .object({
        monthlySpendingUSD: finiteNumberSchema,
        monthlySpendingIDR: finiteNumberSchema,
        estimatedDailySpendingUSD: finiteNumberSchema,
        estimatedDailySpendingIDR: finiteNumberSchema,
        moneyNeededUntilEndOfMonthUSD: finiteNumberSchema,
        moneyNeededUntilEndOfMonthIDR: finiteNumberSchema,
        retirementTargetFromSalaryUSD: finiteNumberSchema,
        retirementTargetFromSalaryIDR: finiteNumberSchema,
        retirementTargetFromSpendingUSD: finiteNumberSchema,
        retirementTargetFromSpendingIDR: finiteNumberSchema,
        estimatedHoursToReachSpending: finiteNumberSchema,
        estimatedDaysHoursToReachSpendingLabel: z.string().min(1),
        disposableIncomeUSD: finiteNumberSchema,
        disposableIncomeIDR: finiteNumberSchema,
        savingsRate: finiteNumberSchema,
        emergencyFundFromSalaryUSD: emergencyFundTargetsSchema,
        emergencyFundFromSalaryIDR: emergencyFundTargetsSchema,
        emergencyFundFromSpendingUSD: emergencyFundTargetsSchema,
        emergencyFundFromSpendingIDR: emergencyFundTargetsSchema,
      })
      .strict(),
    config: z
      .object({
        amount: finiteNumberSchema.positive(),
        currency: currencyCodeSchema,
        refreshIntervalMs: positiveIntegerSchema,
        fxRefreshMs: positiveIntegerSchema,
        monthlySpending: finiteNumberSchema.positive(),
        monthlySpendingCurrency: currencyCodeSchema,
        monthlyRent: finiteNumberSchema.nonnegative(),
        monthlyRentCurrency: currencyCodeSchema,
      })
      .strict(),
    telemetry: z
      .object({
        clientTimezone: z.string().min(1).nullable(),
        clientOffsetMinutes: z.number().int().min(-14 * 60).max(14 * 60).nullable(),
      })
      .strict(),
  })
  .strict();

export function parseDashboardRequest(value: unknown) {
  const parsed = dashboardRequestSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseDashboardResponse(value: unknown) {
  const parsed = dashboardResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseStoredUserConfig(value: unknown) {
  const parsed = storedUserConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseUserConfig(value: unknown) {
  const parsed = dashboardUserConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
