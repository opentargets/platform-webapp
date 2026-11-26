## End To End Test
The goal of this package is to setup automated E2E tests to check the platform web app for every pull request and against a new release.

## Technologies used
Playwright

## Folder Structure

```
packages/platform-test/
├── e2e/                          # Test files organized by page
│   └── pages/
│       ├── disease/              # Disease page tests
│       ├── drug/                 # Drug page tests
│       ├── study/                # Study page tests
│       ├── variant/              # Variant page tests
│       └── homepage.spec.ts      # Homepage tests
├── fixtures/                     # Test configuration and fixtures
│   ├── index.ts                  # Playwright fixture extensions
│   └── testConfig.ts             # Centralized test data configuration
├── POM/                          # Page Object Model implementation
│   ├── objects/                  # Reusable UI component interactors
│   │   ├── components/           # Shared components (headers, sections)
│   │   └── widgets/              # Feature-specific widgets (AOTF, evidence sections)
│   └── page/                     # Page-level abstractions
│       ├── disease/
│       ├── drug/
│       ├── study/
│       └── variant/
└── playwright.config.ts          # Playwright configuration
```

## Page Object Model

This project uses the **Page Object Model (POM)** pattern to create maintainable and reusable test code. Our POM implementation is organized into three layers:

### 1. **Page Objects** (`POM/page/`)
High-level page abstractions that represent entire pages and provide navigation methods.

```typescript
// Example: VariantPage
class VariantPage {
  goToVariantPage(variantId: string) { ... }
  getProfilePage() { ... }
}
```

### 2. **Component Objects** (`POM/objects/components/`)
Reusable UI components that appear across multiple pages (headers, evidence sections, etc.).

```typescript
// Example: EvidenceSection
class EvidenceSection {
  waitForSectionLoad(sectionId: string) { ... }
  isEvidenceSectionVisible(sectionId: string) { ... }
}
```

### 3. **Widget Objects** (`POM/objects/widgets/`)
Feature-specific, interactive components with complex behavior (tables, forms, drawers).

```typescript
// Example: AotfTable
class AotfTable {
  getDataCellsWithScores(rowIndex: number) { ... }
  clickDataCell(rowIndex: number, columnId: string) { ... }
}
```

### Best Practices

- **Prefer `data-testid` attributes** over generic selectors (classes, XPath) for stability and readability
  ```typescript
  // ✅ Good - uses data-testid
  page.locator("[data-testid='evidence-section-gwas']")
  
  // ❌ Avoid - fragile CSS selectors
  page.locator(".MuiBox-root .css-8b1dmf")
  ```

- Keep selectors in Page Objects, not in test files
- Return Locators or primitives, avoid complex logic in Page Objects
- One file per component/page for clarity

