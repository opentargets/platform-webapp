import type { Page, Request, Response } from "@playwright/test";

/**
 * Records every GraphQL request a page issues, with its response.
 *
 * The page health guard (utils/pageHealth.ts) already fails a test on a GraphQL error or
 * a non-2xx status, so this monitor does not look for errors. It answers the questions
 * the guard cannot: which operations did the page issue, how many times, with which
 * variables, and what data came back.
 *
 * It never logs and never measures time: a wall-clock figure taken on a shared CI
 * runner is noise. Request counts are deterministic.
 *
 * Use it through the `graphqlMonitor` fixture, which starts it before the test navigates.
 */

export type RecordedOperation = {
  /** The GraphQL operation name ("TargetPageQuery"), or "anonymous" when the query has none. */
  name: string;
  variables: Record<string, unknown>;
  /** `name` plus the variables in a stable order: equal for two identical requests. */
  key: string;
  /** The page URL when the request was issued. */
  pageUrl: string;
  /** HTTP status, or null while in flight, or when the request failed or was cancelled. */
  status: number | null;
  /** The `data` member of the response, undefined until read (or when it never arrived). */
  data: unknown;
  /** Messages of the `errors` member of the response. */
  errors: string[];
};

export type RepeatedRequest = { key: string; name: string; count: number };

/** JSON with object keys sorted, so `{a, b}` and `{b, a}` compare equal. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

type GraphQLBody = { operationName?: string | null; variables?: Record<string, unknown> | null };

function parseGraphQLRequest(request: Request): GraphQLBody | null {
  if (request.method() !== "POST") return null;
  const body = request.postData();
  if (!body?.includes('"query"')) return null;
  const parsed: unknown = JSON.parse(body);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as GraphQLBody;
}

export class GraphQLMonitor {
  private recorded: RecordedOperation[] = [];
  private byRequest = new Map<Request, RecordedOperation>();
  private pending = new Set<Promise<void>>();
  private listening = false;

  constructor(private readonly page: Page) {}

  /** Start recording. Call before the navigation whose requests are of interest. */
  async start(): Promise<void> {
    if (this.listening) return;
    this.listening = true;
    this.page.on("request", this.onRequest);
    this.page.on("response", this.onResponse);
  }

  async stop(): Promise<void> {
    if (!this.listening) return;
    this.listening = false;
    this.page.off("request", this.onRequest);
    this.page.off("response", this.onResponse);
  }

  /** Forget what was recorded so far, e.g. after the initial load and before an interaction. */
  clear(): void {
    this.recorded = [];
    this.byRequest.clear();
  }

  /**
   * Wait until the body of every response received so far has been read. Call it after
   * the page has reached the state under test (a heading, a row count), then assert.
   */
  async settle(): Promise<void> {
    while (this.pending.size > 0) await Promise.all([...this.pending]);
  }

  /** Every GraphQL request issued since `start()` or the last `clear()`, in order. */
  operations(): readonly RecordedOperation[] {
    return this.recorded;
  }

  /** The requests of one operation, in the order they were issued. */
  named(name: string): RecordedOperation[] {
    return this.recorded.filter((operation) => operation.name === name);
  }

  /** The distinct operation names issued, sorted. */
  operationNames(): string[] {
    return [...new Set(this.recorded.map((operation) => operation.name))].sort();
  }

  /**
   * Requests issued more than `allowed` times with the same operation and the same
   * variables. An identical request repeated on load is wasted work at best and a
   * render loop at worst.
   */
  repeatedRequests(allowed = 1): RepeatedRequest[] {
    const counts = new Map<string, RepeatedRequest>();
    for (const { key, name } of this.recorded) {
      const seen = counts.get(key);
      if (seen) seen.count += 1;
      else counts.set(key, { key, name, count: 1 });
    }
    return [...counts.values()].filter((request) => request.count > allowed);
  }

  private onRequest = (request: Request): void => {
    const body = parseGraphQLRequest(request);
    if (!body) return;
    const name = body.operationName || "anonymous";
    const variables = body.variables ?? {};
    const operation: RecordedOperation = {
      name,
      variables,
      key: `${name} ${stableStringify(variables)}`,
      pageUrl: this.page.url(),
      status: null,
      data: undefined,
      errors: [],
    };
    this.recorded.push(operation);
    this.byRequest.set(request, operation);
  };

  private onResponse = (response: Response): void => {
    const operation = this.byRequest.get(response.request());
    if (!operation) return;
    operation.status = response.status();
    const reading = response
      .json()
      .then((body: { data?: unknown; errors?: { message: string }[] }) => {
        operation.data = body?.data;
        operation.errors = (body?.errors ?? []).map((error) => error.message);
      })
      .catch((error: Error) => {
        // A body can only be unreadable because the page navigated away or closed while
        // it was in flight, or because it is not JSON (an HTTP 500 page). Either way
        // `data` stays undefined, which is what the caller asserts on.
        operation.errors = [`response body could not be read: ${error.message}`];
      })
      .finally(() => {
        this.pending.delete(reading);
      });
    this.pending.add(reading);
  };
}
