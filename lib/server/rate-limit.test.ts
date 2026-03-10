import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { getRateLimitKey } from './rate-limit';

const originalVercel = process.env.VERCEL;

function restoreVercelEnv() {
  if (originalVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = originalVercel;
  }
}

function buildRequest({
  ip,
  headers,
}: {
  ip?: string;
  headers?: Record<string, string>;
}): NextRequest {
  return {
    ip,
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

describe('getRateLimitKey', () => {
  afterEach(() => {
    restoreVercelEnv();
  });

  it('prefers request.ip when available', () => {
    process.env.VERCEL = '1';
    const request = buildRequest({
      ip: '203.0.113.10',
      headers: {
        'x-forwarded-for': '198.51.100.1',
        'x-real-ip': '192.0.2.5',
      },
    });

    expect(getRateLimitKey(request)).toBe('203.0.113.10');
  });

  it('uses x-forwarded-for on Vercel when ip is missing', () => {
    process.env.VERCEL = '1';
    const request = buildRequest({
      headers: {
        'x-forwarded-for': '198.51.100.1, 10.0.0.1',
      },
    });

    expect(getRateLimitKey(request)).toBe('198.51.100.1');
  });

  it('ignores forwarded headers off Vercel and uses x-real-ip when provided', () => {
    delete process.env.VERCEL;
    const request = buildRequest({
      headers: {
        'x-forwarded-for': '198.51.100.1',
        'x-real-ip': '192.0.2.5',
      },
    });

    expect(getRateLimitKey(request)).toBe('192.0.2.5');
  });

  it('falls back to anonymous when no trusted headers are available', () => {
    delete process.env.VERCEL;
    const request = buildRequest({
      headers: {
        'x-forwarded-for': '198.51.100.1',
      },
    });

    expect(getRateLimitKey(request)).toBe('anonymous');
  });
});
