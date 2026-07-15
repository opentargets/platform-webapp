/**
 * Component analyzer for basic code analysis
 * 
 * NOTE: Data-testid analysis is now handled by the LLM in generator/analyzer.ts
 * This module provides basic AST analysis utilities.
 */

import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as recast from 'recast';
import { parseCode } from './parser';
import { hasDataTestId, getJSXElementName, getStringAttribute } from './jsx-utils';
import { analyzeImports, CategorizedImports } from './import-extractor';

/**
 * Target component configuration (kept for backwards compatibility)
 */
export interface TargetComponent {
  /** Component name to match */
  name: string;
  /** Pattern for generating test ID (null means skip) */
  testIdPattern: string | null;
  /** Only add testid if element has 'external' prop */
  onlyExternal?: boolean;
  /** Skip unless element has className or role */
  skipUnlessSpecial?: boolean;
  /** Component has its own testid mechanism - never add */
  hasBuiltInTestId?: boolean;
  /** Component doesn't render DOM (providers, contexts) - never add */
  isNonRendering?: boolean;
  /** Source package (for reference) */
  source?: string;
}

/**
 * Build target components from imports (simplified - no heuristics)
 */
export function buildTargetComponentsFromImports(
  imports: CategorizedImports
): TargetComponent[] {
  const targets: TargetComponent[] = [];
  const seen = new Set<string>();

  const processImport = (imp: { name: string; source: string }) => {
    if (seen.has(imp.name)) return;
    seen.add(imp.name);
    targets.push({
      name: imp.name,
      testIdPattern: null, // No automatic patterns - LLM decides
      source: imp.source,
    });
  };

  imports.uiComponents.forEach(processImport);
  imports.muiComponents.forEach(processImport);

  return targets;
}

/**
 * Build target components from source code
 */
export function buildTargetComponentsFromCode(code: string): TargetComponent[] {
  const imports = analyzeImports(code);
  return buildTargetComponentsFromImports(imports);
}

/**
 * Suggestion for adding a data-testid
 */
export interface TestIdSuggestion {
  elementName: string;
  testId: string;
  line: number | undefined;
  column: number | undefined;
  node: t.JSXElement;
}

/**
 * Result of analyzing a component for test IDs
 */
export interface AnalysisResult {
  ast: recast.types.ASTNode;
  suggestions: TestIdSuggestion[];
  existingTestIds: string[];
  components: string[];
}

/**
 * Extract existing data-testid values from code
 */
export function extractExistingTestIds(code: string): string[] {
  const ast = parseCode(code);
  const testIds: string[] = [];

  traverse(ast as t.Node, {
    JSXElement(path) {
      const node = path.node as t.JSXElement;
      if (hasDataTestId(node)) {
        const value = getStringAttribute(node, 'data-testid');
        if (value) {
          testIds.push(value);
        }
      }
    },
  });

  return testIds;
}

/**
 * Extract all JSX component names from code
 */
export function extractComponentNames(code: string): string[] {
  const ast = parseCode(code);
  const components = new Set<string>();

  traverse(ast as t.Node, {
    JSXElement(path) {
      const node = path.node as t.JSXElement;
      const name = getJSXElementName(node);
      if (name) {
        components.add(name);
      }
    },
  });

  return Array.from(components);
}

/**
 * Analyze a React component file (simplified - no automatic suggestions)
 * 
 * This now only extracts existing test IDs and component names.
 * Data-testid suggestions are handled by the LLM.
 */
export function analyzeComponentForTestIds(
  code: string,
  _sectionId: string,
  _targetComponents?: TargetComponent[]
): AnalysisResult {
  const ast = parseCode(code);
  const existingTestIds = extractExistingTestIds(code);
  const components = extractComponentNames(code);

  // No automatic suggestions - LLM handles this now
  return {
    ast,
    suggestions: [],
    existingTestIds,
    components,
  };
}
