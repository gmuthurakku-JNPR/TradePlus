/**
 * ============================================================================
 * Performance Monitoring Utilities
 * ============================================================================
 * 
 * Development tools for tracking component render performance, identifying
 * unnecessary re-renders, and measuring optimization impact.
 * 
 * Usage:
 * ```typescript
 * import { useRenderCount, useRenderTime, useWhyDidYouUpdate } from '@/utils/performance';
 * 
 * function MyComponent(props) {
 *   useRenderCount('MyComponent');              // Count renders
 *   useRenderTime('MyComponent');               // Measure render time
 *   useWhyDidYouUpdate('MyComponent', props);   // Track prop changes
 *   
 *   return <div>...</div>;
 * }
 * ```
 * 
 * ============================================================================
 */

import { useEffect, useRef } from 'react';

/**
 * Check if running in development mode
 * Set to false to avoid console spam during tests
 * In production Vite builds, dead code elimination will remove these logs
 */
const isDevelopment = false;

/**
 * Track the number of times a component renders.
 * Logs in development mode only.
 */
export function useRenderCount(componentName: string): void {
  const renderCount = useRef(0);
  const isFirstRender = useRef(true);

  if (isFirstRender.current) {
    isFirstRender.current = false;
  } else {
    renderCount.current += 1;
  }

  useEffect(() => {
    if (isDevelopment) {
      console.log(`[Render Count] ${componentName}: ${renderCount.current} renders`);
    }
  });
}

/**
 * Measure component render time using performance.now().
 * Logs in development mode only.
 */
export function useRenderTime(componentName: string): void {
  const renderStartTime = useRef(0);
  const renderCount = useRef(0);
  const totalTime = useRef(0);

  renderStartTime.current = performance.now();
  renderCount.current += 1;

  useEffect(() => {
    const renderEndTime = performance.now();
    const duration = renderEndTime - renderStartTime.current;
    totalTime.current += duration;
    const avgTime = totalTime.current / renderCount.current;

    if (isDevelopment) {
      console.log(
        `[Render Time] ${componentName}: ${duration.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms over ${renderCount.current} renders)`
      );
    }
  });
}

/**
 * Track which props changed between renders.
 * Useful for debugging unnecessary re-renders.
 */
export function useWhyDidYouUpdate(
  componentName: string,
  props: Record<string, unknown>
): void {
  const previousProps = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (isDevelopment) {
      if (Object.keys(previousProps.current).length > 0) {
        const changedProps: Record<string, { from: unknown; to: unknown }> = {};

        Object.keys(props).forEach((key) => {
          if (previousProps.current[key] !== props[key]) {
            changedProps[key] = {
              from: previousProps.current[key],
              to: props[key],
            };
          }
        });

        if (Object.keys(changedProps).length > 0) {
          console.log(`[Why Update] ${componentName} re-rendered due to:`);
          console.table(changedProps);
        } else {
          console.log(
            `[Why Update] ${componentName} re-rendered but props didn't change (likely internal state or context)`
          );
        }
      }

      previousProps.current = props;
    }
  });
}

/**
 * Track subscription count and memory usage.
 * Helps identify subscription leaks.
 */
export function useSubscriptionTracking(
  componentName: string,
  subscriptionCount: number
): void {
  const maxSubscriptions = useRef(0);

  useEffect(() => {
    if (subscriptionCount > maxSubscriptions.current) {
      maxSubscriptions.current = subscriptionCount;
    }

    if (isDevelopment) {
      console.log(
        `[Subscriptions] ${componentName}: ${subscriptionCount} active (max: ${maxSubscriptions.current})`
      );
    }

    return () => {
      if (isDevelopment && subscriptionCount > 0) {
        console.warn(
          `[Subscriptions] ${componentName}: Still has ${subscriptionCount} active subscriptions on unmount`
        );
      }
    };
  }, [componentName, subscriptionCount]);
}

/**
 * Measure memory usage over time.
 * Requires browser support for performance.memory (Chrome only).
 */
