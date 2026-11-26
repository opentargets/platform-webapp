import type { ConsoleMessage, Page, Request, Response } from "@playwright/test";

/**
 * Page health guard.
 *
 * Every test gets one automatically (see fixtures/index.ts). It records the ways a page
 * can break without any locator noticing, and fails the test when one of them happened:
 *
 * - `page-error`     an uncaught exception or unhandled rejection in the app
 * - `console-error`  a console.error that is not on the ignore list
 * - `graphql-error`  a GraphQL response with an `errors` array or a non-2xx status
 * - `request-failed` a same-origin request (JS chunk, asset) that failed to load
 * - `http-error`     a same-origin response with a 4xx/5xx status
 * - `error-ui`       an error boundary, route error, section error or 404 page on screen
 *
 * A test that provokes one of these on purpose must say so with `pageHealth.allow(...)`.
 * Nothing here is ever caught and dropped: a problem is either allowed by name or it
 * fails the test.
 */

export type ProblemKind =
  | "page-error"
  | "console-error"
  | "graphql-error"
  | "request-failed"
  | "http-error"
  | "error-ui";

export type Problem = {
  kind: ProblemKind;
  /** Short, stable description: what broke */
  message: string;
  /** The page URL when it happened */
  pageUrl: string;
  /** Extra context (operation name, variables, request URL) */
  detail?: string;
};

type AllowRule = { kind?: ProblemKind; pattern: RegExp; reason: string };

/** Error surfaces the app renders. Each one means the user is looking at a failure. */
export const ERROR_UI_SELECTORS = {
  "error boundary": "[data-testid='error-boundary']",
  "route error page": "[data-testid='route-error']",
  "section error": "[data-testid='section-error']",
  "404 page": "[data-testid='not-found-page']",
} as const;

/**
 * Console errors that are noise in every environment. Keep this list short and specific:
 * each entry hides a class of message from every test.
 */
const IGNORED_CONSOLE_ERRORS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /^Warning: /,
    reason: "React development-mode warnings; absent from the production build CI tests",
  },
  {
    pattern: /Failed to load resource/,
    reason: "Browser echo of a failed request; reported as request-failed/http-error instead",
  },
  {
    pattern: /^GraphQL Error: /,
    reason: "The app's Apollo error link echo; reported as graphql-error instead",
  },
];

const ABORTED = /ERR_ABORTED|NS_BINDING_ABORTED|cancelled|Load cannot follow more than/i;

function isGraphQLRequest(request: Request): boolean {
  if (request.method() !== "POST") return false;
  const body = request.postData();
  if (!body) return false;
  return body.includes('"query"');
}

function describeOperation(request: Request): { name: string; variables: string } {
  try {
    const body = JSON.parse(request.postData() ?? "{}");
    return {
      name: body.operationName ?? "anonymous operation",
      variables: JSON.stringify(body.variables ?? {}),
    };
  } catch {
    return { name: "unparseable operation", variables: "" };
  }
}

export class PageHealth {
  private problems: Problem[] = [];
  private allowed: AllowRule[] = [];
  private pending = new Set<Promise<void>>();
  private origin: string | null = null;

  constructor(
    private page: Page,
    baseURL: string | undefined
  ) {
    if (baseURL) this.origin = new URL(baseURL).origin;
    page.on("pageerror", this.onPageError);
    page.on("console", this.onConsole);
    page.on("response", this.onResponse);
    page.on("requestfailed", this.onRequestFailed);
  }

  /**
   * Declare a problem this test expects. `pattern` is matched against the problem's
   * message and detail. Give the reason: it is shown in the report.
   */
  allow(pattern: RegExp, reason: string, kind?: ProblemKind): void {
    this.allowed.push({ kind, pattern, reason });
  }

  /** Everything recorded so far, including allowed problems. */
  all(): readonly Problem[] {
    return this.problems;
  }

  /** Recorded problems that no `allow` rule covers. */
  unexpected(): Problem[] {
    return this.problems.filter((problem) => !this.isAllowed(problem));
  }

  /** Forget what was recorded (for tests that inspect the guard itself). */
  reset(): void {
    this.problems = [];
  }

  /** Wait for response bodies still being read, then look for error UI on screen. */
  async collect(): Promise<Problem[]> {
    await Promise.all([...this.pending]);
    if (!this.page.isClosed()) {
      for (const [name, selector] of Object.entries(ERROR_UI_SELECTORS)) {
        const count = await this.page.locator(selector).count();
        if (count === 0) continue;
        const text = (await this.page.locator(selector).first().innerText()).trim().slice(0, 200);
        this.record({
          kind: "error-ui",
          message: `${name} is displayed (${count}×): "${text}"`,
        });
      }
    }
    return this.unexpected();
  }

