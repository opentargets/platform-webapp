// Shared timeout for widget sections to finish loading (data-heavy,
// GraphQL-backed content). Centralized so it can be tuned in one place -
// see the fix that introduced this for context on why 10s wasn't enough.
export const WIDGET_LOAD_TIMEOUT = 20000;
