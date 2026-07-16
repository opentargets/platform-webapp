/**
 * Yield to the browser using requestIdleCallback (if available) or requestAnimationFrame
 * This allows the browser to handle UI events, repaints, and other tasks
 */
export async function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== "undefined") {
      // requestIdleCallback - yields until browser is idle, best for background work
      requestIdleCallback(() => resolve());
    } else {
      // Fallback to requestAnimationFrame - yields after next frame paint
      requestAnimationFrame(() => resolve());
    }
  });
}
