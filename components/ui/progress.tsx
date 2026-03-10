import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@/lib/utils';

const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_SALARY === '1';

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const progressValue = Math.max(0, Math.min(100, value ?? 0));
  const progressId = React.useId();
  const indicatorRef = React.useRef<HTMLDivElement | null>(null);
  const flowRef = React.useRef<HTMLDivElement | null>(null);
  const stripesRef = React.useRef<HTMLSpanElement | null>(null);
  const latestValueRef = React.useRef(progressValue);
  const previousValueRef = React.useRef<number | null>(null);
  const lastValueChangeAtRef = React.useRef<number | null>(null);
  const lastFlowIterationAtRef = React.useRef<number | null>(null);
  const lastStripesIterationAtRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    latestValueRef.current = progressValue;
  }, [progressValue]);

  React.useEffect(() => {
    if (!DEBUG_ENABLED) {
      return;
    }

    console.debug('progress-debug', {
      event: 'mount',
      progressId,
      value: Number(latestValueRef.current.toFixed(4)),
    });

    return () => {
      console.debug('progress-debug', {
        event: 'unmount',
        progressId,
        value: Number(latestValueRef.current.toFixed(4)),
      });
    };
  }, [progressId]);

  React.useEffect(() => {
    if (!DEBUG_ENABLED) {
      previousValueRef.current = progressValue;
      return;
    }

    const now = performance.now();
    const previousValue = previousValueRef.current;
    const sinceLastValueMs =
      lastValueChangeAtRef.current === null ? null : Number((now - lastValueChangeAtRef.current).toFixed(2));

    console.debug('progress-debug', {
      event: previousValue === null ? 'value-init' : 'value-change',
      progressId,
      value: Number(progressValue.toFixed(4)),
      previousValue: previousValue === null ? null : Number(previousValue.toFixed(4)),
      delta: previousValue === null ? null : Number((progressValue - previousValue).toFixed(4)),
      sinceLastValueMs,
    });

    previousValueRef.current = progressValue;
    lastValueChangeAtRef.current = now;
  }, [progressId, progressValue]);

  React.useEffect(() => {
    if (!DEBUG_ENABLED) {
      return;
    }

    const flowNode = flowRef.current;
    const stripesNode = stripesRef.current;

    if (!flowNode || !stripesNode) {
      return;
    }

    const createIterationLogger =
      (
        animationName: 'progress-flow' | 'progress-stripes',
        node: HTMLDivElement | HTMLSpanElement,
        lastIterationAtRef: React.MutableRefObject<number | null>
      ) =>
      (event: AnimationEvent) => {
        const now = performance.now();
        const previousIterationAt = lastIterationAtRef.current;
        const sinceLastIterationMs =
          previousIterationAt === null ? null : Number((now - previousIterationAt).toFixed(2));
        const sinceLastValueChangeMs =
          lastValueChangeAtRef.current === null ? null : Number((now - lastValueChangeAtRef.current).toFixed(2));
        const computedStyle = getComputedStyle(node);

        console.debug('progress-debug', {
          event: 'animation-iteration',
          progressId,
          animationName,
          elapsedTimeSec: Number(event.elapsedTime.toFixed(3)),
          sinceLastIterationMs,
          sinceLastValueChangeMs,
          valueChangedDuringCurrentLoop:
            previousIterationAt === null || lastValueChangeAtRef.current === null
              ? null
              : lastValueChangeAtRef.current > previousIterationAt,
          value: Number(latestValueRef.current.toFixed(4)),
          transform: computedStyle.transform,
          backgroundPosition: computedStyle.backgroundPosition,
        });

        lastIterationAtRef.current = now;
      };

    const handleFlowIteration = createIterationLogger('progress-flow', flowNode, lastFlowIterationAtRef);
    const handleStripesIteration = createIterationLogger(
      'progress-stripes',
      stripesNode,
      lastStripesIterationAtRef
    );

    flowNode.addEventListener('animationiteration', handleFlowIteration);
    stripesNode.addEventListener('animationiteration', handleStripesIteration);

    return () => {
      flowNode.removeEventListener('animationiteration', handleFlowIteration);
      stripesNode.removeEventListener('animationiteration', handleStripesIteration);
    };
  }, [progressId]);

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('bg-zinc-200 dark:bg-zinc-700/70 relative h-3 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        ref={indicatorRef}
        className="relative h-full w-full flex-1 overflow-hidden transition-transform duration-100 ease-linear will-change-transform"
        style={{ transform: `translateX(-${100 - progressValue}%)` }}
      >
        <div
          ref={flowRef}
          className="absolute inset-0 animate-progress-flow bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_35%,#3b82f6_60%,#1d4ed8_100%)] bg-[length:200%_100%] dark:bg-[linear-gradient(90deg,#2563eb_0%,#3b82f6_35%,#60a5fa_60%,#2563eb_100%)]"
        >
          <span className="absolute inset-0 animate-progress-scan opacity-55 bg-[linear-gradient(110deg,transparent_0%,rgba(191,219,254,0.8)_50%,transparent_100%)]" />
          <span
            ref={stripesRef}
            className="absolute inset-0 animate-progress-stripes bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.18)_0_10px,rgba(255,255,255,0.04)_10px_20px)] dark:bg-[repeating-linear-gradient(-45deg,rgba(147,197,253,0.28)_0_10px,rgba(191,219,254,0.1)_10px_20px)] mix-blend-screen"
          />
        </div>
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
