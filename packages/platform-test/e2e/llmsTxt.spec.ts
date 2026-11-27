import { expect, test } from "../fixtures";

/**
 * /llms.txt (llmstxt.org format) and /robots.txt are static files served by the app.
 * They are fetched directly, so they are checked without loading a page.
 */
test.describe("/llms.txt", () => {
  test("is served as plain text and follows the llmstxt.org layout", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^text\/plain/);

    const body = await res.text();
    const lines = body.split("\n");
    expect(lines[0]).toBe("# Open Targets Platform");
    expect(body).toMatch(/^> .{40,}/m);
    const sections = lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3));
    expect(sections).toEqual([
      "Documentation",
      "API",
      "Data downloads",
      "Source & citation",
      "Community",
    ]);
  });

  test("every list entry is a markdown link with a URL", async ({ request }) => {
    const body = await (await request.get("/llms.txt")).text();
    const entries = body.split("\n").filter((line) => line.startsWith("- "));

    expect(entries.length).toBeGreaterThan(15);
    for (const entry of entries) {
      expect(entry, entry).toMatch(/^- \[[^\]]+\]\((https?|gs|s3):\/\/[^\s)]+\)(: .+)?$/);
    }
  });

  test("lists the API, MCP and download resources an agent needs", async ({ request }) => {
    const body = await (await request.get("/llms.txt")).text();

    for (const url of [
      "https://api.platform.opentargets.org/api/v4/graphql",
      "https://api.platform.opentargets.org/api/v4/graphql/schema",
      "https://platform-docs.opentargets.org/data-access/graphql-api",
      "http://mcp.platform.opentargets.org/mcp",
      "https://platform.opentargets.org/downloads",
      "gs://open-targets-data-releases/",
      "s3://open-targets-public-data-releases/platform/",
      "https://ftp.ebi.ac.uk/pub/databases/opentargets/platform/",
      "https://community.opentargets.org",
      "https://github.com/opentargets",
    ]) {
      expect(body, url).toContain(`(${url})`);
    }
  });

  test("does not mention the partner-only deployment", async ({ request }) => {
    const body = await (await request.get("/llms.txt")).text();

    expect(body).not.toContain("partner-support@opentargets.org");
    expect(body.toLowerCase()).not.toContain("partner preview");
  });
});

test.describe("/robots.txt", () => {
  test("is served as plain text and applies to all crawlers", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^text\/plain/);

    const lines = (await res.text()).split("\n");
    expect(lines[0]).toBe("User-agent: *");
  });

  test("blocks search results and evidence pages, and nothing broader", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    const disallowed = body
      .split("\n")
      .filter((line) => line.startsWith("Disallow:"))
      .map((line) => line.replace(/#.*$/, "").replace("Disallow:", "").trim());

    expect(disallowed).toEqual(["/search?q=*", "/evidence/*"]);
    expect(disallowed).not.toContain("/");
  });
});
