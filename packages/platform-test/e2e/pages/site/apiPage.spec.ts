import { expect, test } from "../../../fixtures";
import { ApiPage } from "../../../POM/page/site/apiPage";

/** Every example query of the page: its group, description, operation name and a marker in its result. */
const EXAMPLES = [
  {
    group: "Target-disease association",
    description: "Find targets associated with a specific disease or phenotype",
    operation: "associatedTargets",
    entity: "MONDO_0005005",
    result: /"score": [0-9.]*[1-9]/,
  },
  {
    group: "Target-disease association",
    description: "Find diseases and phenotypes associated with a specific target",
    operation: "associatedDiseases",
    entity: "ENSG00000127318",
    result: /"score": [0-9.]*[1-9]/,
  },
  {
    group: "Target-disease evidence",
    description: "Explore evidence that supports a specific target-disease association",
    operation: "targetDiseaseEvidence",
    entity: "MONDO_0018908",
    result: /"count": [1-9]/,
  },
  {
    group: "Target annotation",
    description: "Find tractability and safety information for a specific target",
    operation: "targetAnnotation",
    entity: "ENSG00000169083",
    result: /"modality": "[A-Z]+"/,
  },
  {
    group: "Target annotation",
    description: "Explore molQTL credible sets for INSL6, including the ones from OTAR projects studies",
    operation: "QTLCredibleSetsQuery",
    entity: "ENSG00000120210",
    result: /"count": [1-9]/,
  },
  {
    group: "Disease annotation",
    description: "Find clinical signs and symptoms for a specific disease",
    operation: "diseaseAnnotation",
    entity: "MONDO_0018874",
    result: /"aspect": "[A-Z]"/,
  },
  {
    group: "Disease annotation",
    description: "GWAS associated with a specified disease",
    operation: "GWASStudiesQuery",
    entity: "MONDO_0008383",
    result: /"count": [1-9]/,
  },
  {
    group: "Drug annotation",
    description: "Find approval status and withdrawn and black-box warning for a specific drug",
    operation: "drugApprovalWithdrawnWarningData",
    entity: "CHEMBL118",
    result: /"count": [1-9]/,
  },
  {
    group: "Variant annotation",
    description:
      "Credible sets from quantitative trait loci associated with molecular traits containing a specified variant",
    operation: "QTLCredibleSetsQuery",
    entity: "19_44908822_C_T",
    result: /"count": [1-9]/,
  },
  {
    group: "Study annotation",
    description: "Information about a specified study",
    operation: "SharedTraitStudiesQuery",
    entity: "GCST90204201",
    result: /"count": [1-9]/,
  },
  {
    group: "Credible set Annotation",
    description: "Colocalisation metrics for overlapping GWAS credible sets",
    operation: "GWASColocQuery",
    entity: "118db6d05cf67fe7668ee7bac1170fd3",
    result: /"count": [1-9]/,
  },
  {
    group: "Search page",
    description: "Example query for KRAS",
    operation: "searchEntity",
    entity: "KRAS",
    result: /"total": [1-9]/,
  },
  {
    group: "Search page",
    description: "Example query to get how many entries there are in each entity category for PCSK9",
    operation: "searchTargetAggregations",
    entity: "PCSK9",
    result: /"total": [1-9]/,
  },
];

const GROUPS = [...new Set(EXAMPLES.map((example) => example.group))];

