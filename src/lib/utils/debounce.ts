/**
 * Debounce a function call by `delay` milliseconds.
 * Returns a new function that delays invoking `fn` until after `delay` ms
 * have elapsed since the last invocation.
 */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = undefined;
    }, delay);
  };
}