For more details on POM, see the [References](#references) section.

## Testing Different Behaviours with Fixtures

We use **Playwright fixtures** to manage test data and make tests flexible and maintainable. All test entity IDs are centralized in `fixtures/testConfig.ts`.

### CSV Configuration Schema

Test configurations are loaded from a Google Sheet CSV. Each row represents a testing scenario, and columns define the entity IDs to use for different test types.

| Column Name | Type | Description |
|-------------|------|-------------|
| `Testing Scenario` | string | |
| `drug_page_primary` | string | |
| `variant_primary` | string | |
| `variant_with_pharmacogenetics` | string | |
| `variant_with_qtl` | string | |
| `target_primary` | string | |
| `target_incomplete` | string (comma-separated) | |
| `target_aotf_diseases` | string (comma-separated) | |
| `disease_primary` | string | |
| `disease_name` | string | |
| `disease_alternatives` | string (comma-separated) | |
| `disease_aotf_genes` | string (comma-separated) | |
| `study_gwas` | string | |
| `study_qtl` | string | |
| `credible_set` | string | |
| `credible_set_GWAS_coloc` | string | |
| `credible_set_QTL_coloc` | string | |

### GitHub Actions Integration

The test configuration integrates with GitHub Actions through environment variables:

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `TEST_CONFIG_URL` | URL to the Google Sheet CSV export | Hardcoded default URL |
| `TEST_SCENARIO` | Name of the scenario row to use | `testing_scenario_1` |

**Workflow usage example:**

```yaml
- name: Run E2E Tests
  env:
    TEST_CONFIG_URL: ${{ secrets.TEST_CONFIG_SHEET_URL }}
    TEST_SCENARIO: ${{ github.event.inputs.test_scenario || 'testing_scenario_1' }}
  run: yarn dev:test:platform:e2e
```

This allows:
- Running tests with different entity configurations per environment
- Manual workflow dispatch with scenario selection
- Easy updates to test data without code changes

### Configuration Structure

```typescript
interface TestConfig {
  drug: {
    primary: string;              // Drug with comprehensive data
  };
  variant: {
    primary: string;              // Variant with GWAS data
    withMolecularStructure: string;
    withPharmacogenomics: string;
  };
  disease: {
    primary: string;
    name?: string;
    aotfGenes?: string[];         // Genes for AOTF table testing
  };
  study: {
    gwas: { primary: string };
    qtl?: { primary: string };
  };
}
```

### Using Fixtures in Tests

```typescript
test("Disease header is correctly displayed", async ({ page, testConfig }) => {
  // Use testConfig instead of hardcoded IDs
  await page.goto(`/disease/${testConfig.disease.primary}`);
  
  const diseaseName = page.getByTestId("profile-page-header-text");
  await expect(diseaseName).toHaveText(testConfig.disease.name);
});
```

### Benefits

- **Single source of truth** for test data
- **Easy to update** entity IDs without touching test files
- **Test different scenarios** by swapping configurations
- **Supports future external config** (API, environment variables)

## Annotating Critical Tests

We use Playwright's tagging system to identify **smoke tests** - critical tests that must pass before running the full suite.

### Marking Smoke Tests

Add `{ tag: '@smoke' }` to critical tests that validate core functionality:

```typescript
test("Homepage loads successfully", { tag: '@smoke' }, async ({ page }) => {
  await page.goto("/");
  const title = await page.title();
  expect(title).toBe("Open Targets Platform");
});
```

### Running Tests

```bash
# Run all tests
yarn dev:test:platform:e2e

# Run smoke tests only (fast feedback)
yarn dev:test:platform:e2e:smoke

# Run specific test file
npx playwright test e2e/pages/homepage.spec.ts
```

### CI Behavior

- **Pull Requests**: Automatically run smoke tests only (faster CI)
- **Manual Trigger**: Choose between `smoke` or `all` tests in GitHub Actions

## Testing Pattern
- User flow based testing
- [Page Object Model](https://testomat.io/blog/page-object-model-pattern-javascript-with-playwright/)

## How to setup
- `yarn install`
- `yarn playwright install` (to install playwright browser dependencies)
- `yarn dev:test:platform:e2e` (to run the test locally)
- `cd ./packages/platform-test && npx playwright test --ui ` (To run the tests in UI mode)

## Notes on Testing Github Workflow Locally

The workflow can be tested locally by installing [act](https://github.com/nektos/act).

To test the workflow:
- Install act: Follow the installation instructions at https://github.com/nektos/act
- Run the `test_workflow` script to execute the GitHub workflow locally

## Github Workflow 

```mermaid
gantt
    title E2E CI Workflow Timeline
    dateFormat X
    axisFormat %s
    
    section Trigger
    PR or Manual Dispatch :milestone, 0, 0
    
    section Parallel Jobs
    Extract Branch Name :extract, 0, 5
    Setup Netlify Deploy :crit, setup, 0, 10
    Install Dependencies :crit, after setup, 15
    Build Platform :crit, after setup, 20
    Deploy to Netlify :crit, after setup, 30
    
    section E2E Tests
    Wait for Dependencies :milestone, after extract deploy, 0
    Install Test Dependencies :test, after extract deploy, 10
    Install Playwright :after test, 15
    Run E2E Tests :active, after test, 25
```

## References
- [Page Object Model Pattern with Playwright](https://testomat.io/blog/page-object-model-pattern-javascript-with-playwright/) - Comprehensive guide on implementing POM in Playwright
- [Joran Quinten Tutorials](https://www.joranquinten.nl/tutorials/) - Playwright and testing tutorials
- [Running E2E Tests on Netlify Preview URL](https://www.joranquinten.nl/tutorials/running-e2e-test-suite-on-a-netlify-preview-url) - Guide for integrating Playwright with Netlify deployments
- [Adding Playwright Tests to GitHub Actions CI](https://snyk.io/es/blog/how-to-add-playwright-tests-pr-ci-github-actions/) - CI/CD integration tutorial
- [Triggering Netlify Deploys with GitHub Workflows](https://dev.to/thiernope/trigger-netlify-deploys-using-github-workflow-cicd-lcm) - Netlify automation guide
- [Actions Netlify Issue #1220](https://github.com/nwtgck/actions-netlify/issues/1220) - Discussion on Netlify GitHub Actions integration
- [Grouping Playwright Tests](https://testomat.io/blog/grouping-playwright-tests-for-improved-framework-efficiency/) - Test organization strategies
<<<<<<< HEAD
- [Playwright Test Annotations](https://playwright.dev/docs/test-annotations) - Official documentation for conditional tests and tagging
=======
- [Playwright Test Annotations](https://playwright.dev/docs/test-annotations) - Official documentation for conditional tests and tagging
>>>>>>> origin/main

## Rules for writing tests

The suite exists to fail when a page breaks. Every rule below closes a way a broken page
used to pass.

### 1. A missing section is a failure, never a skip

The app renders nothing for a section whose query returned no data, and renders nothing
for one whose query failed. A test that skips when the section is absent passes on a
broken page.

- Do not use `test.skip`, `test.fixme`, or an early `return` that depends on what the
  page shows.
- `fixtures/expectedSections.ts` lists the sections each test entity must render. Assert
  them with `expectSections(page, expectedSectionsFor(id))` and load one with
  `expectSectionLoaded(page, sectionId)` (both in `utils/sections.ts`).
- If the entity has no data for what you want to test, pick one that has (check the API),
  add it to `fixtures/testConfig.ts` and record its sections in the manifest.

### 2. Every test is watched by the page health guard

`fixtures/index.ts` attaches `pageHealth` to every test. It fails the test on an uncaught
exception, an unlisted `console.error`, a GraphQL response with `errors` or a non-2xx
status, a failed same-origin request, or error UI on screen (error boundary, route
error, section error, 404 page).

- Import `test` and `expect` from `fixtures`, never from `@playwright/test`.
- A test that provokes a problem on purpose declares it:
  `pageHealth.allow(/404 page is displayed/, "opens a route that does not exist", "error-ui")`.
  The pattern must be as narrow as the problem. Never allow `/./` outside `e2e/harness`.

### 3. Nothing is caught and dropped

- No `.catch(() => false)`, `.catch(() => {})`, or `try/catch` that carries on.
- No probe that turns a missing element into a boolean (`isVisible()`, `count() > 0`)
  and then branches on it. Assert with web-first assertions, which retry and report:
  `await expect(locator).toBeVisible()`.
- Page objects return `Locator`s or perform an action and assert its effect. They do not
  return `Promise<boolean>` or `string | null`.

### 4. Wait for what the user sees

- No `waitForTimeout`, no `networkidle`, no `waitForLoadState`.
- Wait for the condition itself: a row count, a URL, a heading, a spinner being gone.
  `expect(...)` and `expect.poll(...)` already retry.

### 5. An assertion has to be able to fail

- Not `toBeGreaterThanOrEqual(0)`, not `toBeDefined()` on a locator, not `not.toBeNull()`
  on a value that is never null.
- Assert what a broken page would get wrong: the column headers by name, that a search
  leaves only rows containing the term, that page 2 differs from page 1, that a sort
  reorders the column, that a link's `href` has the right route and id, that a drawer
  shows the record that was clicked.
- Prefer invariants to values that change with each data release. Use exact values only
  for things that identify the entity (its name, symbol, id).

### 6. Selectors

- `getByTestId` and `getByRole`, scoped to the section or component under test.
- No CSS classes generated by MUI or Emotion (`.css-1abc`), no positional selectors that
  depend on layout.
- If the element has no stable handle, add a `data-testid` (kebab-case) to the component.

### 7. Tests are independent

Each test navigates for itself and passes alone, in any order, in parallel with the
others. No state is carried between tests.

### Running

```bash
# against a running app
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 yarn playwright test e2e/pages/drug
# the smoke subset CI runs on every pull request
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 yarn playwright test --grep @smoke
# prove a test is stable before committing it
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 yarn playwright test <file> --repeat-each=3
yarn typecheck
```

## Sharing a run with the team

There are two ways to get a report other people can open. Both keep a screenshot, a
trace and a video for each failed test, and both are scoped to one branch.

**CI, on every pull request.** The `Tests: E2E` workflow runs against the branch's deploy
preview and publishes the report to `https://e2e-report-<branch>--ot-platform.netlify.app`.
It comments on the pull request with the counts, the failed tests and the link. A pull
request that changes `packages/platform-test` runs the full suite; any other runs
`@smoke`.

**From your machine, before or between pushes.**

```bash
yarn e2e:publish                  # the whole suite
yarn e2e:publish e2e/pages/drug   # only these specs
yarn e2e:publish --grep @smoke    # any Playwright argument is passed through
```

This tests the deploy preview of the branch you have checked out
(`https://<branch>--ot-platform.netlify.app`) and publishes the report to
`https://e2e-local-<branch>--ot-platform.netlify.app`. Publishing again replaces that
branch's report and leaves every other branch alone. The branch needs an open pull
request, so that its preview exists; use `--base-url http://localhost:3000` to test a
local server instead, and `--no-publish` to only build the report.

It needs the Netlify CLI logged in to an account on the Open Targets team:
`npm install -g netlify-cli && netlify login`.