export function useMemoryTracking(componentName: string): void {
  const initialMemory = useRef<number | null>(null);

  useEffect(() => {
    if (isDevelopment) {
      // @ts-expect-error - performance.memory is non-standard (Chrome only)
      if (performance.memory) {
        // @ts-expect-error - performance.memory
        const currentMemory = performance.memory.usedJSHeapSize / 1024 / 1024;

        if (initialMemory.current === null) {
          initialMemory.current = currentMemory;
          console.log(
            `[Memory] ${componentName} mounted: ${currentMemory.toFixed(2)}MB`
          );
        } else {
          const delta = currentMemory - initialMemory.current;
          console.log(
            `[Memory] ${componentName}: ${currentMemory.toFixed(2)}MB (Δ ${delta > 0 ? '+' : ''}${delta.toFixed(2)}MB)`
          );
        }
      }
    }
  });
}

/**
 * Track component lifecycle: mount, update, unmount.
 */
export function useLifecycleTracking(componentName: string): void {
  const renderCount = useRef(0);
  const mountTime = useRef(0);

  if (renderCount.current === 0) {
    mountTime.current = performance.now();
    if (isDevelopment) {
      console.log(`[Lifecycle] ${componentName} mounting...`);
    }
  }

  renderCount.current += 1;

  useEffect(() => {
    if (renderCount.current === 1) {
      const duration = performance.now() - mountTime.current;
      if (isDevelopment) {
        console.log(
          `[Lifecycle] ${componentName} mounted in ${duration.toFixed(2)}ms`
        );
      }
    } else {
      if (isDevelopment) {
        console.log(
          `[Lifecycle] ${componentName} updated (render #${renderCount.current})`
        );
      }
    }

    return () => {
      if (isDevelopment) {
        console.log(
          `[Lifecycle] ${componentName} unmounting (rendered ${renderCount.current} times)`
        );
      }
    };
  });
}

/**
 * Performance profiler for measuring code execution time.
 * 
 * Usage:
 * ```typescript
 * const profiler = createProfiler('ExpensiveCalculation');
 * profiler.start();
 * // ... expensive operation ...
 * profiler.end();
 * ```
 */
export function createProfiler(label: string) {
  let startTime = 0;
  let endTime = 0;
  let runs = 0;
  let totalTime = 0;

  return {
    start() {
      startTime = performance.now();
    },

    end() {
      endTime = performance.now();
      const duration = endTime - startTime;
      runs += 1;
      totalTime += duration;

      if (isDevelopment) {
        console.log(
          `[Profiler] ${label}: ${duration.toFixed(2)}ms (avg: ${(totalTime / runs).toFixed(2)}ms over ${runs} runs)`
        );
      }

      return duration;
    },

    reset() {
      startTime = 0;
      endTime = 0;
      runs = 0;
      totalTime = 0;
    },

    getStats() {
      return {
        runs,
        totalTime,
        avgTime: runs > 0 ? totalTime / runs : 0,
        lastDuration: endTime - startTime,
      };
    },
  };
}

/**
 * Batch performance profiler for comparing multiple implementations.
 * 
 * Usage:
 * ```typescript
 * const profiler = createBatchProfiler();
 * 
 * profiler.measure('Approach A', () => {
 *   // Implementation A
 * });
 * 
 * profiler.measure('Approach B', () => {
 *   // Implementation B
 * });
 * 
 * profiler.compare();
 * ```
 */
