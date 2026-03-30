/** Clamp n into [min, max]. */
export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Trailing throttle: ensures func runs after `limit` ms of relative quiet.
 */
export function trailingThrottle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let lastFunc: ReturnType<typeof setTimeout> | undefined;
  return function (this: unknown, ...args: Parameters<T>) {
    const context = this;
    const now = Date.now();
    if (lastFunc) {
      clearTimeout(lastFunc);
    }
    lastFunc = setTimeout(() => {
      if (now + limit - Date.now() <= 0) {
        func.apply(context, args as Parameters<T>);
      }
    }, limit);
  };
}
