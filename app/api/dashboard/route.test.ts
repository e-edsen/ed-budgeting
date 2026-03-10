import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { resetDashboardRateLimitState } from '../../../lib/server/rate-limit';

const validBody = {
  clientTimezone: 'Asia/Jakarta',
  clientOffsetMinutes: -420,
  config: {
    salaryAmount: 12_224_520,
    salaryCurrency: 'IDR',
    monthlySpendingAmount: 5_000_000,
    monthlySpendingCurrency: 'IDR',
  },
};

function createRequest(body: unknown, ip = '203.0.113.10') {
  return new NextRequest('http://localhost:3000/api/dashboard', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
  });
}

describe('dashboard route', () => {
  beforeEach(() => {
    resetDashboardRateLimitState();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ rates: { IDR: 16_000 } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetDashboardRateLimitState();
  });

  it('returns dashboard payload', async () => {
    const request = createRequest(validBody);
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-ratelimit-limit')).toBe('30');
    expect(typeof payload.generatedAt).toBe('string');
    expect(typeof payload.nowLabel).toBe('string');
    expect(typeof payload.timezoneLabel).toBe('string');
    expect(typeof payload.fx.usdToIdr).toBe('number');
    expect(typeof payload.salary.dayProgressPercent).toBe('number');
    expect(typeof payload.finance.savingsRate).toBe('number');
    expect(typeof payload.finance.retirementTargetFromSalaryIDR).toBe('number');
    expect(typeof payload.finance.retirementTargetFromSalaryUSD).toBe('number');
    expect(typeof payload.finance.retirementTargetFromSpendingIDR).toBe('number');
    expect(typeof payload.finance.retirementTargetFromSpendingUSD).toBe('number');
    expect(typeof payload.finance.estimatedDailySpendingIDR).toBe('number');
    expect(typeof payload.finance.estimatedDailySpendingUSD).toBe('number');
    expect(typeof payload.finance.moneyNeededUntilEndOfMonthIDR).toBe('number');
    expect(typeof payload.finance.moneyNeededUntilEndOfMonthUSD).toBe('number');
    expect(typeof payload.finance.emergencyFundFromSalaryIDR.x36).toBe('number');
    expect(typeof payload.finance.emergencyFundFromSalaryUSD.x36).toBe('number');
    expect(typeof payload.finance.emergencyFundFromSpendingIDR.x36).toBe('number');
    expect(typeof payload.finance.emergencyFundFromSpendingUSD.x36).toBe('number');
  });

  it('returns 400 for malformed payload', async () => {
    const request = createRequest({
      clientTimezone: 'Asia/Jakarta',
      clientOffsetMinutes: -420,
      config: {
        salaryAmount: 10_000,
        salaryCurrency: 'EUR',
        monthlySpendingAmount: 5_000,
        monthlySpendingCurrency: 'IDR',
      },
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(payload.message).toBe('Invalid dashboard request payload');
  });

  it('returns 429 when the same IP exceeds the rate limit window', async () => {
    for (let index = 0; index < 30; index += 1) {
      const response = await POST(createRequest(validBody, '198.51.100.9'));
      expect(response.status).toBe(200);
    }

    const throttledResponse = await POST(createRequest(validBody, '198.51.100.9'));
    const payload = await throttledResponse.json();

    expect(throttledResponse.status).toBe(429);
    expect(throttledResponse.headers.get('retry-after')).not.toBeNull();
    expect(payload.message).toBe('Too many requests. Please wait before trying again.');
  });
});
