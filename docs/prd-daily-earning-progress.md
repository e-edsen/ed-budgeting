# PRD: Daily Earning and Daily Progress

## Context

The app currently shows monthly earning progress in real time and FX conversion. It does not show daily earning context, does not expose timezone offset in the clock area, and uses a mostly linear card stack.

## Problem

Users can see monthly progress, but they cannot quickly answer:

- how much has been earned today
- how far the current day has progressed by time
- whether earning progression is tracking daily target
- which GMT offset is driving the displayed clock

This limits day-to-day motivation and can cause timezone ambiguity.

## Goals

- Show daily earning in both USD and IDR.
- Show daily progress with two signals:
  - time progress in current local calendar day
  - earning progress against daily target
- Show GMT offset alongside current time display.
- Move dashboard into a responsive `N x M` grid where both dimensions are greater than `1` for non-linear scanability.
- Keep existing monthly metrics and FX behavior intact.

## Non-goals

- No backend persistence.
- No historical charts.
- No work-shift/business-hours model.
- No localization overhaul beyond existing formatting behavior.

## Target User

Single-user personal tracker owner who monitors compensation accumulation throughout the day.

## User Stories

- As a user, I want to see my earning for today so I can measure current-day progress.
- As a user, I want a day time progress bar so I can compare earning pace vs elapsed time.
- As a user, I want daily earning progress to daily target so I can know if I am on track.
- As a user, I want explicit `GMT+/-X` shown near the clock so timezone assumptions are transparent.
- As a user, I want cards in a dashboard grid so key metrics are easier to scan.

## Functional Requirements

1. Daily earning card
   - Display current day accumulated earning in USD and IDR.
2. Daily progress card
   - Display `time progress` percentage in current day.
   - Display `earning progress` percentage against computed daily target.
3. Daily target values
   - Display target/day in USD and IDR.
4. Current time timezone
   - Show explicit GMT offset label (`GMT+7`, `GMT-5`, etc).
5. Responsive layout
   - Use a multi-column grid on medium+ screens.
   - Keep single-column only for narrow/mobile screens.

## Acceptance Criteria

- Daily earning updates continuously using existing tick interval.
- Daily earning resets at local midnight.
- Time progress starts at `0%` at local `00:00:00` and reaches near `100%` at day end.
- Earning progress equals `dailyEarned / dailyTarget` and remains bounded to `0..100%`.
- GMT offset is visible in the top section at all times when clock is available.
- On medium and large screens, layout is not linear-only and renders as `N x M` grid.
- Existing month earning, month progress, monthly total, and FX rate remain present.

## Edge Cases

- Month boundaries with variable day count (`28/29/30/31` days).
- Leap years in February.
- GMT offsets with non-hour increments (for example `GMT+5:30`).
- Stale FX response fallback should still allow rendering with last known rate.
- Temporary client hydration state should not render invalid date output.

## UX Requirements

- Keep card visual hierarchy consistent and minimal.
- Prioritize daily metrics near top area.
- Use concise labels and percentages with two decimal precision.
- Keep dark mode contrast equivalent to existing baseline.

## Success Metrics

- Correctness: computed values match formula checks in deterministic test cases.
- Usability: all core metrics visible without vertical-only scan pattern on desktop/tablet.
- Stability: no regression in existing monthly cards and FX refresh behavior.
