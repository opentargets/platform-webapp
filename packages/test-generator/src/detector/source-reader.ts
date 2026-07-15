/**
 * Source file reading utilities
 */

import * as fs from 'fs';
import * as path from 'path';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const MAIN_FILES = ['index', 'Body', 'Summary', 'Description'];

/**
 * Default paths for UI package components
 */
const UI_PACKAGE_PATHS = {
  components: 'packages/ui/src/components',
  providers: 'packages/ui/src/providers',
  hooks: 'packages/ui/src/hooks',
};

/**
 * Extract local imports from a source file
 */
export function extractLocalImports(sourceCode: string): string[] {
  if (!sourceCode) return [];

  const imports: string[] = [];
  const importRegex =
    /import\s+(?:(?:\{[^}]*\})|(?:[^{}\s]+))\s+from\s+['"](\.[^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(sourceCode)) !== null) {
    const importPath = match[1];
    // Skip GraphQL imports and utility imports
    if (
      !importPath.endsWith('.gql') &&
      !importPath.includes('context') &&
      !importPath.includes('utils')
    ) {
      imports.push(importPath);
    }
  }

  return imports;
}

/**
 * Extract imports from the "ui" package
 */
export function extractUIPackageImports(sourceCode: string): string[] {
  if (!sourceCode) return [];

  const imports: string[] = [];
  
  // Match: import { X, Y, Z } from "ui" or 'ui'
  const uiImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]ui['"]/g;
  
  let match;
  while ((match = uiImportRegex.exec(sourceCode)) !== null) {
    const importList = match[1];
    // Split by comma and clean up
    const names = importList
      .split(',')
      .map(s => s.trim())
      .filter(s => s && !s.includes(' as '));
    imports.push(...names);
  }

  return imports;
}

/**
 * Find a UI component's source file
 */
