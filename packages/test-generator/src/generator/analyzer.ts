/**
 * Widget analysis using LLM
 */

import { WidgetInfo, WidgetAnalysis, SuggestedTestId, TestGeneratorConfig } from '../types';
import { callClaude, extractJson } from './llm-client';
import { formatWidgetSourcesForPrompt, formatWidgetInfo } from './prompt-formatter';
import { readUIComponentSources } from '../detector/source-reader';

const ANALYSIS_SYSTEM_PROMPT = `You are an expert code analyst specializing in React components and UI testing.
Your task is to carefully analyze React component code and identify exactly what UI elements are present.
Be precise and thorough. Do NOT assume elements exist if they are not explicitly in the code.
IMPORTANT: Analyze ALL provided source files including imported local components.`;

const DATA_TESTID_ANALYSIS_PROMPT = `You are an expert React developer analyzing code to determine where data-testid attributes should be added for Playwright testing.

## Your Task
Analyze the widget code AND the source code of imported UI components to determine:
1. Which components render DOM elements that can accept data-testid
2. Which components are providers/wrappers that don't render DOM
3. Which components already have built-in test ID mechanisms

## How to Determine if a Component Accepts data-testid
Look at the component's source code:
- If it spreads props onto a DOM element (e.g., \`<div {...props}>\` or \`<Button {...rest}>\`), it CAN accept data-testid
- If it only destructures specific props and doesn't spread, it CANNOT accept data-testid
- Provider components that just return \`{children}\` or wrap with Context do NOT render DOM

## Rules for data-testid placement:

1. **Add data-testid to:**
   - Native HTML elements (div, button, input, table, etc.)
   - MUI components (they forward props to DOM)
   - Custom components that you can verify spread props to DOM (check their source!)

2. **Do NOT add data-testid to:**
   - Provider/Context components (they don't render DOM - verify by checking source)
   - Components with built-in testid mechanisms (e.g., SectionItem uses definition.id)
   - Components that don't spread props to their root element

3. **Test ID naming convention:**
   - Format: \`{sectionId}-{descriptive-name}\`
   - Use kebab-case

## Important
You MUST check the provided component source code to make your decisions. Don't guess - verify!`;

/**
 * Create fallback analysis based on keyword matching
 */
function createFallbackAnalysis(widget: WidgetInfo): WidgetAnalysis {
  const allSourcesText = Object.values(widget.sources || {}).join('\n');
  
  return {
    uiComponents: [],
    hasTable: allSourcesText.includes('OtTable') || allSourcesText.includes('<Table'),
    hasChart: allSourcesText.includes('Chart') || allSourcesText.includes('Plot'),
    hasSearch: allSourcesText.includes('showGlobalFilter') || allSourcesText.includes('Search'),
    hasPagination: allSourcesText.includes('pagination'),
    hasExternalLinks: allSourcesText.includes('Link external'),
    hasDownloader: allSourcesText.includes('dataDownloader'),
    customInteractions: [],
    existingTestIds: [],
    suggestedTestIds: [],
    reasoning: 'Fallback analysis based on keyword matching',
  };
}

/**
 * Format UI component sources for the prompt
 */
function formatUIComponentSources(uiSources: Record<string, string>): string {
  if (Object.keys(uiSources).length === 0) {
    return '';
  }

  let output = '\n## UI Package Component Definitions\n';
  output += 'These are the source files for components imported from "ui" package.\n';
  output += 'Use these to determine if components accept data-testid (look for prop spreading).\n\n';

  for (const [name, source] of Object.entries(uiSources)) {
    output += `### ${name}\n\`\`\`tsx\n${source}\n\`\`\`\n\n`;
  }

  return output;
}

/**
 * Analyze widget code to understand its structure
 */
