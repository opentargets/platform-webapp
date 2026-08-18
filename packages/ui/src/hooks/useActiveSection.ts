import { useEffect, useState } from "react";

// Tracks which of the given section ids is currently "active" - the one
// crossing a thin trigger band around the upper-middle of the viewport
// (35%-45% down), rather than whichever merely touches the top. ids must
// match the DOM `id` attribute of each section's root element.
//
// Section bodies are lazy-loaded (React.lazy/Suspense), so their DOM nodes
// may not exist yet when this hook first runs. A MutationObserver watches
// for those nodes appearing later and starts observing them as they mount.
function useActiveSection(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) {
      setActiveId(null);
      return undefined;
    }

    // ids changes when the caller re-filters the section list (e.g. a
    // category filter) - if the previous activeId fell out of the new
    // list, it would otherwise keep pointing at a now-hidden section
    // until the next scroll-triggered intersection event.
    setActiveId((prev) => (prev && ids.includes(prev) ? prev : ids[0]));

    const visible = new Set<string>();
    const observed = new Set<string>();

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        });

        const nextActive = ids.find((id) => visible.has(id));
        if (nextActive) setActiveId(nextActive);
      },
      {
        rootMargin: "-35% 0px -55% 0px",
        threshold: 0,
      }
    );

    const observeNewNodes = () => {
      ids.forEach((id) => {
        if (observed.has(id)) return;
        const el = document.getElementById(id);
        if (el) {
          intersectionObserver.observe(el);
          observed.add(id);
        }
      });
    };

    observeNewNodes();

    const mutationObserver = new MutationObserver(() => {
      if (observed.size < ids.length) observeNewNodes();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [ids]);

  return activeId;
}

export default useActiveSection;
