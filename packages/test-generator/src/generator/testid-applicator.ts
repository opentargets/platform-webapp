/**
 * Data-testid application to widget source files
 * 
 * Uses a hybrid approach:
 * - LLM analyzes code and provides intelligent suggestions
 * - AST reliably applies the changes with precise code transformations
 */

import * as fs from 'fs';
import { WidgetInfo, TestGeneratorConfig } from '../types';
import { analyzeDataTestIds, DataTestIdAnalysis, TestIdSuggestion } from './analyzer';
import { applyTestIdSuggestionsToFiles, LLMTestIdSuggestion } from '../ast/llm-guided-transformer';

export interface DataTestIdResult {
  applied: number;
  failed: number;
  files: string[];
  method: 'llm+ast' | 'none';
  analysis?: DataTestIdAnalysis;
}

/**
 * Apply data-testids to widget source files using LLM analysis + AST transformation
 * 
 * This hybrid approach combines:
 * 1. LLM intelligence - understands context, component capabilities, and testing needs
 * 2. AST reliability - makes precise code modifications without string matching issues
 */
export async function applyDataTestIds(
  widget: WidgetInfo,
  config: TestGeneratorConfig
): Promise<DataTestIdResult> {
  if (config.skipDataTestIds) {
    return { applied: 0, failed: 0, files: [], method: 'none' };
  }

  // Step 1: Get LLM analysis for intelligent suggestions
  const analysis = await analyzeDataTestIds(widget, config);
  
  if (!analysis.suggestions || analysis.suggestions.length === 0) {
    if (config.verbose) {
      console.log('    No data-testid suggestions from LLM analysis');
      if (analysis.reasoning) {
        console.log(`    Reasoning: ${analysis.reasoning}`);
      }
    }
    return { applied: 0, failed: 0, files: [], method: 'llm+ast', analysis };
  }

  if (config.verbose) {
    console.log(`    LLM suggested ${analysis.suggestions.length} data-testid additions`);
    console.log(`    Reasoning: ${analysis.reasoning}`);
  }

  // Step 2: Convert LLM suggestions to AST transformer format
  const astSuggestions: LLMTestIdSuggestion[] = analysis.suggestions.map(
    (s: TestIdSuggestion) => ({
      file: s.file,
      elementName: s.elementName,
      testId: s.testId,
      reason: s.reason,
      matchAttributes: s.matchAttributes,
      occurrence: s.occurrence,
      parentElement: s.parentElement,
    })
  );

  // Step 3: Apply suggestions using AST transformation
  const transformResults = applyTestIdSuggestionsToFiles(
    widget.sources || {},
    astSuggestions,
    { verbose: config.verbose, dryRun: config.dryRun }
  );

  // Step 4: Write modified files and collect results
  const modifiedFiles: string[] = [];
  let totalApplied = 0;
  let totalFailed = 0;

  for (const [fileName, result] of transformResults) {
    totalApplied += result.applied;
    totalFailed += result.failed;

    if (result.modified) {
      const sourcePath = widget.sourcePaths?.[fileName];
      
      if (sourcePath && !config.dryRun) {
        fs.writeFileSync(sourcePath, result.code);
        modifiedFiles.push(sourcePath);
        
        // Update widget sources with transformed code
        if (widget.sources) {
          widget.sources[fileName] = result.code;
        }
      }

      if (config.verbose) {
        console.log(`    Modified ${fileName}: ${result.applied} test IDs applied`);
      }
    }

    // Log failures
    if (config.verbose) {
      for (const r of result.results) {
        if (!r.applied) {
          console.log(`    Failed: ${r.suggestion.testId} - ${r.reason}`);
        }
      }
    }
  }

  return {
    applied: totalApplied,
    failed: totalFailed,
    files: modifiedFiles,
    method: 'llm+ast',
    analysis,
  };
}
