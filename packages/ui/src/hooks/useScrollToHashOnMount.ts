import { useEffect } from "react";
import { scroller } from "react-scroll";
import { SCROLL_OFFSET } from "../components/Section/scrollOffset";

const MAX_WAIT_MS = 5000;

// On first mount, if the URL has a hash matching one of the given section
// ids, scrolls to it. Section bodies are lazy-loaded, so the target element
// may not exist yet - polls (bounded to MAX_WAIT_MS) until it appears.
function useScrollToHashOnMount(ids: string[]) {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash || !ids.includes(hash)) return undefined;

    let cancelled = false;
    const startedAt = performance.now();

    const tryScroll = () => {
      if (cancelled) return;
      if (document.getElementById(hash)) {
        scroller.scrollTo(hash, { duration: 0, smooth: false, offset: SCROLL_OFFSET });
        return;
      }
      if (performance.now() - startedAt < MAX_WAIT_MS) {
        requestAnimationFrame(tryScroll);
      }
    };

    tryScroll();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default useScrollToHashOnMount;
