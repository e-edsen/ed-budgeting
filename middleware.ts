import { NextRequest, NextResponse } from 'next/server';

function createNonce(): string {
  const uuid = crypto.randomUUID();
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(uuid).toString('base64');
  }
  return btoa(uuid);
}

function buildContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.exchangerate-api.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'block-all-mixed-content',
    'upgrade-insecure-requests',
  ].join('; ');
}

function isPrefetchRequest(request: NextRequest): boolean {
  if (request.headers.get('x-middleware-prefetch')) {
    return true;
  }
  const purpose = request.headers.get('purpose') ?? request.headers.get('sec-purpose');
  return purpose === 'prefetch';
}

export function middleware(request: NextRequest) {
  if (isPrefetchRequest(request)) {
    return NextResponse.next();
  }

  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce));
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api|favicon.ico).*)'],
};
