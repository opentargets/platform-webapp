/**
 * Interactor code generation
 */

import { WidgetInfo, WidgetAnalysis, TestGeneratorConfig } from '../types';
import { callClaude, extractCodeBlock } from './llm-client';
import { formatWidgetSourcesForPrompt, formatWidgetInfo, formatAnalysisForPrompt } from './prompt-formatter';

const INTERACTOR_SYSTEM_PROMPT = `You are an expert TypeScript developer specializing in Playwright Page Object Model (POM) patterns.
Generate clean, well-documented interactor classes for UI testing.

CRITICAL RULES:
- ONLY generate methods for UI elements that ACTUALLY EXIST in the widget
- If there is NO table, do NOT generate table methods
- If there is NO search, do NOT generate search methods
- Base your interactor ONLY on the provided analysis
- Use the EXACT class name provided in the "Class Naming" section
- ONLY use data-testid selectors that are EXPLICITLY listed in "Existing Test IDs" section
- DO NOT assume or invent data-testid values - only use ones from the list

## REQUIRED: Tech-Stack Analysis (Complete Before Writing Code)

You MUST perform this analysis first and include it as a comment at the top of your output:

### Step 1: IDENTIFY - List the key UI imports
Extract ONLY actual imports from the source. Example:
- "@pixi/react" → Canvas rendering
- "@mui/material" → DOM elements
- "recharts" → SVG charts

### Step 2: DEDUCE - What DOM structure does this produce?
Based on Step 1, determine:
- Canvas-based (pixi, three.js, WebGL): Only <canvas> element in DOM
- SVG-based (d3 with DOM bindings, recharts, visx): <svg> + child elements in DOM  
- DOM-based (MUI, HTML): Standard queryable elements

CAUTION: d3-array, d3-scale, d3-format are MATH utilities, not DOM renderers.
Only d3-selection, d3-axis, etc. actually create DOM elements.

### Step 3: STRATEGIZE - Choose selector approach
- Canvas → Cannot query internal graphics; test container/canvas element
- SVG → Can query svg, path, rect, etc.
- DOM → Use data-testid, role, or CSS selectors`;

export interface InteractorExamples {
  interactor?: string;
  interactorOntology?: string;
}

/**
 * Generate the section class name from widget name
 */
function generateSectionClassName(widgetName: string): string {
  return `${widgetName}Section`;
}

/**
 * Extract all data-testid values from source code
 */
function extractExistingTestIds(sources: Record<string, string>): string[] {
  const testIds: string[] = [];
  const testIdRegex = /data-testid=["'`]([^"'`]+)["'`]/g;
  
  for (const source of Object.values(sources)) {
    let match;
    while ((match = testIdRegex.exec(source)) !== null) {
      if (!testIds.includes(match[1])) {
        testIds.push(match[1]);
      }
    }
  }
  
  return testIds;
}

/**
 * Generate interactor code for a widget
 */
export async function generateInteractor(
  widget: WidgetInfo,
  analysis: WidgetAnalysis,
  config: TestGeneratorConfig,
  examples: InteractorExamples
): Promise<string> {
  const allSources = formatWidgetSourcesForPrompt(widget);
  const sources = widget.sources || {};
  
  // Calculate exact class name
  const sectionClassName = generateSectionClassName(widget.name);
  
  // Extract existing test IDs from source
  const existingTestIds = extractExistingTestIds(sources);

  const classNaming = `
## Class Naming (USE EXACTLY AS SHOWN)
- The class MUST be named: \`${sectionClassName}\`
- Export the class as: \`export class ${sectionClassName}\`
- Do NOT use any other class name`;

  const testIdSection = `
## Existing Test IDs Found in Source Code
${existingTestIds.length > 0 
  ? existingTestIds.map(id => `- "${id}"`).join('\n')
  : '- No data-testid attributes found in the source code'
}

RULES:
- ONLY use data-testid selectors from the list above
- If the ID you need doesn't exist, use alternative selectors:
  - CSS class: page.locator('.class-name')
  - Element type: page.locator('canvas'), page.locator('table')
  - Text content: page.getByText('...')
  - Role: page.getByRole('button', { name: '...' })`;

  const reasoningSection = `
## Output Format Required

Your response MUST start with a tech-stack analysis comment block:

\`\`\`typescript
/**
 * TECH-STACK ANALYSIS:
 * [Step 1 - IDENTIFY] Key imports: <list actual imports found>
 * [Step 2 - DEDUCE] DOM structure: <Canvas|SVG|DOM> because <reason>
 * [Step 3 - STRATEGIZE] Selector approach: <your strategy>
 */
\`\`\`

Then generate the interactor class.

NOTE: If you skip the analysis or get it wrong, the selectors will fail.`;

  const userPrompt = `## Task
Generate a Playwright interactor class. ONLY include methods for elements that exist.

${formatWidgetInfo(widget)}

${formatAnalysisForPrompt(analysis)}

${classNaming}

${testIdSection}

${reasoningSection}

## Widget Source Code
${allSources}

## Example Interactor (reference only)
\`\`\`typescript
${examples.interactor || ''}
\`\`\`

Generate the TypeScript interactor class:`;

  const response = await callClaude(
    config.anthropicApiKey!,
    INTERACTOR_SYSTEM_PROMPT,
    userPrompt,
    config.model,
    config.maxTokens
  );

  return extractCodeBlock(response, 'typescript');
}
