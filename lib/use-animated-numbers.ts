'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type AnimatedNumberMap = Record<string, number>;

type UseAnimatedNumbersOptions = {
  durationMs: number;
  enabled?: boolean;
};

const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_SALARY === '1';

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export function useAnimatedNumbers<T extends AnimatedNumberMap>(
  targets: T,
  options: UseAnimatedNumbersOptions
): T {
  const { durationMs, enabled = true } = options;
  const [animatedValues, setAnimatedValues] = useState<T>(targets);
  const frameRef = useRef<number | null>(null);
  const currentValuesRef = useRef<T>(targets);
  const previousTargetsRef = useRef<T | null>(null);
  const animationStatsRef = useRef<{
    startedAtMs: number;
    lastFrameAtMs: number | null;
    frameCount: number;
    droppedFrameCount: number;
    maxFrameDeltaMs: number;
  } | null>(null);

  useEffect(() => {
    currentValuesRef.current = animatedValues;
  }, [animatedValues]);

  useLayoutEffect(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (!enabled) {
      currentValuesRef.current = targets;
      previousTargetsRef.current = targets;
      queueMicrotask(() => {
        setAnimatedValues(targets);
      });
      return;
    }

    if (previousTargetsRef.current === null) {
      currentValuesRef.current = targets;
      previousTargetsRef.current = targets;
      queueMicrotask(() => {
        setAnimatedValues(targets);
      });
      return;
    }

    const targetEntries = Object.entries(targets) as Array<[keyof T, number]>;
    const hasChanged = targetEntries.some(([key, nextValue]) => {
      const previousValue = previousTargetsRef.current?.[key] ?? nextValue;
      return previousValue !== nextValue;
    });

    if (!hasChanged) {
      return;
    }

    if (durationMs <= 0) {
      currentValuesRef.current = targets;
      previousTargetsRef.current = targets;
      queueMicrotask(() => {
        setAnimatedValues(targets);
      });
      return;
    }

    const startedAt = performance.now();
    const startValues = { ...currentValuesRef.current };
    const previousTargets = previousTargetsRef.current;
    previousTargetsRef.current = targets;

    if (DEBUG_ENABLED) {
      const changedFields = targetEntries.reduce<string[]>((accumulator, [key, nextValue]) => {
        const startValue = startValues[key] ?? nextValue;
        const delta = nextValue - startValue;
        if (delta === 0) {
          return accumulator;
        }

        accumulator.push(String(key));
        return accumulator;
      }, []);

      console.debug('salary-debug-animated-targets', {
        durationMs,
        overlapRisk: frameRef.current !== null,
        changedFieldCount: changedFields.length,
        changedFields,
        previousTargetChanged:
          previousTargets === null
            ? null
            : targetEntries.some(([key, nextValue]) => previousTargets[key] !== nextValue),
      });
    }

    animationStatsRef.current = {
      startedAtMs: startedAt,
      lastFrameAtMs: null,
      frameCount: 0,
      droppedFrameCount: 0,
      maxFrameDeltaMs: 0,
    };

    const tick = (now: number) => {
      const stats = animationStatsRef.current;
      if (stats) {
        const frameDeltaMs =
          stats.lastFrameAtMs === null ? null : Number((now - stats.lastFrameAtMs).toFixed(2));

        stats.frameCount += 1;
        if (frameDeltaMs !== null) {
          if (frameDeltaMs > 20) {
            stats.droppedFrameCount += 1;
          }
          if (frameDeltaMs > stats.maxFrameDeltaMs) {
            stats.maxFrameDeltaMs = frameDeltaMs;
          }
        }
        stats.lastFrameAtMs = now;
      }

      const rawProgress = Math.min(1, (now - startedAt) / durationMs);
      const easedProgress = easeOutCubic(rawProgress);
      const nextValues = { ...targets };

      for (const [key, targetValue] of targetEntries) {
        const startValue = startValues[key] ?? targetValue;
        nextValues[key] = (startValue + (targetValue - startValue) * easedProgress) as T[keyof T];
      }

      currentValuesRef.current = nextValues;
      setAnimatedValues(nextValues);

      if (rawProgress < 1) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (DEBUG_ENABLED && animationStatsRef.current) {
        console.debug('salary-debug-animated-frames', {
          durationMs,
          elapsedMs: Number((now - animationStatsRef.current.startedAtMs).toFixed(2)),
          frameCount: animationStatsRef.current.frameCount,
          droppedFrameCount: animationStatsRef.current.droppedFrameCount,
          maxFrameDeltaMs: Number(animationStatsRef.current.maxFrameDeltaMs.toFixed(2)),
        });
      }

      animationStatsRef.current = null;
      frameRef.current = null;
      currentValuesRef.current = targets;
      setAnimatedValues(targets);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      animationStatsRef.current = null;
    };
  }, [durationMs, enabled, targets]);

  return animatedValues;
}
