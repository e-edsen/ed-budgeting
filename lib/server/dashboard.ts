import { DASHBOARD_RUNTIME_CONFIG } from '../config';
import { buildDashboardDto } from '../dashboard/build-dashboard';
import { FxState, getFxStateWithAutoRefresh } from '../fx';
import { DashboardDiagnostics, DashboardDto, DashboardUserConfigDto } from '../contracts/dashboard';

export interface BuildDashboardParams {
  clientTimezone: string | null;
  clientOffsetMinutes: number | null;
  config: DashboardUserConfigDto;
  now?: Date;
  fxStateLoader?: () => Promise<FxState>;
}

export interface BuildDashboardResult {
  data: DashboardDto;
  diagnostics: DashboardDiagnostics;
}

export async function buildDashboardData({
  clientTimezone,
  clientOffsetMinutes,
  config,
  now = new Date(),
  fxStateLoader,
}: BuildDashboardParams): Promise<BuildDashboardResult> {
  const computeStartedAt = Date.now();

  const fxStartedAt = Date.now();
  const fxState = await (fxStateLoader
    ? fxStateLoader()
    : getFxStateWithAutoRefresh(DASHBOARD_RUNTIME_CONFIG.fxRefreshMs));
  const fxFetchDurationMs = Date.now() - fxStartedAt;

  const data = buildDashboardDto({
    clientTimezone,
    clientOffsetMinutes,
    config,
    fxState,
    now,
    runtimeConfig: DASHBOARD_RUNTIME_CONFIG,
  });

  const diagnostics: DashboardDiagnostics = {
    computeDurationMs: Date.now() - computeStartedAt,
    fxFetchDurationMs,
    fxIsStale: fxState.isStale,
    fxAgeMs: fxState.lastUpdatedAt === null ? null : Date.now() - fxState.lastUpdatedAt,
    clientTimezone: data.telemetry.clientTimezone,
    clientOffsetMinutes: data.telemetry.clientOffsetMinutes,
  };

  return {
    data,
    diagnostics,
  };
}
