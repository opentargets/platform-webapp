/** Elements matching this selector are treated as blocking overlays — anything rendered
 *  above the Pixi canvas that should intercept sprite hover/click (e.g. the track legend's
 *  interactive corner box, see `data-gentrack-overlay-blocker` in GenTrack.tsx). */
const OVERLAY_BLOCKER_SELECTOR = "[data-gentrack-overlay-blocker]";

/**
 * PixiJS tracks pointer movement via a `document`-level, capture-phase listener
 * (see `EventSystem.addEvents` in `@pixi/events`), which maps raw page coordinates
 * directly into canvas space and hit-tests the scene graph — entirely bypassing the
 * DOM's own occlusion/z-index stacking. This means a DOM element positioned above
 * the canvas (e.g. a track legend) does NOT prevent PixiJS from firing
 * `pointerover`/`pointerdown`/`pointertap` for a sprite underneath it.
 *
 * Note: we can't simply check whether the real topmost DOM element *is* the canvas —
 * GenTrack always keeps a transparent, `pointerEvents: "auto"` overlay Box (the
 * crosshair/tooltip/pan layer) on top of the canvas to capture real DOM mouse events,
 * so that overlay — not the canvas — is legitimately topmost during normal hover.
 * Instead we use a blocklist: reject only when the real topmost element is inside a
 * deliberate blocking overlay (currently just the legend's interactive corner box).
 *
 * Call this from entry-type handlers (`pointerover`, `pointerdown`, `pointertap`) to
 * verify the event's real screen position isn't currently covered by a blocking
 * overlay. Always let exit-type handlers (`pointerout`) run unconditionally so hover
 * state still clears correctly when the cursor moves under a covering overlay.
 */
export function isPointerOverCanvas(e: any): boolean {
  const nativeEvent = e?.nativeEvent ?? e?.data?.originalEvent;
  if (!nativeEvent || typeof document.elementFromPoint !== "function") return true;
  const topElement = document.elementFromPoint(nativeEvent.clientX, nativeEvent.clientY);
  if (!topElement) return true;
  return !topElement.closest(OVERLAY_BLOCKER_SELECTOR);
}
