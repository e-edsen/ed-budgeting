import { NextRequest, NextResponse } from 'next/server';
import { buildDashboardData } from '../../../lib/server/dashboard';
import { normalizeDashboardRequest } from '../../../lib/user-config';
import { consumeDashboardRateLimit } from '../../../lib/server/rate-limit';

const DEBUG_SERVER = process.env.DEBUG_SALARY_SERVER === '1';
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
};

function getResponseHeaders(rateLimit: ReturnType<typeof consumeDashboardRateLimit>) {
  return {
    ...NO_STORE_HEADERS,
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.resetAt),
  };
}

export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();
  const rateLimit = consumeDashboardRateLimit(request);
  let body: unknown;

  if (!rateLimit.allowed) {
    if (DEBUG_SERVER) {
      console.debug('salary-debug-server', {
        requestDurationMs: Date.now() - requestStartedAt,
        responseStatus: 429,
        rateLimitRemaining: rateLimit.remaining,
      });
    }

    return NextResponse.json(
      {
        message: 'Too many requests. Please wait before trying again.',
      },
      {
        status: 429,
        headers: {
          ...getResponseHeaders(rateLimit),
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  try {
    body = await request.json();
  } catch {
    if (DEBUG_SERVER) {
      console.debug('salary-debug-server', {
        requestDurationMs: Date.now() - requestStartedAt,
        responseStatus: 400,
        error: 'invalid-json-body',
      });
    }

    return NextResponse.json(
      {
        message: 'Invalid dashboard request body',
      },
      {
        status: 400,
        headers: getResponseHeaders(rateLimit),
      }
    );
  }

  const normalizedRequest = normalizeDashboardRequest(body);
  if (!normalizedRequest) {
    if (DEBUG_SERVER) {
      console.debug('salary-debug-server', {
        requestDurationMs: Date.now() - requestStartedAt,
        responseStatus: 400,
        error: 'invalid-dashboard-request',
      });
    }

    return NextResponse.json(
      {
        message: 'Invalid dashboard request payload',
      },
      {
        status: 400,
        headers: getResponseHeaders(rateLimit),
      }
    );
  }

  try {
    const { data, diagnostics } = await buildDashboardData({
      clientTimezone: normalizedRequest.clientTimezone,
      clientOffsetMinutes: normalizedRequest.clientOffsetMinutes,
      config: normalizedRequest.config,
    });

    if (DEBUG_SERVER) {
      console.debug('salary-debug-server', {
        requestDurationMs: Date.now() - requestStartedAt,
        responseStatus: 200,
        computeDurationMs: diagnostics.computeDurationMs,
        fxFetchDurationMs: diagnostics.fxFetchDurationMs,
        fxIsStale: diagnostics.fxIsStale,
        fxAgeMs: diagnostics.fxAgeMs,
        clientTimezone: diagnostics.clientTimezone,
        clientOffsetMinutes: diagnostics.clientOffsetMinutes,
        rateLimitRemaining: rateLimit.remaining,
      });
    }

    return NextResponse.json(data, {
      status: 200,
      headers: getResponseHeaders(rateLimit),
    });
  } catch (error) {
    if (DEBUG_SERVER) {
      console.debug('salary-debug-server', {
        requestDurationMs: Date.now() - requestStartedAt,
        responseStatus: 500,
        clientTimezone: normalizedRequest.clientTimezone,
        clientOffsetMinutes: normalizedRequest.clientOffsetMinutes,
        error: error instanceof Error ? error.message : 'unknown-error',
      });
    }

    return NextResponse.json(
      {
        message: 'Failed to fetch dashboard data',
      },
      {
        status: 500,
        headers: getResponseHeaders(rateLimit),
      }
    );
  }
}
