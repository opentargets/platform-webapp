/**
 * Generator module - LLM-based code generation for tests and interactors
 * 
 * Re-exports from generator/ submodules for backwards compatibility.
 */

export {
  // LLM client
  callClaude,
  extractCodeBlock,
  extractJson,
  
  // Prompt utilities
  formatWidgetSourcesForPrompt,
  formatWidgetInfo,
  formatAnalysisForPrompt,
  
  // Widget analysis
  analyzeWidget,
  
  // Code generators
  generateInteractor,
  generateTest,
  type InteractorExamples,
  type TestExamples,
  
  // File I/O
  loadExamples,
  writeGeneratedFiles,
  type Examples,
  
  // Data-testid application
  applyDataTestIds,
  type DataTestIdResult,
  
  // Main widget orchestrator
  generateTestsForWidget,
  
  // Page generation
  analyzePage,
  generatePageInteractor,
  generatePageTest,
  generateTestsForPage,
  type PageExamples,
} from './generator/index';
