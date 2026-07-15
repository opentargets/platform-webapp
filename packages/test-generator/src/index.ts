/**
 * Test Generator Package
 *
 * Automated test generation for Open Targets Platform widgets using LLM + AST.
 */

// Types
export type {
  WidgetInfo,
  WidgetAnalysis,
  PageInfo,
  PageAnalysis,
  PageGenerationResult,
  TestGeneratorConfig,
  GenerationResult,
  DataTestIdSuggestion,
  ASTProcessingResult,
  ASTFileResult,
  ASTProcessingOptions,
} from './types';

export { DEFAULT_CONFIG, PAGE_CONFIG } from './types';

// Widget detection
export { detectNewWidgets, readWidgetSources, getNewFiles, detect } from './detector';

// Page detection
export { detectNewPages, readPageSources, getAllPages } from './detector';

// AST utilities
export { parseCode, addDataTestIdsToComponent, processWidgetForTestIds } from './ast-utils';

// Widget generation
export {
  analyzeWidget,
  generateInteractor,
  generateTest,
  generateTestsForWidget,
  loadExamples,
  writeGeneratedFiles,
  applyDataTestIds,
} from './generator';

// Page generation
export {
  analyzePage,
  generatePageInteractor,
  generatePageTest,
  generateTestsForPage,
} from './generator';
