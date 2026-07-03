import { expect, test } from "../fixtures";

test("serves a llmstxt.org-compliant /llms.txt", async ({ request, baseURL }) => {
  const res = await request.get(`${baseURL}/llms.txt`);
  expect(res.status()).toBe(200);

  const body = await res.text();
  expect(body.startsWith("# Open Targets Platform")).toBe(true);
  for (const heading of ["## Documentation", "## API", "## Data downloads", "## Community"]) {
    expect(body).toContain(heading);
  }
  expect(body).toContain("https://api.platform.opentargets.org/api/v4/graphql");
  expect(body).not.toContain("partner-support@opentargets.org");
});