  /** Throws with a readable report if anything unexpected was recorded. */
  async assertHealthy(): Promise<void> {
    const problems = await this.collect();
    if (problems.length === 0) return;
    throw new Error(formatProblems(problems));
  }

  dispose(): void {
    this.page.off("pageerror", this.onPageError);
    this.page.off("console", this.onConsole);
    this.page.off("response", this.onResponse);
    this.page.off("requestfailed", this.onRequestFailed);
  }

  private isAllowed(problem: Problem): boolean {
    const haystack = `${problem.message}\n${problem.detail ?? ""}`;
    return this.allowed.some(
      (rule) => (!rule.kind || rule.kind === problem.kind) && rule.pattern.test(haystack)
    );
  }

  private record(problem: Omit<Problem, "pageUrl">): void {
    const pageUrl = this.page.isClosed() ? "(page closed)" : this.page.url();
    const duplicate = this.problems.some(
      (seen) => seen.kind === problem.kind && seen.message === problem.message
    );
    if (!duplicate) this.problems.push({ ...problem, pageUrl });
  }

  private isSameOrigin(url: string): boolean {
    if (!this.origin) return false;
    try {
      return new URL(url).origin === this.origin;
    } catch {
      return false;
    }
  }

  private onPageError = (error: Error): void => {
    this.record({ kind: "page-error", message: error.message, detail: error.stack });
  };

  private onConsole = (message: ConsoleMessage): void => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (IGNORED_CONSOLE_ERRORS.some(({ pattern }) => pattern.test(text))) return;
    this.record({
      kind: "console-error",
      message: text.slice(0, 500),
      detail: message.location().url,
    });
  };

  private onResponse = (response: Response): void => {
    const request = response.request();

    if (isGraphQLRequest(request)) {
      const operation = describeOperation(request);
      const detail = `${response.url()} variables=${operation.variables}`;
      if (!response.ok()) {
        this.record({
          kind: "graphql-error",
          message: `${operation.name}: HTTP ${response.status()}`,
          detail,
        });
        return;
      }
      const reading = response
        .json()
        .then((body: { errors?: { message: string }[] }) => {
          if (!body?.errors?.length) return;
          const messages = [...new Set(body.errors.map((error) => error.message))];
          this.record({
            kind: "graphql-error",
            message: `${operation.name}: ${messages.join(" | ").slice(0, 600)}`,
            detail,
          });
        })
        .catch((error: Error) => {
          // The body is unreadable only when the page navigated away or closed mid-flight.
          if (/closed|navigat|No resource with given identifier|disposed/i.test(error.message))
            return;
          this.record({
            kind: "graphql-error",
            message: `${operation.name}: response body is not valid JSON (${error.message})`,
            detail,
          });
        })
        .finally(() => {
          this.pending.delete(reading);
        });
      this.pending.add(reading);
      return;
    }

    if (response.status() >= 400 && this.isSameOrigin(response.url())) {
      this.record({
        kind: "http-error",
        message: `${request.method()} ${new URL(response.url()).pathname}: HTTP ${response.status()}`,
        detail: response.url(),
      });
    }
  };

  private onRequestFailed = (request: Request): void => {
    const failure = request.failure()?.errorText ?? "unknown failure";
    // Requests cancelled by a navigation or by the test ending are not failures.
    if (ABORTED.test(failure)) return;
    if (isGraphQLRequest(request)) {
      const operation = describeOperation(request);
      this.record({
        kind: "graphql-error",
        message: `${operation.name}: request failed (${failure})`,
        detail: `${request.url()} variables=${operation.variables}`,
      });
      return;
    }
    if (!this.isSameOrigin(request.url())) return;
    this.record({
      kind: "request-failed",
      message: `${request.method()} ${new URL(request.url()).pathname}: ${failure}`,
      detail: request.url(),
    });
  };
}

export function formatProblems(problems: readonly Problem[]): string {
  const lines = problems.map((problem, index) => {
    const detail = problem.detail ? `\n       ${problem.detail.split("\n")[0].slice(0, 400)}` : "";
    return `  ${index + 1}. [${problem.kind}] ${problem.message}\n       on ${problem.pageUrl}${detail}`;
  });
  return `The page is not healthy: ${problems.length} problem(s) were recorded during this test.\n${lines.join("\n")}`;
}
