/**
 * Import extraction utilities for analyzing component dependencies
 */

import * as babelParser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

/**
 * Extracted import information
 */
export interface ExtractedImport {
  /** The imported name (or alias) */
  name: string;
  /** Original export name if aliased */
  originalName?: string;
  /** Source module path */
  source: string;
  /** Whether it's a default import */
  isDefault: boolean;
  /** Whether it's a namespace import (import * as X) */
  isNamespace: boolean;
}

/**
 * Categorized imports by source type
 */
export interface CategorizedImports {
  /** Imports from @ot/ui package */
  uiComponents: ExtractedImport[];
  /** Imports from @mui/material */
  muiComponents: ExtractedImport[];
  /** Imports from local files (relative paths) */
  localComponents: ExtractedImport[];
  /** Imports from other packages */
  otherImports: ExtractedImport[];
  /** All imports */
  all: ExtractedImport[];
}

/**
 * Parse code and extract all imports
 */
export function extractImports(code: string): ExtractedImport[] {
  const imports: ExtractedImport[] = [];

  try {
    const ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    });

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;

        for (const specifier of path.node.specifiers) {
          if (t.isImportDefaultSpecifier(specifier)) {
            imports.push({
              name: specifier.local.name,
              source,
              isDefault: true,
              isNamespace: false,
            });
          } else if (t.isImportNamespaceSpecifier(specifier)) {
            imports.push({
              name: specifier.local.name,
              source,
              isDefault: false,
              isNamespace: true,
            });
          } else if (t.isImportSpecifier(specifier)) {
            const importedName = t.isIdentifier(specifier.imported)
              ? specifier.imported.name
              : specifier.imported.value;

            imports.push({
              name: specifier.local.name,
              originalName: importedName !== specifier.local.name ? importedName : undefined,
              source,
              isDefault: false,
              isNamespace: false,
            });
          }
        }
      },
    });
  } catch {
    // Return empty array if parsing fails
  }

  return imports;
}

/**
 * Categorize imports by their source
 */
export function categorizeImports(imports: ExtractedImport[]): CategorizedImports {
  const result: CategorizedImports = {
    uiComponents: [],
    muiComponents: [],
    localComponents: [],
    otherImports: [],
    all: imports,
  };

  for (const imp of imports) {
    // Handle various UI package import patterns
    if (
      imp.source === '@ot/ui' || 
      imp.source.startsWith('@ot/ui/') ||
      imp.source === 'ui' ||  // Workspace alias
      imp.source.startsWith('ui/')
    ) {
      result.uiComponents.push(imp);
    } else if (imp.source === '@mui/material' || imp.source.startsWith('@mui/')) {
      result.muiComponents.push(imp);
    } else if (imp.source.startsWith('./') || imp.source.startsWith('../')) {
      result.localComponents.push(imp);
    } else {
      result.otherImports.push(imp);
    }
  }

  return result;
}

/**
 * Extract and categorize imports from code
 */
export function analyzeImports(code: string): CategorizedImports {
  const imports = extractImports(code);
  return categorizeImports(imports);
}

/**
 * Extract imports from multiple source files
 */
export function extractImportsFromSources(
  sources: Record<string, string>
): Map<string, CategorizedImports> {
  const results = new Map<string, CategorizedImports>();

  for (const [fileName, code] of Object.entries(sources)) {
    results.set(fileName, analyzeImports(code));
  }

  return results;
}

/**
 * Get all unique UI component names used across sources
 */
export function getUsedUIComponents(sources: Record<string, string>): Set<string> {
  const components = new Set<string>();
  const importsByFile = extractImportsFromSources(sources);

  for (const imports of importsByFile.values()) {
    for (const imp of imports.uiComponents) {
      components.add(imp.name);
    }
    // Also include MUI components as they're commonly used
    for (const imp of imports.muiComponents) {
      components.add(imp.name);
    }
  }

  return components;
}
