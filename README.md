# Ed Budgeting

A small [Next.js](https://nextjs.org) App Router project that shows live salary progress, daily earning pace, and FX-converted finance metrics in `IDR` and `USD`.

## What It Does

- Tracks live daily and monthly salary progress
- Converts between `USD` and `IDR` using a server-side FX fetch
- Shows daily spending estimates, savings rate, and retirement targets
- Uses client-side interpolation for smooth live updates between server refreshes

## Local Development

Install dependencies and start the app:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

## Config Behavior

User salary and spending values are entered through the UI.

- By default, values stay only in the current browser session.
- Users can explicitly opt in to remembering values in `localStorage`.
- Server refreshes are intentionally slow, while the UI animates locally between refreshes.

Runtime defaults live in `lib/config.ts`:

```ts
export const DASHBOARD_RUNTIME_CONFIG = {
  refreshIntervalMs: 60_000,
  fxRefreshMs: 3_600_000,
};
```

## Environment Variables

Copy `.env.example` if needed.

Current env flags:

- `NEXT_PUBLIC_DEBUG_SALARY=0`
- `DEBUG_SALARY_SERVER=0`

Keep both disabled in production. They are intended only for local troubleshooting.

## Production Notes

- This app is meant for a real Next.js runtime such as Vercel, not static hosting.
- `/api/dashboard` is a public API route and is rate limited in-process.
- Security headers are set in `next.config.ts`.
- The FX source is external, so stale-rate fallback behavior is expected if the provider is slow or unavailable.

## Vercel Deployment

Recommended deployment flow:

1. Set the project to use Node `20.9+`.
2. Keep both debug env flags at `0` in Vercel.
3. Run the full verification locally before deploying:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

4. Import the repo into Vercel and deploy with the default Next.js settings.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Radix UI primitives
- Zod for runtime boundary validation