export async function analyzeWidget(
  widget: WidgetInfo,
  config: TestGeneratorConfig
): Promise<WidgetAnalysis> {
  const allSources = formatWidgetSourcesForPrompt(widget);

  const userPrompt = `## Task
Carefully analyze the following React widget/section code and ALL its imported local components.

${formatWidgetInfo(widget)}

## Widget Source Code
${allSources}

## Instructions
Analyze ALL provided source files and output JSON:

\`\`\`json
{
  "uiComponents": ["list", "of", "all", "components", "found"],
  "hasTable": true/false,
  "hasChart": true/false,
  "hasSearch": true/false,
  "hasPagination": true/false,
  "hasExternalLinks": true/false,
  "hasDownloader": true/false,
  "customInteractions": ["list", "of", "interactions"],
  "existingTestIds": ["list", "of", "existing", "testids"],
  "suggestedTestIds": [],
  "reasoning": "Brief explanation of your analysis"
}
\`\`\`

NOTE: Leave suggestedTestIds empty - data-testid analysis will be done separately.`;

  const response = await callClaude(
    config.anthropicApiKey!,
    ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
    config.model,
    2048
  );

  const parsed = extractJson<WidgetAnalysis>(response);
  return parsed || createFallbackAnalysis(widget);
}

/**
 * Result of data-testid analysis
 */
export interface DataTestIdAnalysis {
  suggestions: SuggestedTestId[];
  codeChanges: Array<{
    file: string;
    original: string;
    modified: string;
    description: string;
  }>;
  reasoning: string;
}

/**
 * Analyze widget code to suggest data-testid additions using LLM
 * 
 * This uses the LLM to intelligently determine:
 * - Which elements can actually receive data-testid (by checking component source)
 * - Which elements would be useful for testing
 * - The exact code modifications needed
 */
export async function analyzeDataTestIds(
  widget: WidgetInfo,
  config: TestGeneratorConfig
): Promise<DataTestIdAnalysis> {
  const sectionId = widget.id || widget.name.charAt(0).toLowerCase() + widget.name.slice(1);
  const allSources = formatWidgetSourcesForPrompt(widget);
  
  // Fetch UI component sources for context
  const uiComponentSources = readUIComponentSources(widget.sources || {});
  const uiSourcesPrompt = formatUIComponentSources(uiComponentSources);

  const userPrompt = `## Task
Analyze the following React widget code and determine where data-testid attributes should be added for Playwright testing.

${formatWidgetInfo(widget)}
Section ID for test IDs: "${sectionId}"

## Widget Source Code
${allSources}
${uiSourcesPrompt}

## Instructions

1. First, review the UI component source files to understand which components can accept data-testid
2. Then analyze the widget code and suggest appropriate data-testid additions
3. For each suggestion, provide the EXACT code change needed

Output JSON:
\`\`\`json
{
  "suggestions": [
    {
      "element": "description of the element",
      "testId": "the-test-id-to-add",
      "file": "filename (e.g., Body, BodyContent)",
      "reason": "why this element needs a testid and verification that it accepts the prop"
    }
  ],
  "codeChanges": [
    {
      "file": "filename (e.g., Body, BodyContent)",
      "original": "exact original JSX code snippet (2-3 lines for context)",
      "modified": "the same code with data-testid added",
      "description": "what was added"
    }
  ],
  "reasoning": "Overall explanation including which components you verified can/cannot accept data-testid"
}
\`\`\`

IMPORTANT:
- Check the UI component sources to verify if they spread props to DOM
- Provider components (like GenTrackProvider) typically just return children - check source to confirm
- SectionItem already has built-in testid via definition.id - skip it
- Be very precise with the original/modified code - they must match exactly
- Include enough context in 'original' to make it unique in the file`;

  if (config.verbose) {
    console.log(`    Analyzing data-testids with ${Object.keys(uiComponentSources).length} UI component sources`);
  }

  const response = await callClaude(
    config.anthropicApiKey!,
    DATA_TESTID_ANALYSIS_PROMPT,
    userPrompt,
    config.model,
    4096
  );

  const parsed = extractJson<DataTestIdAnalysis>(response);
  
  if (!parsed) {
    return {
      suggestions: [],
      codeChanges: [],
      reasoning: 'Failed to parse LLM response',
    };
  }

  return parsed;
}
