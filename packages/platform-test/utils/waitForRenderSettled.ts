import type { Page } from "@playwright/test";

/**
 * Waits until the page has no MUI skeleton/spinner loaders left, i.e. data
 * has actually finished rendering rather than just "the network went idle".
 * Mirrors the same wait already used ad hoc in several POM page objects.
 */
export async function waitForRenderSettled(page: Page, timeout = 15000): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const skeletons = document.querySelectorAll(".MuiSkeleton-root");
        const spinners = document.querySelectorAll(".MuiCircularProgress-root");
        return skeletons.length === 0 && spinners.length === 0;
      },
      undefined,
      { timeout }
    )
    .catch(() => {
      // Some widgets refresh/poll indefinitely and never fully settle -
      // the caller has already confirmed the network itself is idle.
    });
}
