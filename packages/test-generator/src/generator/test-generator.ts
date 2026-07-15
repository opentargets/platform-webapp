/**
 * Test file generation
 */

import { WidgetInfo, WidgetAnalysis, TestGeneratorConfig } from '../types';
import { callClaude, extractCodeBlock } from './llm-client';
import { formatWidgetSourcesForPrompt, formatWidgetInfo, formatAnalysisForPrompt } from './prompt-formatter';

const TEST_SYSTEM_PROMPT = `You are an expert QA engineer specializing in Playwright end-to-end testing.
Write comprehensive, maintainable test suites.

CRITICAL RULES:
- ONLY write tests for UI elements that ACTUALLY EXIST
- Import test and expect from "../../../fixtures" (NOT from @playwright/test)
- Use testConfig fixture for entity IDs`;

export interface TestExamples {
  test?: string;
  fixtures?: string;
}

/**
 * Generate test file for a widget
 */
export async function generateTest(
  widget: WidgetInfo,
  analysis: WidgetAnalysis,
  interactorCode: string,
  config: TestGeneratorConfig,
  examples: TestExamples
): Promise<string> {
  const allSources = formatWidgetSourcesForPrompt(widget);

  const userPrompt = `## Task
Generate a Playwright test file. ONLY include tests for features that exist.

${formatWidgetInfo(widget)}

${formatAnalysisForPrompt(analysis)}

## Widget Source Code
${allSources}

## Generated Interactor
\`\`\`typescript
${interactorCode}
\`\`\`

## Example Test (reference only)
\`\`\`typescript
${examples.test || ''}
\`\`\`

## Test Config Fixtures
\`\`\`typescript
${examples.fixtures || ''}
\`\`\`

Generate the TypeScript test file:`;

  const response = await callClaude(
    config.anthropicApiKey!,
    TEST_SYSTEM_PROMPT,
    userPrompt,
    config.model,
    config.maxTokens
  );

  return extractCodeBlock(response, 'typescript');
}