export function createBatchProfiler() {
  const results: Array<{
    label: string;
    duration: number;
    runs: number;
    totalTime: number;
  }> = [];

  return {
    measure(label: string, fn: () => void, iterations = 1) {
      const totalStart = performance.now();
      let totalTime = 0;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        fn();
        const end = performance.now();
        totalTime += end - start;
      }

      const avgDuration = totalTime / iterations;
      const totalEnd = performance.now();

      results.push({
        label,
        duration: avgDuration,
        runs: iterations,
        totalTime: totalEnd - totalStart,
      });

      if (isDevelopment) {
        console.log(
          `[Batch] ${label}: ${avgDuration.toFixed(2)}ms avg over ${iterations} iterations`
        );
      }

      return avgDuration;
    },

    compare() {
      if (results.length === 0) {
        console.log('[Batch] No measurements to compare');
        return;
      }

      const sorted = [...results].sort((a, b) => a.duration - b.duration);
      const fastest = sorted[0];

      if (isDevelopment) {
        console.log('\n[Batch Comparison]');
        console.table(
          sorted.map((result, index) => ({
            Rank: index + 1,
            Label: result.label,
            'Avg Time': `${result.duration.toFixed(2)}ms`,
            Runs: result.runs,
            'Total Time': `${result.totalTime.toFixed(2)}ms`,
            'vs Fastest': index === 0 ? 'FASTEST' : `${((result.duration / fastest.duration - 1) * 100).toFixed(1)}% slower`,
          }))
        );
      }

      return sorted;
    },

    reset() {
      results.length = 0;
    },

    getResults() {
      return [...results];
    },
  };
}

/**
 * Monitor render performance over time and alert if thresholds exceeded.
 */
export function usePerformanceMonitor(
  componentName: string,
  options: {
    maxRenderTime?: number; // ms
    maxRendersPerSecond?: number;
    alertCallback?: (message: string) => void;
  } = {}
) {
  const {
    maxRenderTime = 16, // 60fps budget
    maxRendersPerSecond = 60,
    alertCallback = console.warn,
  } = options;

  const renderTimes = useRef<number[]>([]);
  const renderStartTime = useRef(0);

  renderStartTime.current = performance.now();

  useEffect(() => {
    const duration = performance.now() - renderStartTime.current;
    const now = Date.now();

    renderTimes.current.push(now);

    // Check render duration
    if (duration > maxRenderTime && isDevelopment) {
      alertCallback(
        `⚠️ [Performance] ${componentName} took ${duration.toFixed(2)}ms (threshold: ${maxRenderTime}ms)`
      );
    }

    // Check render frequency (last second)
    const oneSecondAgo = now - 1000;
    const recentRenders = renderTimes.current.filter(time => time > oneSecondAgo);
    renderTimes.current = recentRenders;

    if (
      recentRenders.length > maxRendersPerSecond &&
      isDevelopment
    ) {
      alertCallback(
        `⚠️ [Performance] ${componentName} rendered ${recentRenders.length} times in last second (threshold: ${maxRendersPerSecond})`
      );
    }
  });
}

/**
 * Export all performance tracking hooks as a single object
 * for easier batch imports.
 */
export const PerformanceTools = {
  useRenderCount,
  useRenderTime,
  useWhyDidYouUpdate,
  useSubscriptionTracking,
  useMemoryTracking,
  useLifecycleTracking,
  usePerformanceMonitor,
  createProfiler,
  createBatchProfiler,
} as const;

/**
 * Combine multiple performance hooks into one.
 * Useful for comprehensive component monitoring.
 */
export function usePerformanceTracking(
  componentName: string,
  props?: Record<string, unknown>,
  options?: {
    trackRenderCount?: boolean;
    trackRenderTime?: boolean;
    trackPropChanges?: boolean;
    trackLifecycle?: boolean;
    trackMemory?: boolean;
    performanceThresholds?: {
      maxRenderTime?: number;
      maxRendersPerSecond?: number;
    };
  }
) {
  const {
    trackRenderCount = true,
    trackRenderTime = true,
    trackPropChanges = false,
    trackLifecycle = false,
    trackMemory = false,
    performanceThresholds,
  } = options || {};

  if (trackRenderCount) {
    useRenderCount(componentName);
  }

  if (trackRenderTime) {
    useRenderTime(componentName);
  }

  if (trackPropChanges && props) {
    useWhyDidYouUpdate(componentName, props);
  }

  if (trackLifecycle) {
    useLifecycleTracking(componentName);
  }

  if (trackMemory) {
    useMemoryTracking(componentName);
  }

  if (performanceThresholds) {
    usePerformanceMonitor(componentName, performanceThresholds);
  }
}
