import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Keeps an element from shrinking: returns a ref for the element and the
 * tallest height it has had so far, to be applied as its `min-height`. Stops
 * the content below from jumping when the element's content is briefly
 * replaced or gets shorter (a last page, a search with few results).
 *
 * The height is measured again from scratch when `resetKey` changes or the
 * element's width changes (a different layout has a different natural height).
 */
function useRatchetMinHeight<T extends HTMLElement>(
  resetKey?: unknown,
  enabled = true
): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [minHeight, setMinHeight] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is the trigger
  useEffect(() => {
    setMinHeight(0);
  }, [resetKey]);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof ResizeObserver === "undefined") return;
    let width = element.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (element.offsetWidth !== width) {
        width = element.offsetWidth;
        setMinHeight(0);
        return;
      }
      const height = element.offsetHeight;
      setMinHeight((previous) => (height > previous ? height : previous));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);

  return [ref, enabled ? minHeight : 0];
}

export default useRatchetMinHeight;
