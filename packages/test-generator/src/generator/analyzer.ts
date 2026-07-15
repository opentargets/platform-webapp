/**
 * Widget analysis using LLM
 */

import { WidgetInfo, WidgetAnalysis, TestGeneratorConfig } from '../types';
import { callClaude, extractJson } from './llm-client';
import { formatWidgetSourcesForPrompt, formatWidgetInfo } from './prompt-formatter';
import { readUIComponentSources } from '../detector/source-reader';

const ANALYSIS_SYSTEM_PROMPT = `You are an expert code analyst specializing in React components and UI testing.
Your task is to carefully analyze React component code and identify exactly what UI elements are present.
Be precise and thorough. Do NOT assume elements exist if they are not explicitly in the code.
IMPORTANT: Analyze ALL provided source files including imported local components.

## REQUIRED: Rendering Technology Analysis

Before analyzing, classify each major component:

### Classification Rules:
| Import Pattern | Technology | DOM Queryable? |
|----------------|------------|----------------|
| @pixi/react, Stage, Container, Sprite | Canvas | No (only <canvas> element) |
| three, WebGLRenderer | WebGL | No (only <canvas> element) |
| <svg>, <path>, <rect> in JSX | SVG | Yes |
| d3-selection, d3-axis (DOM bindings) | SVG | Yes |
| d3-array, d3-scale, d3-format | Math only | N/A (no rendering) |
| recharts, visx, nivo | SVG | Yes |
| MUI components, HTML elements | DOM | Yes |

### CAUTION: Avoid Over-Inference
- d3 imports do NOT always mean SVG - check which d3 modules are used
- A component importing d3-scale is doing math, not creating DOM elements
- Only d3-selection, d3-axis, etc. actually manipulate the DOM`;

const DATA_TESTID_ANALYSIS_PROMPT = `You are an expert React developer analyzing code to determine where data-testid attributes should be added for Playwright testing.

## Your Task
Analyze the widget code AND the source code of imported UI components to determine:
1. Which components render DOM elements that can accept data-testid
2. Which components are providers/wrappers that don't render DOM
3. Which components already have built-in test ID mechanisms
4. Which components need a new \`testId\` prop added to support testing

## REQUIRED: Component Analysis Protocol

For EACH component you consider, complete this checklist:

### Checklist (answer Yes/No for each):
1. [ ] Does it render a DOM element? (Check JSX return)
2. [ ] Does it spread props? (Look for {...props} or {...rest})
3. [ ] Is it a canvas/WebGL component? (Check imports)
4. [ ] Is it a provider/context wrapper? (Returns only children?)

### Decision Matrix:
| Renders DOM? | Spreads Props? | Canvas? | Action |
|--------------|----------------|---------|--------|
| Yes | Yes | No | ✓ Can add data-testid directly |
| Yes | No | No | ✓ Needs testId prop added to component |
| Yes | - | Yes | ✗ Add to DOM wrapper, not canvas internals |
| No | - | - | ✗ Skip (no DOM output) |

### Over-Inference Guard:
DO NOT assume canvas just because you see "graphics" or "visualization" in names.
DO verify by checking actual imports for @pixi/react, three, WebGL, etc.

## How to Determine if a Component Accepts data-testid
Look at the component's source code:
- If it spreads props onto a DOM element (e.g., \`<div {...props}>\` or \`<Button {...rest}>\`), it CAN accept data-testid directly
- If it only destructures specific props and doesn't spread, it CANNOT accept data-testid directly
- Provider components that just return \`{children}\` or wrap with Context do NOT render DOM

## Rules for data-testid placement:

1. **Add data-testid directly to:**
   - Native HTML elements (div, button, input, table, etc.)
   - MUI components (they forward props to DOM)
   - Custom components that you can verify spread props to DOM (check their source!)

2. **Add a new \`testId\` prop to components that:**
   - Don't spread props to their root element but DO render a DOM element
   - Need to be testable but currently have no way to pass data-testid
   - For these, suggest BOTH: (a) adding \`testId\` prop to the component definition, and (b) using it on the root element

3. **Do NOT add data-testid to:**
   - Provider/Context components (verify: do they just return children/context?)
   - Components with built-in testid mechanisms (check: does it already apply a testid internally?)
   - Canvas/WebGL rendering components (check: does it render to <canvas>? if so, find the DOM wrapper)
   - Components that don't output DOM (check: trace the render - does it produce HTML elements?)

4. **Test ID naming convention:**
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
 * A structured suggestion for adding a data-testid
 * Contains enough info for AST to reliably find and modify the element
 */
export interface TestIdSuggestion {
  /** File name (e.g., "Body", "BodyContent") */
  file: string;
  /** JSX element/component name (e.g., "Link", "Box", "TableCell") */
  elementName: string;
  /** The data-testid value to add */
  testId: string;
  /** Why this element needs a testid */
  reason: string;
  /** 
   * Attributes to match for disambiguation when multiple elements exist.
   * E.g., { "href": "someUrl" } or { "className": "header" }
   */
  matchAttributes?: Record<string, string>;
  /**
   * If element is the Nth occurrence (1-based), specify here.
   * E.g., occurrence: 2 means the second <Link> in the file.
   */
  occurrence?: number;
  /**
   * Parent element name for additional disambiguation.
   * E.g., parentElement: "TableRow" to find Link inside a TableRow
   */
  parentElement?: string;
}

/**
 * Result of data-testid analysis
 */
export interface DataTestIdAnalysis {
  /** Structured suggestions for AST-based application */
  suggestions: TestIdSuggestion[];
  /** Overall reasoning from the LLM */
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

1. Review the UI component source files to understand which components can accept data-testid
2. Analyze the widget code and identify elements that need data-testid attributes for testing
3. For each element, provide STRUCTURED information so AST tools can reliably find and modify it

## Output Format

Provide JSON with structured suggestions. The AST transformer will use this info to find elements:

\`\`\`json
{
  "suggestions": [
    {
      "file": "Body",
      "elementName": "Link",
      "testId": "${sectionId}-external-link",
      "reason": "External link for testing navigation",
      "matchAttributes": { "external": true },
      "occurrence": 1,
      "parentElement": "Box"
    }
  ],
  "reasoning": "Overall explanation of analysis"
}
\`\`\`

### Field Descriptions:
- **file**: Source file name (e.g., "Body", "BodyContent") - REQUIRED
- **elementName**: JSX element/component name (e.g., "Link", "Box", "TableCell") - REQUIRED  
- **testId**: The data-testid value to add - REQUIRED
- **reason**: Why this element needs a testid - REQUIRED
- **matchAttributes**: Key-value pairs to match specific element (e.g., {"external": true}, {"className": "header"}) - OPTIONAL but helpful for disambiguation
- **occurrence**: If multiple elements match, which one (1-based index) - OPTIONAL, defaults to 1
- **parentElement**: Parent element name for disambiguation - OPTIONAL

## Rules

1. **Only suggest elements that can accept data-testid:**
   - Native HTML elements (div, button, span, etc.)
   - MUI components (they forward props)
   - Custom components that spread props (verify in source!)

2. **Skip these:**
   - Provider/Context components (verify: just return children?)
   - Components with built-in testid (like SectionItem with definition.id)
   - Canvas/WebGL components
   - Elements that already have data-testid

3. **For disambiguation when multiple similar elements exist:**
   - Use matchAttributes to specify distinguishing props
   - Use occurrence number as fallback
   - Use parentElement for nested context

4. **Test ID naming:** Use format \`${sectionId}-descriptive-name\` in kebab-case`;

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
      reasoning: 'Failed to parse LLM response',
    };
  }

  return parsed;
}
