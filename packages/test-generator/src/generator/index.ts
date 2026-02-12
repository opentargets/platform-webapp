/**
 * Generator module - LLM-based code generation for tests and interactors
 */

// LLM client
export { callClaude, extractCodeBlock, extractJson } from './llm-client';

// Prompt utilities
export {
  formatWidgetSourcesForPrompt,
  formatWidgetInfo,
  formatAnalysisForPrompt,
} from './prompt-formatter';

// Widget analysis
export { analyzeWidget, analyzeDataTestIds, type DataTestIdAnalysis } from './analyzer';

// Code generators
export { generateInteractor, type InteractorExamples } from './interactor-generator';
export { generateTest, type TestExamples } from './test-generator';

// File I/O
export { loadExamples, writeGeneratedFiles, type Examples } from './file-io';

// Data-testid application
export { applyDataTestIds, type DataTestIdResult } from './testid-applicator';

// Main widget orchestrator
export { generateTestsForWidget } from './orchestrator';

// Page generation
export { analyzePage } from './page-analyzer';
export { generatePageInteractor, type PageExamples } from './page-interactor-generator';
export { generatePageTest } from './page-test-generator';
export { generateTestsForPage } from './page-orchestrator';
