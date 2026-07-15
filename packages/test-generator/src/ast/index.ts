/**
 * AST utilities for modifying React component code
 *
 * This module provides tools for:
 * - Parsing TypeScript/JSX code
 * - Extracting and analyzing imports
 * - Analyzing components for test ID opportunities
 * - Adding data-testid attributes
 * - Batch processing widget files
 */

// Re-export from submodules
export { parseCode, generateCode } from './parser';

export {
  hasDataTestId,
  addDataTestId,
  getJSXElementName,
  hasAttribute,
  getStringAttribute,
} from './jsx-utils';

export {
  extractImports,
  categorizeImports,
  analyzeImports,
  extractImportsFromSources,
  getUsedUIComponents,
  type ExtractedImport,
  type CategorizedImports,
} from './import-extractor';

export {
  analyzeComponentForTestIds,
  buildTargetComponentsFromImports,
  buildTargetComponentsFromCode,
  extractExistingTestIds,
  extractComponentNames,
  type TargetComponent,
  type TestIdSuggestion,
  type AnalysisResult,
} from './analyzer';

export {
  addDataTestIdsToComponent,
  type AddTestIdsResult,
  type AddTestIdsOptions,
} from './transformer';

export {
  processWidgetForTestIds,
  type FileResult,
  type ProcessWidgetResult,
  type ProcessWidgetOptions,
  type WidgetInput,
} from './widget-processor';
