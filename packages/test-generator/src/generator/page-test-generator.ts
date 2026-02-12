/**
 * Page test generator - LLM-based generation of Playwright tests for pages
 */

import { PageInfo, PageAnalysis, TestGeneratorConfig } from '../types';
import { callClaude, extractCodeBlock } from './llm-client';
import { PageExamples } from './page-interactor-generator';

const PAGE_TEST_SYSTEM_PROMPT = `You are an expert at generating Playwright test suites.
Generate comprehensive, well-organized TypeScript test code.
Follow existing patterns and best practices for Playwright tests.
Use the Page Object Model pattern with interactors.`;

/**
 * Generate page tests using LLM
 */
export async function generatePageTest(
  page: PageInfo,
  analysis: PageAnalysis,
  interactorCode: string,
  config: TestGeneratorConfig,
  examples?: PageExamples
): Promise<string> {
  const exampleTest = examples?.test || '';

  // Extract class name from interactor code
  const classNameMatch = interactorCode.match(/export class (\w+)/);
  const className = classNameMatch ? classNameMatch[1] : page.name;

  const userPrompt = `## Task
Generate a Playwright test suite for the following page.

## Page Information
- **Name:** ${page.name}
- **Route:** ${page.route || 'unknown'}
- **Entity Type:** ${page.entityType || 'unknown'}

## Analysis Results
- **Has Tabs:** ${analysis.hasTabs}
- **Tabs:** ${JSON.stringify(analysis.tabs)}
- **Has External Links:** ${analysis.hasExternalLinks}
- **Has Query:** ${analysis.hasQuery}
- **URL Parameters:** ${JSON.stringify(analysis.urlParams)}
- **Header Elements:** ${JSON.stringify(analysis.headerElements)}

## Generated Interactor
\`\`\`typescript
${interactorCode}
\`\`\`

## Example Test (follow this pattern)
\`\`\`typescript
${exampleTest || `import { expect, test } from "../../../fixtures";
import { ExamplePage } from "../../../POM/page/example/example";

test.describe("Example Page", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    const id = testConfig.example?.primary || "default-id";
    await page.goto(\`\${baseURL}/example/\${id}\`);
  });

  test("page loads successfully", async ({ page }) => {
    const examplePage = new ExamplePage(page);
    await examplePage.waitForPageLoad();
    const isLoaded = await examplePage.isPageLoaded();
    expect(isLoaded).toBe(true);
  });
});`}
\`\`\`

## Requirements
1. Import test and expect from fixtures: \`import { expect, test } from "../../../fixtures";\`
2. Import the interactor class: \`import { ${className} } from "../../../POM/page/${page.entityType || page.name.toLowerCase()}/${page.name.toLowerCase()}";\`
3. Use testConfig to get entity IDs (e.g., testConfig.target?.primary)
4. Include test.describe blocks for logical groupings:
   - "Page Header" - tests for title, name, loading
   - "External Links" - tests for each type of external link (if hasExternalLinks)
   - "Tab Navigation" - tests for tab switching (if hasTabs)
   - "Direct Navigation" - tests for direct URL access
   - "Page Title and Meta" - tests for document title
5. Use beforeEach to navigate to the page
6. Create instances of the interactor in each test
7. Use expect assertions from Playwright
8. Handle optional elements gracefully (check visibility before assertions)
9. Use testConfig for entity IDs, with fallback defaults

## Output
Generate ONLY the TypeScript test code, no explanations:`;

  const response = await callClaude(
    config.anthropicApiKey!,
    PAGE_TEST_SYSTEM_PROMPT,
    userPrompt,
    config.model,
    config.maxTokens
  );

  return extractCodeBlock(response) || response;
}
