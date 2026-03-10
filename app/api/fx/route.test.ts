import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

describe('fx route', () => {
  beforeEach(() => {
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
  });

  it('returns cacheable fx payload', async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    const cacheControl = response.headers.get('cache-control') ?? '';
    expect(cacheControl).toContain('s-maxage=');
    expect(cacheControl).not.toContain('no-store');
    expect(typeof payload.usdToIdr).toBe('number');
    expect(typeof payload.isStale).toBe('boolean');
  });
});
