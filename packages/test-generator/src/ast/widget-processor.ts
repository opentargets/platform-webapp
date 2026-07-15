/**
 * Widget processor for batch processing widget source files
 */

import { addDataTestIdsToComponent, AddTestIdsResult } from './transformer';
import { TestIdSuggestion, TargetComponent, buildTargetComponentsFromImports } from './analyzer';
import { analyzeImports, CategorizedImports } from './import-extractor';

/**
 * Result for a single file
 */
export interface FileResult {
  name: string;
  path: string;
  suggestions?: TestIdSuggestion[];
  applied?: number;
  modified?: boolean;
  newCode?: string | null;
  error?: string;
}

/**
 * Result of processing all widget files
 */
export interface ProcessWidgetResult {
  files: FileResult[];
  totalApplied: number;
  totalSuggestions: number;
}

/**
 * Options for processing a widget
 */
export interface ProcessWidgetOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Widget information needed for processing
 */
export interface WidgetInput {
  id?: string | null;
  name: string;
  sources?: Record<string, string>;
  sourcePaths?: Record<string, string>;
}

/** Files that are always processed */
const PRIMARY_FILES = ['Body', 'Summary'];

/** Files to skip when processing imports */
const SKIP_FILES = ['index', 'Description'];

/**
 * Check if a file should be processed as an imported component
 */
function isImportedComponent(name: string): boolean {
  return (
    !PRIMARY_FILES.includes(name) &&
    !SKIP_FILES.includes(name) &&
    !name.endsWith('.gql')
  );
}

/**
 * Aggregate imports from all widget source files
 */
function aggregateWidgetImports(sources: Record<string, string>): CategorizedImports {
  const aggregated: CategorizedImports = {
    uiComponents: [],
    muiComponents: [],
    localComponents: [],
    otherImports: [],
    all: [],
  };

  const seenUI = new Set<string>();
  const seenMUI = new Set<string>();

  for (const [fileName, code] of Object.entries(sources)) {
    // Skip GraphQL files
    if (fileName.endsWith('.gql')) continue;

    try {
      const imports = analyzeImports(code);

      for (const imp of imports.uiComponents) {
        if (!seenUI.has(imp.name)) {
          seenUI.add(imp.name);
          aggregated.uiComponents.push(imp);
          aggregated.all.push(imp);
        }
      }

      for (const imp of imports.muiComponents) {
        if (!seenMUI.has(imp.name)) {
          seenMUI.add(imp.name);
          aggregated.muiComponents.push(imp);
          aggregated.all.push(imp);
        }
      }

      aggregated.localComponents.push(...imports.localComponents);
      aggregated.otherImports.push(...imports.otherImports);
    } catch {
      // Skip files that fail to parse
    }
  }

  return aggregated;
}

/**
 * Process a single source file
 */
function processFile(
  fileName: string,
  sourceCode: string,
  filePath: string,
  sectionId: string,
  options: ProcessWidgetOptions,
  targetComponents?: TargetComponent[]
): FileResult & { result?: AddTestIdsResult } {
  try {
    const result = addDataTestIdsToComponent(sourceCode, sectionId, {
      dryRun: options.dryRun,
      verbose: options.verbose,
      targetComponents,
    });

    return {
      name: fileName,
      path: filePath,
      suggestions: result.suggestions,
      applied: result.applied,
      modified: result.modified,
      newCode: result.modified ? result.code : null,
      result,
    };
  } catch (error) {
    return {
      name: fileName,
      path: filePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process a widget's source files and add necessary data-testids
 * 
 * This function:
 * 1. Aggregates imports from ALL source files in the widget
 * 2. Builds target component list based on actual UI/MUI imports used
 * 3. Processes each file with the aggregated target components
 */
export function processWidgetForTestIds(
  widget: WidgetInput,
  options: ProcessWidgetOptions = {}
): ProcessWidgetResult {
  const { dryRun = false, verbose = false } = options;
  const sectionId = widget.id || widget.name.toLowerCase();
  
  const results: ProcessWidgetResult = {
    files: [],
    totalApplied: 0,
    totalSuggestions: 0,
  };

  // First, aggregate all imports from all widget source files
  const aggregatedImports = aggregateWidgetImports(widget.sources || {});
  
  // Build target components from aggregated imports
  const targetComponents = buildTargetComponentsFromImports(aggregatedImports);

  if (verbose) {
    console.log(`Widget ${widget.name} uses components:`, 
      targetComponents.map(t => t.name).join(', ') || '(none detected)');
  }

  // Process primary files (Body, Summary)
  for (const fileName of PRIMARY_FILES) {
    const sourceCode = widget.sources?.[fileName];
    const filePath = widget.sourcePaths?.[fileName];

    if (!sourceCode || !filePath) continue;

    const fileResult = processFile(fileName, sourceCode, filePath, sectionId, {
      dryRun,
      verbose,
    }, targetComponents);

    results.files.push(fileResult);
    results.totalApplied += fileResult.applied || 0;
    results.totalSuggestions += fileResult.suggestions?.length || 0;
  }

  // Process imported local components
  const importedFiles = Object.keys(widget.sources || {}).filter(isImportedComponent);

  for (const fileName of importedFiles) {
    const sourceCode = widget.sources![fileName];
    const filePath = widget.sourcePaths?.[fileName];

    if (!sourceCode || !filePath) continue;

    try {
      const fileResult = processFile(fileName, sourceCode, filePath, sectionId, {
        dryRun,
        verbose,
      }, targetComponents);

      // Only include if there were suggestions
      if (fileResult.suggestions && fileResult.suggestions.length > 0) {
        results.files.push(fileResult);
        results.totalApplied += fileResult.applied || 0;
        results.totalSuggestions += fileResult.suggestions.length;
      }
    } catch {
      // Silently skip files that fail to parse
    }
  }

  return results;
}
