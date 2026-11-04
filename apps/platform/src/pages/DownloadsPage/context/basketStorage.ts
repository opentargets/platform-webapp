/**
 * localStorage persistence for the dataset basket and the one-time coach
 * mark. Every access is wrapped: storage can be missing (SSR, tests) or throw
 * (private mode, blocked site data), and the basket must never break the page.
 */

export const BASKET_STORAGE_KEY = "ot.downloads.basket";
export const COACH_MARK_STORAGE_KEY = "ot.downloads.basketCoachSeen";

export function readStoredBasket(): string[] {
  try {
    const raw = window.localStorage.getItem(BASKET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeStoredBasket(ids: string[]): void {
  try {
    window.localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable - the basket just won't survive a reload */
  }
}

export function hasSeenBasketCoachMark(): boolean {
  try {
    return window.localStorage.getItem(COACH_MARK_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markBasketCoachMarkSeen(): void {
  try {
    window.localStorage.setItem(COACH_MARK_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
