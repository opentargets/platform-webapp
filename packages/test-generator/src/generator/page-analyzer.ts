/**
 * Page analyzer - LLM-based analysis of page components
 */

import { PageInfo, PageAnalysis, TestGeneratorConfig } from '../types';
import { callClaude, extractJson } from './llm-client';

const PAGE_ANALYSIS_SYSTEM_PROMPT = `You are an expert at analyzing React page components for test generation.
Your task is to analyze page source code and identify:
1. Navigation patterns (tabs, routes)
2. External links
3. GraphQL queries
4. URL parameters
5. Header elements
6. Existing data-testid attributes

Be precise and thorough in your analysis.`;

/**
 * Format page sources for LLM prompt
 */
function formatPageSourcesForPrompt(page: PageInfo): string {
  if (!page.sources) {
    return 'No source files available.';
  }

  let formatted = '';
  for (const [name, source] of Object.entries(page.sources)) {
    formatted += `### ${name}\n\`\`\`tsx\n${source}\n\`\`\`\n\n`;
  }
  return formatted;
}

/**
 * Analyze a page component using LLM
 */
export async function analyzePage(
  page: PageInfo,
  config: TestGeneratorConfig
): Promise<PageAnalysis> {
  const sourcesPrompt = formatPageSourcesForPrompt(page);

  const userPrompt = `## Task
Analyze the following React page component and extract information for test generation.

## Page Information
- **Name:** ${page.name}
- **Path:** ${page.path}
- **Route:** ${page.route || 'unknown'}
- **Entity Type:** ${page.entityType || 'unknown'}

## Page Source Files
${sourcesPrompt}

## Instructions
Analyze the page code and output JSON:

\`\`\`json
{
  "components": ["list", "of", "imported", "components"],
  "hasTabs": true/false,
  "tabs": [
    { "name": "Profile", "route": "/target/:id", "label": "Profile" },
    { "name": "Associations", "route": "/target/:id/associations", "label": "Associated diseases" }
  ],
  "hasExternalLinks": true/false,
  "hasQuery": true/false,
  "urlParams": ["ensgId", "efoId"],
  "headerElements": ["symbol", "name", "external links"],
  "routePattern": "/target/:ensgId",
  "entityType": "target",
  "existingTestIds": ["data-testid-1", "data-testid-2"],
  "reasoning": "Brief explanation of your analysis"
}
\`\`\`

Focus on:
1. Tab navigation (look for Tabs, Tab components and Route definitions)
2. External links in the header (identifiers.org, ensembl, uniprot, etc.)
3. GraphQL queries (useQuery imports)
4. URL parameters (useParams)
5. Header content (title, subtitle, external links section)`;

  const response = await callClaude(
    config.anthropicApiKey!,
    PAGE_ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
    config.model,
    2048
  );

  const parsed = extractJson<PageAnalysis>(response);
  
  if (!parsed) {
    // Return fallback analysis
    return {
      components: [],
      hasTabs: false,
      tabs: [],
      hasExternalLinks: false,
      hasQuery: false,
      urlParams: [],
      headerElements: [],
      routePattern: page.route || '',
      entityType: page.entityType || '',
      existingTestIds: [],
      reasoning: 'Failed to parse LLM response',
    };
  }

  return parsed;
}
