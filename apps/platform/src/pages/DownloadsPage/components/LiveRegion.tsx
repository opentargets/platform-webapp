import { Box } from "ui";
import { VISUALLY_HIDDEN_SX } from "./tokens";

export const LIVE_REGION_ID = "downloads-basket-live-region";

/**
 * Announce a message to screen readers through the page's live region.
 * Clearing first makes repeated identical messages re-announce.
 */
export function announce(message: string) {
  const el = typeof document !== "undefined" ? document.getElementById(LIVE_REGION_ID) : null;
  if (!el) return;
  el.textContent = "";
  window.requestAnimationFrame(() => {
    el.textContent = message;
  });
}

/** The polite live region basket changes are announced in. Render once per page. */
function LiveRegion() {
  return <Box id={LIVE_REGION_ID} role="status" aria-live="polite" aria-atomic sx={VISUALLY_HIDDEN_SX} />;
}

export default LiveRegion;
