import { NextRequest } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function getRateLimitKey(request: NextRequest): string {
  if (request.ip) {
    return request.ip;
  }

  const isVercel = Boolean(process.env.VERCEL);
  if (isVercel) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      const firstIp = forwardedFor.split(',')[0]?.trim();
      if (firstIp) {
        return firstIp;
      }
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || 'anonymous';
}

export function consumeDashboardRateLimit(
  request: NextRequest,
  now = Date.now()
): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
} {
  pruneExpiredBuckets(now);

  const key = getRateLimitKey(request);
  const currentBucket = buckets.get(key);

  if (!currentBucket || currentBucket.resetAt <= now) {
    const nextBucket = {
      count: 1,
      resetAt: now + WINDOW_MS,
    };
    buckets.set(key, nextBucket);

    return {
      allowed: true,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS - 1,
      resetAt: nextBucket.resetAt,
      retryAfterSeconds: Math.ceil(WINDOW_MS / 1000),
    };
  }

  if (currentBucket.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      resetAt: currentBucket.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((currentBucket.resetAt - now) / 1000)),
    };
  }

  currentBucket.count += 1;

  return {
    allowed: true,
    limit: MAX_REQUESTS,
    remaining: MAX_REQUESTS - currentBucket.count,
    resetAt: currentBucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((currentBucket.resetAt - now) / 1000)),
  };
}

export function resetDashboardRateLimitState() {
  buckets.clear();
}