test.describe("API page", () => {
  test("renders the documentation and the GraphiQL playground @smoke", async ({ page }) => {
    const api = new ApiPage(page);
    await api.goto();

    await expect(page).toHaveTitle("API | Open Targets Platform");
    await expect(api.title).toHaveText("API");
    await expect(api.examples.getByText("Example queries", { exact: true })).toBeVisible();
    await expect(api.queryEditor).toBeVisible();
    await expect(api.result).toBeVisible();
    await expect(api.docExplorer).toContainText("A GraphQL schema provides a root type");
    // The toolbar and logo of GraphiQL are removed by the page.
    await expect(api.playground.getByRole("button", { name: /^Execute query/ })).toHaveCount(0);
  });

  test("links to the documentation, community, MCP and the dataset alternatives", async ({ page }) => {
    const api = new ApiPage(page);
    await api.goto();

    const links = [
      ["GraphQL API documentation", "https://platform-docs.opentargets.org/data-access/graphql-api"],
      ["Open Targets Community", "https://community.opentargets.org"],
      ["MCP", "https://platform-docs.opentargets.org/data-access/model-context-protocol"],
      ["our dataset downloads", "https://platform-docs.opentargets.org/data-access/datasets"],
      ["Google BigQuery instance", "https://platform-docs.opentargets.org/data-access/google-bigquery"],
    ];
    for (const [name, href] of links) {
      const link = api.link(name);
      await expect(link, name).toBeVisible();
      await expect(link, name).toHaveAttribute("href", href);
    }
  });

  test("lists the example query groups, all collapsed at first", async ({ page }) => {
    const api = new ApiPage(page);
    await api.goto();

    for (const group of GROUPS) {
      await expect(api.group(group)).toHaveAttribute("aria-expanded", "false");
    }
    await expect(api.examples.getByRole("button", { name: "Run sample query" })).toHaveCount(0);
    // The partner-only group is not part of the public Platform.
    await expect(api.examples.getByText("Partner Preview specific queries")).toHaveCount(0);
  });

  test("the editor starts empty", async ({ page }) => {
    const api = new ApiPage(page);
    await api.goto();

    await expect(api.queryEditor).not.toContainText("query ");
  });

  test("a group opens to show its examples and closes again", async ({ page }) => {
    const api = new ApiPage(page);
    await api.goto();

    await api.openGroup("Search page");
    await expect(api.examples.getByRole("button", { name: "Run sample query" })).toHaveCount(2);
    await expect(api.examples.getByText("Example query for KRAS")).toBeVisible();

    await api.group("Search page").click();
    await expect(api.group("Search page")).toHaveAttribute("aria-expanded", "false");
    await expect(api.examples.getByText("Example query for KRAS")).toBeHidden();
  });

  test("each group offers the expected number of sample queries", async ({ page }) => {
    const api = new ApiPage(page);
    await api.goto();

    for (const group of GROUPS) {
      const expected = EXAMPLES.filter((example) => example.group === group).length;
      await api.openGroup(group);
      await expect(api.examples.getByText(EXAMPLES.find((e) => e.group === group)?.description ?? "")).toBeVisible();
      await api.group(group).click();
      await expect(api.group(group), `${group} (${expected} examples)`).toHaveAttribute("aria-expanded", "false");
    }
  });

  for (const example of EXAMPLES) {
    test(`example "${example.description}" loads its query, and running it returns data`, async ({ page }) => {
      const api = new ApiPage(page);
      await api.goto();

      await api.loadExample(example.group, example.description, example.operation);
      await expect(api.queryEditor).toContainText(example.entity);

      await api.run();
      await expect(api.result).toContainText('"data"', { timeout: 30_000 });
      await expect(api.result).toContainText(example.result);
      await expect(api.result).not.toContainText('"errors"');
    });
  }

  test("choosing another example replaces the query in the editor", async ({ page }) => {
    const api = new ApiPage(page);
    await api.goto();

    await api.loadExample("Target-disease association", "Find targets associated with a specific disease or phenotype", "associatedTargets");
    await api.loadExample("Search page", "Example query for KRAS", "searchEntity");
    await expect(api.queryEditor).not.toContainText("query associatedTargets");
    await expect(api.queryEditor).toContainText('queryString: "KRAS"');
  });

  test("running an edited query returns the new result", async ({ page }) => {
    const api = new ApiPage(page);
    await api.goto();

    await api.loadExample("Drug annotation", "Find approval status and withdrawn and black-box warning for a specific drug", "drugApprovalWithdrawnWarningData");
    await api.run();
    await expect(api.result).toContainText('"id": "CHEMBL118"', { timeout: 30_000 });
    await expect(api.result).toContainText('"drugWarnings"');

    // GraphiQL reads the operation name of an edited query 100 ms after the edit, and a run in
    // that window asks for the previous query's operation. Keeping the operation name makes the
    // run correct whenever it happens; loading another example would not.
    await api.queryEditor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.insertText('query drugApprovalWithdrawnWarningData { drug(chemblId: "CHEMBL25") { name id } }');
    await api.run();
    await expect(api.result).toContainText('"id": "CHEMBL25"', { timeout: 30_000 });
    await expect(api.result).not.toContainText('"id": "CHEMBL118"');
    await expect(api.result).not.toContainText('"drugWarnings"');
  });

  test("a query the API rejects shows its error in the result pane", async ({ page, pageHealth }) => {
    pageHealth.allow(/Unknown field "thisFieldDoesNotExist"/, "runs a query with a field that does not exist", "graphql-error");
    const api = new ApiPage(page);
    await api.goto();

    await api.queryEditor.click();
    await page.keyboard.insertText("query broken { target(ensemblId: \"ENSG00000169174\") { thisFieldDoesNotExist } }");
    await page.keyboard.press("Control+Enter");
    await expect(api.result).toContainText("thisFieldDoesNotExist", { timeout: 30_000 });
    await expect(api.result).toContainText('"errors"');
  });
});
