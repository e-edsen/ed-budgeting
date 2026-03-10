# PRD: Browser-Persisted User Config

## Context

The app currently calculates salary and finance metrics from hardcoded values in [lib/config.ts](C:\Users\PC\Documents\Code\Personal\ed-live-salary\lib\config.ts). The dashboard API in [app/api/dashboard/route.ts](C:\Users\PC\Documents\Code\Personal\ed-live-salary\app\api\dashboard\route.ts) delegates to [lib/server/dashboard.ts](C:\Users\PC\Documents\Code\Personal\ed-live-salary\lib\server\dashboard.ts), which computes all displayed metrics from those hardcoded constants and echoes them back through `data.config`. The `Config` tab in [app/page.tsx](C:\Users\PC\Documents\Code\Personal\ed-live-salary\app\page.tsx) currently renders a read-only `Runtime Config` card instead of an actual user-editable settings flow.

This works for local experimentation, but it is not a real product experience. Users should not need to edit source files to see their own numbers.

## Problem

Users currently cannot:

- enter their own monthly salary from the UI
- enter their own monthly spending from the UI
- persist those values across revisits
- adjust settings without touching code

The current `Runtime Config` card exposes implementation details, but it does not solve the actual user need. It also makes the Config tab feel diagnostic instead of useful.

## Goals

- Ask the user for `monthly salary` and `monthly spending` on first visit.
- Let the user choose `USD` or `IDR` for both values.
- Persist the values in the browser so revisits do not require re-entry.
- Keep server-driven dashboard calculations and FX behavior intact.
- Replace the current read-only `Runtime Config` card with real config management UX.
- Add an `Estimated Daily Spending` card derived from monthly spending and current month length.
- Keep new UI visually aligned with the current `shadcn` setup.

## Non-goals

- Backend persistence
- Multi-user accounts or authentication
- Storing daily spending as a source of truth
- Per-user FX refresh customization
- Replacing the existing salary/finance calculation model

## Target User

Single-user personal tracker owner who wants a no-code setup flow and wants the dashboard to remember their values between visits.

## User Stories

- As a first-time user, I want to enter my monthly salary and monthly spending before using the dashboard so the app reflects my real numbers immediately.
- As a returning user, I want my previously entered values restored automatically so I do not have to repeat setup.
- As a user, I want to edit my stored salary and spending from the Config area so I can adjust the tracker later.
- As a user, I want a way to reset or replace my stored values so I can recover from bad input.
- As a user, I want to see estimated daily spending so I can mentally map my monthly burn rate to a day-level number.

## Product Decisions

- Source of truth is `monthly salary` plus `monthly spending`.
- Daily spending is derived only and should not be separately stored.
- First visit uses a blocking onboarding/modal flow before normal dashboard usage.
- Browser storage is the persistence layer.
- Config management remains inside the app and should reuse the current `shadcn` styling approach. If another primitive is needed, it should still come from the same `shadcn` ecosystem.

## Functional Requirements

1. First-run setup
   - When no valid stored config exists, the app must show a blocking onboarding flow before normal dashboard interaction.
   - The onboarding flow must collect:
     - monthly salary amount
     - monthly salary currency (`USD` or `IDR`)
     - monthly spending amount
     - monthly spending currency (`USD` or `IDR`)

2. Browser persistence
   - Submitted config must be stored in the client browser.
   - On revisit, the app must restore the stored config before fetching dashboard data with user-specific values.

3. Config management
   - The `Config` tab must provide a real editable settings surface.
   - The current read-only `Runtime Config` card must be removed.
   - Users must be able to update existing stored values.
   - Users must be able to reset stored values and return to onboarding.

4. Salary and finance calculations
   - Existing dashboard calculations must continue to use the current server-driven model.
   - User-entered values must replace hardcoded runtime values used by the dashboard calculation pipeline.

5. Estimated daily spending
   - The dashboard must show a new card for `Estimated Daily Spending`.
   - The estimate must be derived from monthly spending and the current month length in the same local time context already used by the dashboard.
   - The card must display the estimate in both USD and IDR.

## UX Requirements

- The onboarding flow should feel like product setup, not a debug form.
- The modal or dialog should block dashboard usage until valid values are submitted or restored.
- The Config tab should shift from diagnostics to user controls.
- The UI should continue using the current `shadcn` component style and spacing rhythm.
- If additional UI primitives are needed, they should be added from the same `shadcn` approach rather than mixing systems.

## Acceptance Criteria

- On first visit with no stored config, the app shows a blocking onboarding flow.
- The user can submit monthly salary and monthly spending in `USD` or `IDR`.
- After submission, the values are persisted in the browser and used for dashboard calculations.
- On revisit, the app restores the stored values automatically and does not ask again unless the stored config is missing, invalid, or reset.
- The current `Runtime Config` card is no longer shown in the Config tab.
- The Config tab includes an editable settings experience for the stored values.
- Updating config in the app causes the dashboard to refresh with the new values.
- Resetting config clears the stored values and returns the app to onboarding.
- `Estimated Daily Spending` is shown as a derived card and changes correctly across months with `28`, `29`, `30`, and `31` days.
- Existing live salary, month progress, timezone handling, and FX status behavior remain available.

## Edge Cases

- Missing or corrupted stored config
- Stored config shape changes between versions
- `0` values, empty strings, or non-finite numeric input
- Mixed currencies between salary and spending
- Leap-year February
- FX fallback or stale FX data during derived conversions
- Timezone-sensitive month boundaries affecting the estimated daily spending divisor

## Success Metrics

- Setup friction is reduced by removing code edits from the user path.
- Returning users can re-open the app and immediately see their configured dashboard.
- Derived daily spending is mathematically consistent with monthly spending and month length.
- Config management feels like part of the product instead of an internal debug panel.
