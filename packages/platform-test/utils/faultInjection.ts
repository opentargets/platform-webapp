import type { Page, Route } from "@playwright/test";

/**
 * Fault injection, for checking the tests themselves.
 *
 * A test is only worth having if it fails when its page breaks. Run a spec with a fault
 * switched on and every test in it should fail; a test that still passes is not
 * checking anything the fault broke.
 *
 *   OT_E2E_FAULT=errors  GraphQL responses become `{ data: null, errors: [...] }`
 *   OT_E2E_FAULT=http500 GraphQL requests get HTTP 500
 *   OT_E2E_FAULT=empty   GraphQL responses keep their shape but every list is emptied,
 *                        every count is 0 and nested entities lose their data: what a
 *                        broken data release looks like. No error is raised anywhere,
 *                        so only real assertions catch it.
 *   OT_E2E_FAULT_OPERATION=<regex>  limit the fault to operations whose name matches,
 *                        e.g. the one query behind the section under test.
 *
 * Never set in CI. Example:
 *   OT_E2E_FAULT=empty OT_E2E_FAULT_OPERATION='^Pharmacogenomics' \
 *     yarn playwright test e2e/pages/drug/drugPharmacogenomics.spec.ts
 */

export type Fault = "errors" | "http500" | "empty";

const FAULTS: readonly Fault[] = ["errors", "http500", "empty"];

export function requestedFault(): { fault: Fault; operation: RegExp | null } | null {
  const fault = process.env.OT_E2E_FAULT;
  if (!fault) return null;
  if (!FAULTS.includes(fault as Fault)) {
    throw new Error(`OT_E2E_FAULT must be one of ${FAULTS.join(", ")}; got "${fault}"`);
  }
  const operation = process.env.OT_E2E_FAULT_OPERATION;
  return { fault: fault as Fault, operation: operation ? new RegExp(operation) : null };
}

/** Empty every list, zero every count and null every nested object below the root entity. */
function emptied(value: unknown, depth: number): unknown {
  if (Array.isArray(value)) return [];
  if (value === null || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "__typename" || key === "id") result[key] = child;
    else if (Array.isArray(child)) result[key] = [];
    else if (typeof child === "number" && /count|total/i.test(key)) result[key] = 0;
    else if (child !== null && typeof child === "object") {
      // Keep the root entity (depth 0) so the page itself still renders; empty what hangs off it.
      result[key] = depth === 0 ? emptied(child, depth + 1) : emptiedLeaf(child);
    } else result[key] = child;
  }
  return result;
}

function emptiedLeaf(value: object): unknown {
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "__typename") result[key] = child;
    else if (Array.isArray(child)) result[key] = [];
    else if (typeof child === "number") result[key] = 0;
    else if (child !== null && typeof child === "object") result[key] = emptiedLeaf(child);
    else result[key] = child;
  }
  return result;
}

async function applyFault(route: Route, fault: Fault): Promise<void> {
  if (fault === "http500") {
    await route.fulfill({ status: 500, contentType: "text/plain", body: "injected HTTP 500" });
    return;
  }
  if (fault === "errors") {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: null, errors: [{ message: "injected GraphQL error" }] }),
    });
    return;
  }
  const response = await route.fetch();
  const body = await response.json();
  await route.fulfill({
    response,
    contentType: "application/json",
    body: JSON.stringify({ ...body, data: emptied(body.data, 0) }),
  });
}

/** Installs the requested fault, if any. Returns whether one was installed. */
export async function installFault(page: Page): Promise<boolean> {
  const requested = requestedFault();
  if (!requested) return false;
  await page.route("**/*", async (route) => {
    const request = route.request();
    const postData = request.method() === "POST" ? request.postData() : null;
    if (!postData?.includes('"query"')) {
      await route.fallback();
      return;
    }
    let operationName = "";
    try {
      operationName = JSON.parse(postData).operationName ?? "";
    } catch {
      operationName = "";
    }
    if (requested.operation && !requested.operation.test(operationName)) {
      await route.fallback();
      return;
    }
    await applyFault(route, requested.fault);
  });
  return true;
}
