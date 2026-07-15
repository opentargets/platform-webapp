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
- Base your interactor ONLY on the provided analysis`;

export interface InteractorExamples {
  interactor?: string;
  interactorOntology?: string;
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

  const userPrompt = `## Task
Generate a Playwright interactor class. ONLY include methods for elements that exist.

${formatWidgetInfo(widget)}

${formatAnalysisForPrompt(analysis)}

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
