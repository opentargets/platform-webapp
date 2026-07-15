/**
 * Main orchestrator for test generation
 */

import { WidgetInfo, TestGeneratorConfig, GenerationResult } from '../types';
import { analyzeWidget } from './analyzer';
import { generateInteractor } from './interactor-generator';
import { generateTest } from './test-generator';
import { loadExamples, writeGeneratedFiles } from './file-io';
import { applyDataTestIds } from './testid-applicator';

/**
 * Generate tests for a single widget
 * 
 * Pipeline:
 * 1. Analyze widget structure using LLM
 * 2. Apply data-testids using LLM analysis
 * 3. Load example files for few-shot learning
 * 4. Generate interactor code
 * 5. Generate test code
 * 6. Write files to disk
 */
export async function generateTestsForWidget(
  widget: WidgetInfo,
  config: TestGeneratorConfig
): Promise<GenerationResult> {
  try {
    // Step 1: Analyze widget
    const analysis = await analyzeWidget(widget, config);

    if (config.verbose) {
      console.log(`  Analysis: table=${analysis.hasTable}, chart=${analysis.hasChart}`);
    }

    // Step 2: Apply data-testids using LLM analysis
    const dataTestIds = await applyDataTestIds(widget, config);

    if (config.verbose && dataTestIds.applied > 0) {
      console.log(`  Added ${dataTestIds.applied} data-testid(s) via LLM analysis`);
    }

    // Step 3: Load examples
    const examples = loadExamples(config);

    // Step 4: Generate interactor
    const interactorCode = await generateInteractor(widget, analysis, config, examples);

    // Step 5: Generate test
    const testCode = await generateTest(widget, analysis, interactorCode, config, examples);

    // Step 6: Write files
    const paths = writeGeneratedFiles(widget, interactorCode, testCode, config);

    return {
      widget: widget.name,
      entity: widget.entity,
      success: true,
      analysis: {
        hasTable: analysis.hasTable,
        hasChart: analysis.hasChart,
        hasSearch: analysis.hasSearch,
        hasPagination: analysis.hasPagination,
        customInteractions: analysis.customInteractions,
      },
      dataTestIds: {
        applied: dataTestIds.applied,
        failed: dataTestIds.failed,
        modifiedFiles: dataTestIds.files,
        method: dataTestIds.method,
      },
      ...paths,
    };
  } catch (error) {
    return {
      widget: widget.name,
      entity: widget.entity,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
