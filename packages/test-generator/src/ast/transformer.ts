/**
 * Code transformer for adding data-testids to React components
 */

import { generateCode } from './parser';
import { addDataTestId } from './jsx-utils';
import { analyzeComponentForTestIds, TestIdSuggestion, TargetComponent } from './analyzer';

/**
 * Result of adding test IDs to a component
 */
export interface AddTestIdsResult {
  /** The transformed code (or original if no changes) */
  code: string;
  /** List of suggestions found */
  suggestions: TestIdSuggestion[];
  /** Number of test IDs actually applied */
  applied: number;
  /** Whether the code was modified */
  modified: boolean;
}

/**
 * Options for adding test IDs
 */
export interface AddTestIdsOptions {
  /** If true, don't modify the code */
  dryRun?: boolean;
  /** If true, log detailed output */
  verbose?: boolean;
  /** Custom target components (auto-detected from imports if not provided) */
  targetComponents?: TargetComponent[];
}

/**
 * Add data-testids to a React component
 */
export function addDataTestIdsToComponent(
  code: string,
  sectionId: string,
  options: AddTestIdsOptions = {}
): AddTestIdsResult {
  const { dryRun = false, verbose = false, targetComponents } = options;

  const analysis = analyzeComponentForTestIds(code, sectionId, targetComponents);

  if (verbose) {
    console.log(
      `Found ${analysis.suggestions.length} elements that could use data-testid:`
    );
    for (const s of analysis.suggestions) {
      console.log(`  - ${s.elementName} at line ${s.line} → ${s.testId}`);
    }
  }

  if (dryRun || analysis.suggestions.length === 0) {
    return {
      code,
      suggestions: analysis.suggestions,
      applied: 0,
      modified: false,
    };
  }

  let applied = 0;
  for (const suggestion of analysis.suggestions) {
    if (addDataTestId(suggestion.node, suggestion.testId)) {
      applied++;
    }
  }

  return {
    code: generateCode(analysis.ast),
    suggestions: analysis.suggestions,
    applied,
    modified: applied > 0,
  };
}
