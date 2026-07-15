/**
 * AST-based utilities for modifying React component code
 *
 * This file re-exports from the ast/ submodules for backwards compatibility.
 * For new code, import directly from './ast' or specific submodules.
 */

export {
  // Parser
  parseCode,
  generateCode,
  
  // JSX utilities
  hasDataTestId,
  addDataTestId,
  getJSXElementName,
  hasAttribute,
  getStringAttribute,
  
  // Import extractor
  extractImports,
  categorizeImports,
  analyzeImports,
  extractImportsFromSources,
  getUsedUIComponents,
  type ExtractedImport,
  type CategorizedImports,
  
  // Analyzer
  analyzeComponentForTestIds,
  buildTargetComponentsFromImports,
  buildTargetComponentsFromCode,
  type TargetComponent,
  type TestIdSuggestion,
  type AnalysisResult,
  
  // Transformer
  addDataTestIdsToComponent,
  type AddTestIdsResult,
  type AddTestIdsOptions,
  
  // Widget processor
  processWidgetForTestIds,
  type FileResult,
  type ProcessWidgetResult,
  type ProcessWidgetOptions,
  type WidgetInput,
} from './ast';
