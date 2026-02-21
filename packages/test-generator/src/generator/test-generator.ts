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
- Use testConfig fixture for entity IDs
- Use EXACT import paths and class names provided in the "Required Imports" section
- DO NOT modify or guess import paths - use them EXACTLY as given
- ONLY call methods that exist in the provided interactor class
- DO NOT invent methods or selectors that aren't in the interactor

## REQUIRED: Pre-Test Verification Protocol

Before writing ANY test, complete this checklist:

### Verification Checklist:
1. [ ] Method exists? (Scan "Generated Interactor" for exact method name)
2. [ ] Element exists? (Verify in widget source - not assumed)
3. [ ] Selector valid? (Trust interactor's implementation)

### Test Writing Rules:
| Interactor has method? | Widget has element? | Action |
|------------------------|---------------------|--------|
| Yes | Yes | ✓ Write test |
| Yes | No | ✗ Skip (interactor error) |
| No | Yes | ✗ Skip (no method to call) |
| No | No | ✗ Skip |

### Observation Guard:
Do NOT assume UI behavior based on component names.
Verify by checking interactor methods - if it's not there, don't test it.`;

export interface TestExamples {
  test?: string;
  fixtures?: string;
}

/**
 * Calculate the relative import path from test file to interactor file
 */
function calculateImportPath(entity: string, widgetName: string): string {
  // Test file: e2e/pages/{entity}/{widgetname}.spec.ts
  // Interactor file: POM/objects/widgets/{WidgetName}/{widgetName}Section.ts
  // Relative path: ../../../POM/objects/widgets/{WidgetName}/{widgetName}Section
  return `../../../POM/objects/widgets/${widgetName}/${widgetName.charAt(0).toLowerCase() + widgetName.slice(1)}Section`;
}

/**
 * Calculate the relative import path to the page class
 */
function calculatePageImportPath(entity: string): string {
  // Test file: e2e/pages/{entity}/{widgetname}.spec.ts
  // Page file: POM/page/{entity}/{entity}.ts
  // Relative path: ../../../POM/page/{entity}/{entity}
  return `../../../POM/page/${entity}/${entity}`;
}

/**
 * Generate the section class name from widget name
 */
function generateSectionClassName(widgetName: string): string {
  return `${widgetName}Section`;
}

/**
 * Generate the page class name from entity name
 */
function generatePageClassName(entity: string): string {
  // Convert entity name to PascalCase and add "Page"
  const pascalCase = entity.charAt(0).toUpperCase() + entity.slice(1);
  return `${pascalCase}Page`;
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

  // Calculate exact import paths and class names
  const sectionClassName = generateSectionClassName(widget.name);
  const sectionImportPath = calculateImportPath(widget.entity, widget.name);
  const pageClassName = generatePageClassName(widget.entity);
  const pageImportPath = calculatePageImportPath(widget.entity);

  const requiredImports = `
## Required Imports (USE EXACTLY AS SHOWN)
\`\`\`typescript
import { expect, test } from "../../../fixtures";
import { ${sectionClassName} } from "${sectionImportPath}";
import { ${pageClassName} } from "${pageImportPath}";
\`\`\`

IMPORTANT: 
- The section class is named "${sectionClassName}" - use this exact name
- The page class is named "${pageClassName}" - use this exact name
- Use these EXACT import paths - do not modify them`;

  const userPrompt = `## Task
Generate a Playwright test file. ONLY include tests for features that exist.

${formatWidgetInfo(widget)}

${formatAnalysisForPrompt(analysis)}

${requiredImports}

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
