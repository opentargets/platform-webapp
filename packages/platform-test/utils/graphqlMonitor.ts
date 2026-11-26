import type { APIResponse, Page } from "@playwright/test";

export interface GraphQLQuery {
  operationName: string;
  query: string;
  variables?: Record<string, unknown>;
  timestamp: number;
}

export interface GraphQLResponse {
  status: number;
  ok: boolean;
  data?: unknown;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
  timestamp: number;
}

export interface GraphQLRequest {
  query: GraphQLQuery;
  response: GraphQLResponse;
  duration: number;
}

export interface GraphQLMonitorStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requests: GraphQLRequest[];
  errors: Map<string, string[]>;
}

/**
 * GraphQL Monitor - Monitors all GraphQL responses in tests
 */
export class GraphQLMonitor {
  private requests: GraphQLRequest[] = [];
  private errors: Map<string, string[]> = new Map();
  private page: Page;
  private responseHandler: ((response: APIResponse) => void) | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Start monitoring GraphQL requests using response listener
   * This approach is simpler and doesn't block navigation
   */
  async start(): Promise<void> {
    console.log("[GraphQLMonitor] Starting response monitoring...");

    // Create handler (non-async to avoid blocking page loads)
    this.responseHandler = (response: APIResponse): void => {
      // Only monitor GraphQL endpoints
      const url = response.url();
      if (!url.includes("graphql")) {
        return;
      }

      // Only monitor POST requests (typical for GraphQL)
      const request = response.request();
      if (request.method() !== "POST") {
        return;
      }

      const startTime = Date.now();

      // Read response body asynchronously but don't wait in the handler
      response
        .text()
        .then((responseBody: string): void => {
          const duration = Date.now() - startTime;

          try {
            const jsonBody = JSON.parse(request.postData() || "{}");
            const operationName = jsonBody.operationName || "Unknown";
            const graphqlResponse = JSON.parse(responseBody);

            // Store the request-response pair
            this.requests.push({
              query: {
                operationName,
                query: jsonBody.query || "",
                variables: jsonBody.variables,
                timestamp: startTime,
              },
              response: {
                status: response.status(),
                ok: response.ok(),
                data: graphqlResponse.data,
                errors: graphqlResponse.errors,
                timestamp: startTime + duration,
              },
              duration,
            });

            console.log(`[GraphQLMonitor] Request logged: ${operationName} (${duration}ms)`);

            // Track errors
            if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
              const errors = graphqlResponse.errors.map((err: { message: string }) => err.message);
              if (!this.errors.has(operationName)) {
                this.errors.set(operationName, []);
              }
              this.errors.get(operationName)?.push(...errors);
              console.log(`[GraphQLMonitor] Errors detected for ${operationName}`);
            }

            // If HTTP error, also track it
            if (!response.ok()) {
              if (!this.errors.has(operationName)) {
                this.errors.set(operationName, []);
              }
              const errorList = this.errors.get(operationName);
              if (errorList) {
                errorList.push(`HTTP ${response.status()}: ${response.statusText()}`);
              }
            }
          } catch (_e) {
            console.log(`[GraphQLMonitor] Error processing response: ${_e}`);
          }
        })
        .catch((_error: unknown): void => {
          console.log(`[GraphQLMonitor] Failed to read response body: ${_error}`);
        });
    };

    // Listen for all responses
    this.page.on("response", this.responseHandler);
  }

  /**
   * Stop monitoring and clear data
   */
  async stop(): Promise<void> {
    console.log("[GraphQLMonitor] Stopping response monitoring...");
    // Remove only our specific handler
    if (this.responseHandler) {
      this.page.removeListener("response", this.responseHandler);
      this.responseHandler = null;
    }
  }

  /**
   * Get all monitored requests
   */
  getRequests(): GraphQLRequest[] {
    return [...this.requests];
  }

  /**
   * Get requests by operation name
   */
  getRequestsByOperation(operationName: string): GraphQLRequest[] {
    return this.requests.filter((r) => r.query.operationName === operationName);
  }

  /**
   * Get all errors
   */
  getErrors(): Map<string, string[]> {
    return new Map(this.errors);
  }

  /**
   * Get errors for a specific operation
   */
  getErrorsByOperation(operationName: string): string[] {
    return this.errors.get(operationName) || [];
  }

  /**
   * Get statistics
   */
  getStats(): GraphQLMonitorStats {
    const totalRequests = this.requests.length;
    const failedRequests = Array.from(this.errors.values()).reduce(
      (sum, errors) => sum + errors.length,
      0
    );
    const successfulRequests = totalRequests - failedRequests;
    const averageResponseTime =
      totalRequests > 0 ? this.requests.reduce((sum, r) => sum + r.duration, 0) / totalRequests : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      requests: [...this.requests],
      errors: new Map(this.errors),
    };
  }

  /**
   * Clear all recorded data
   */
  clear(): void {
    this.requests = [];
    this.errors.clear();
  }

  /**
   * Wait until no new GraphQL request has been logged for `quietMs`,
   * bounded by `timeout`. Unlike page.waitForLoadState("networkidle"), this
   * only looks at GraphQL traffic, so it isn't blocked by unrelated
   * background activity (analytics, polling, etc.) that never goes idle.
   */
  async waitForIdle(quietMs = 750, timeout = 20000): Promise<void> {
    const deadline = Date.now() + timeout;

    // A fresh navigation hasn't dispatched any GraphQL requests yet; give it
    // a moment to start before treating "zero requests so far" as idle.
    const firstRequestDeadline = Math.min(deadline, Date.now() + 3000);
    while (this.requests.length === 0 && Date.now() < firstRequestDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    let lastCount = this.requests.length;
    let lastChangeAt = Date.now();

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (this.requests.length !== lastCount) {
        lastCount = this.requests.length;
        lastChangeAt = Date.now();
        continue;
      }

      if (Date.now() - lastChangeAt >= quietMs) {
        return;
      }
    }
  }

  /**
   * Print a summary report
   */
  printSummary(): void {
    const stats = this.getStats();
    console.log(`
============================================
    GraphQL Request Summary
============================================
Total Requests:      $stats.totalRequests
Successful:          $stats.successfulRequests
Failed:              $stats.failedRequests
Average Response:    $stats.averageResponseTime.toFixed(2)ms
============================================
    `);

    if (stats.errors.size > 0) {
      console.log("ERRORS:");
      for (const [_operation, errors] of stats.errors.entries()) {
        console.log(`  ${_operation}:`);
        for (const error of errors) {
          console.log(`    - ${error}`);
        }
      }
    }
  }

  /**
   * Assert all requests were successful
   */
  assertNoErrors(): void {
    if (this.errors.size > 0) {
      const errorSummary = Array.from(this.errors.entries())
        .map(([operation, errors]) => `${operation}: ${errors.join(", ")}`)
        .join("\n");

      throw new Error(`GraphQL requests failed:\n${errorSummary}`);
    }
  }
}
