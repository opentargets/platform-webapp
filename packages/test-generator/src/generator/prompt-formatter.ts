/**
 * Prompt formatting utilities
 */

import { WidgetInfo, WidgetAnalysis } from '../types';

/**
 * Format all widget sources for inclusion in prompts
 */
export function formatWidgetSourcesForPrompt(widget: WidgetInfo): string {
  const sources = widget.sources || {};
  let formatted = '';

  // Main files first
  const mainFiles = ['index', 'Body', 'Summary', 'Description'];
  for (const file of mainFiles) {
    if (sources[file]) {
      formatted += `### ${file}.tsx\n\`\`\`typescript\n${sources[file]}\n\`\`\`\n\n`;
    }
  }

  // Imported local components
  const importedComponents = Object.keys(sources).filter(
    (key) => !mainFiles.includes(key) && !key.endsWith('.gql')
  );

  if (importedComponents.length > 0) {
    formatted += `### Imported Local Components\n\n`;
    for (const component of importedComponents) {
      formatted += `#### ${component}.tsx\n\`\`\`typescript\n${sources[component]}\n\`\`\`\n\n`;
    }
  }

  // GraphQL queries
  const gqlFiles = Object.keys(sources).filter((key) => key.endsWith('.gql'));
  if (gqlFiles.length > 0) {
    formatted += `### GraphQL Queries\n\n`;
    for (const gql of gqlFiles) {
      formatted += `#### ${gql}\n\`\`\`graphql\n${sources[gql]}\n\`\`\`\n\n`;
    }
  }

  return formatted;
}

/**
 * Format widget info section for prompts
 */
export function formatWidgetInfo(widget: WidgetInfo): string {
  return `## Widget Information
- **Name**: ${widget.name}
- **Entity**: ${widget.entity}
- **Section ID**: ${widget.id || widget.name.toLowerCase()}`;
}

/**
 * Format analysis results for prompts
 */
export function formatAnalysisForPrompt(analysis: WidgetAnalysis): string {
  return `## Widget Analysis
\`\`\`json
${JSON.stringify(analysis, null, 2)}
\`\`\`

## What to include based on analysis:
- Table methods: ${analysis.hasTable ? 'YES' : 'NO'}
- Search methods: ${analysis.hasSearch ? 'YES' : 'NO'}
- Pagination methods: ${analysis.hasPagination ? 'YES' : 'NO'}
- Chart methods: ${analysis.hasChart ? 'YES' : 'NO'}
- External link methods: ${analysis.hasExternalLinks ? 'YES' : 'NO'}
- Download methods: ${analysis.hasDownloader ? 'YES' : 'NO'}`;
}