export function findUIComponentSource(
  componentName: string,
  workspaceRoot: string = process.cwd()
): { content: string; path: string } | null {
  // Check various possible locations
  const searchPaths = [
    // Direct component file
    path.join(workspaceRoot, UI_PACKAGE_PATHS.components, `${componentName}.tsx`),
    path.join(workspaceRoot, UI_PACKAGE_PATHS.components, `${componentName}.ts`),
    // Component in folder
    path.join(workspaceRoot, UI_PACKAGE_PATHS.components, componentName, 'index.tsx'),
    path.join(workspaceRoot, UI_PACKAGE_PATHS.components, componentName, `${componentName}.tsx`),
    // Provider
    path.join(workspaceRoot, UI_PACKAGE_PATHS.providers, `${componentName}.tsx`),
    path.join(workspaceRoot, UI_PACKAGE_PATHS.providers, `${componentName}.ts`),
    // Provider in folder
    path.join(workspaceRoot, UI_PACKAGE_PATHS.providers, componentName, 'index.tsx'),
    path.join(workspaceRoot, UI_PACKAGE_PATHS.providers, componentName, `${componentName}.tsx`),
    // Hooks
    path.join(workspaceRoot, UI_PACKAGE_PATHS.hooks, `${componentName}.tsx`),
    path.join(workspaceRoot, UI_PACKAGE_PATHS.hooks, `${componentName}.ts`),
  ];

  // Also check Section subfolder for Section-related components
  if (componentName.includes('Section') || componentName === 'SectionItem' || componentName === 'SummaryItem') {
    searchPaths.push(
      path.join(workspaceRoot, UI_PACKAGE_PATHS.components, 'Section', `${componentName}.tsx`),
      path.join(workspaceRoot, UI_PACKAGE_PATHS.components, 'Section', `${componentName}.ts`),
      path.join(workspaceRoot, UI_PACKAGE_PATHS.components, 'Summary', `${componentName}.tsx`),
    );
  }

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      try {
        return {
          content: fs.readFileSync(searchPath, 'utf-8'),
          path: searchPath,
        };
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Read UI component sources for components used in widget
 */
export function readUIComponentSources(
  widgetSources: Record<string, string>,
  workspaceRoot: string = process.cwd()
): Record<string, string> {
  const uiComponentSources: Record<string, string> = {};
  const allSourceCode = Object.values(widgetSources).join('\n');
  
  // Extract all UI package imports
  const uiImports = extractUIPackageImports(allSourceCode);
  
  // Filter to components we might want to analyze (skip obvious MUI re-exports)
  const muiComponents = new Set([
    'Box', 'Grid', 'Stack', 'Paper', 'Container', 'Typography',
    'Button', 'IconButton', 'Fab', 'TextField', 'Select', 'Checkbox',
    'Table', 'TableBody', 'TableCell', 'TableHead', 'TableRow',
    'List', 'ListItem', 'Card', 'CardContent', 'Divider',
    'Dialog', 'DialogTitle', 'DialogContent', 'DialogActions',
    'Tooltip', 'Popover', 'Menu', 'MenuItem', 'Tabs', 'Tab',
    'CircularProgress', 'LinearProgress', 'Skeleton', 'Alert', 'Snackbar',
  ]);

  for (const componentName of uiImports) {
    // Skip obvious MUI components
    if (muiComponents.has(componentName)) continue;
    
    const source = findUIComponentSource(componentName, workspaceRoot);
    if (source) {
      uiComponentSources[`ui/${componentName}`] = source.content;
    }
  }

  return uiComponentSources;
}

/**
 * Resolve import path to actual file path
 */
export function resolveImportPath(basePath: string, importPath: string): string | null {
  const cleanPath = importPath.replace(/^\.\//, '');

  for (const ext of EXTENSIONS) {
    // Try direct file
    const fullPath = path.join(basePath, `${cleanPath}${ext}`);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    // Try index file in directory
    const indexPath = path.join(basePath, cleanPath, `index${ext}`);
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

/**
 * Read a file if it exists with any of the standard extensions
 */
export function readFileWithExtension(
  basePath: string,
  fileName: string
): { content: string; path: string } | null {
  for (const ext of EXTENSIONS) {
    const filePath = path.join(basePath, `${fileName}${ext}`);
    if (fs.existsSync(filePath)) {
      return {
        content: fs.readFileSync(filePath, 'utf-8'),
        path: filePath,
      };
    }
  }
  return null;
}

/**
 * Read widget source files for LLM context
 */
export function readWidgetSources(widgetPath: string): {
  sources: Record<string, string>;
  sourcePaths: Record<string, string>;
} {
  const sources: Record<string, string> = {};
  const sourcePaths: Record<string, string> = {};

  // First pass: read main files
  for (const file of MAIN_FILES) {
    const result = readFileWithExtension(widgetPath, file);
    if (result) {
      sources[file] = result.content;
      sourcePaths[file] = result.path;
    }
  }

  // Second pass: resolve and read imported local components from Body
  const bodySource = sources['Body'];
  if (bodySource) {
    const localImports = extractLocalImports(bodySource);

    for (const importPath of localImports) {
      const resolvedPath = resolveImportPath(widgetPath, importPath);
      if (resolvedPath) {
        const componentName = importPath.replace(/^\.\//, '').split('/').pop()!;
        if (!sources[componentName]) {
          try {
            sources[componentName] = fs.readFileSync(resolvedPath, 'utf-8');
            sourcePaths[componentName] = resolvedPath;
          } catch {
            // Ignore read errors
          }
        }
      }
    }
  }

  // Read GraphQL files
  if (fs.existsSync(widgetPath)) {
    const gqlFiles = fs.readdirSync(widgetPath).filter((f) => f.endsWith('.gql'));
    for (const gqlFile of gqlFiles) {
      const gqlPath = path.join(widgetPath, gqlFile);
      sources[gqlFile] = fs.readFileSync(gqlPath, 'utf-8');
      sourcePaths[gqlFile] = gqlPath;
    }
  }

  return { sources, sourcePaths };
}
