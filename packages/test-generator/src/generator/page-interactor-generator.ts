/**
 * Page interactor generator - LLM-based generation of Page Object Model classes for pages
 */

import { PageInfo, PageAnalysis, TestGeneratorConfig } from '../types';
import { callClaude, extractCodeBlock } from './llm-client';

/**
 * Examples for page interactor generation
 */
export interface PageExamples {
  interactor?: string;
  test?: string;
}

const PAGE_INTERACTOR_SYSTEM_PROMPT = `You are an expert at generating Playwright Page Object Model (POM) classes.
Generate clean, well-documented TypeScript code for page interactors.
Follow the existing patterns and conventions in the codebase.
Use proper Playwright locators and methods.`;

/**
 * Generate a page interactor class using LLM
 */
export async function generatePageInteractor(
  page: PageInfo,
  analysis: PageAnalysis,
  config: TestGeneratorConfig,
  examples?: PageExamples
): Promise<string> {
  const exampleInteractor = examples?.interactor || '';
  
  const userPrompt = `## Task
Generate a Playwright Page Object Model (POM) interactor class for the following page.

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
- **Existing Test IDs:** ${JSON.stringify(analysis.existingTestIds)}

## Example Interactor (follow this pattern)
\`\`\`typescript
${exampleInteractor || `import type { Locator, Page } from "@playwright/test";

export class ExamplePage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goToPage(id: string): Promise<void> {
    await this.page.goto(\`/example/\${id}\`);
    await this.page.waitForLoadState("networkidle");
  }

  getHeader(): Locator {
    return this.page.locator("[data-testid='header']");
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }
}`}
\`\`\`

## Requirements
1. Create a class named \`${page.name}\` (e.g., TargetPage, DiseasePage)
2. Include navigation methods (goTo{PageName})
3. Include tab navigation methods if page has tabs
4. Include methods for external links if present
5. Include methods for header elements
6. Include waitForPageLoad and isPageLoaded methods
7. Use proper TypeScript types
8. Add JSDoc comments for all methods
9. Use data-testid selectors when available, fall back to role/text selectors
10. Return Locator objects for element getters, use async methods for actions

## Output
Generate ONLY the TypeScript code, no explanations:`;

  const response = await callClaude(
    config.anthropicApiKey!,
    PAGE_INTERACTOR_SYSTEM_PROMPT,
    userPrompt,
    config.model,
    config.maxTokens
  );

  return extractCodeBlock(response) || response;
}
