import { useRef } from 'react';
import { useTick } from '@pixi/react';
import type { RefObject } from 'react';
import type { ScalesRef } from './ScalesContext';

/**
 * Imperative, tick-driven check for "is this datum the sticky (click-locked) one".
 *
 * Reads `scalesRef.current.stickyLabelCenter` / `stickyDatumId` directly rather than via
 * `useGenTrackTooltipState()` — see ScalesContext.tsx and the GenTrack README for why a
 * `useContext` read doesn't work for components rendered inside `@pixi/react`'s `<Stage>`.
 *
 * `onChange` is only called when the matched value actually flips, so callers can cheaply
 * mutate a sprite's alpha/tint and call `app.render()` only when something really changed,
 * rather than on every tick. GenTrack.tsx's click handler forces one manual tick
 * (`scalesRef.current.tickerUpdate?.()`) immediately after updating the sticky identity, so
 * this updates promptly on click rather than waiting for the next incidental tick.
 */
export function useStickyTick(
  scalesRef: RefObject<ScalesRef>,
  isMatch: (scales: ScalesRef) => boolean,
  onChange: (isStuck: boolean) => void,
) {
  const isStuckRef = useRef(false);

  useTick(() => {
    const scales = scalesRef.current;
    if (!scales) return;
    const isStuck = isMatch(scales);
    if (isStuck !== isStuckRef.current) {
      isStuckRef.current = isStuck;
      onChange(isStuck);
    }
  });

  return isStuckRef;
}
