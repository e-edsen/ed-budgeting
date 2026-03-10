import { NextResponse } from 'next/server';
import { getFxStateWithAutoRefresh } from '../../../lib/fx';
import { DASHBOARD_RUNTIME_CONFIG } from '../../../lib/config';

const fxTtlSeconds = Math.max(1, Math.floor(DASHBOARD_RUNTIME_CONFIG.fxRefreshMs / 1000));
const CACHE_HEADERS = {
  'Cache-Control': `public, s-maxage=${fxTtlSeconds}, stale-while-revalidate=86400`,
};

export async function GET() {
  const fxState = await getFxStateWithAutoRefresh(DASHBOARD_RUNTIME_CONFIG.fxRefreshMs);

  return NextResponse.json(
    {
      usdToIdr: fxState.usdToIdr,
      lastUpdatedAt: fxState.lastUpdatedAt,
      isStale: fxState.isStale,
    },
    {
      status: 200,
      headers: CACHE_HEADERS,
    }
  );
}
