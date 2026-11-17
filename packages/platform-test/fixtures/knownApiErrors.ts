/**
 * GraphQL errors that are known API gaps and must not fail a test.
 *
 * Every entry needs a link to the issue tracking the fix. Remove the entry
 * once the API is fixed, so the test starts guarding against regressions.
 */
export interface KnownApiError {
  operationName: string;
  /** Substring of the GraphQL error message */
  message: string;
  issue: string;
}

export const KNOWN_API_ERRORS: KnownApiError[] = [];

export function isKnownApiError(operationName: string, message: string): boolean {
  return KNOWN_API_ERRORS.some(
    (known) => known.operationName === operationName && message.includes(known.message)
  );
}
