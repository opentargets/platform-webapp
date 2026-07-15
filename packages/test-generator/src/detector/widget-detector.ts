/**
 * Widget detection from git changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { WidgetInfo, ENTITY_TYPES, EntityType, TestGeneratorConfig, DEFAULT_CONFIG } from '../types';
import { readWidgetSources } from './source-reader';

/**
 * Extract widget information from its index file
 */
function extractWidgetInfo(widgetPath: string): { id: string | null; displayName: string | null } {
  const indexPath = fs.existsSync(path.join(widgetPath, 'index.ts'))
    ? path.join(widgetPath, 'index.ts')
    : path.join(widgetPath, 'index.tsx');

  if (!fs.existsSync(indexPath)) {
    return { id: null, displayName: null };
  }

  const content = fs.readFileSync(indexPath, 'utf-8');
  const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
  const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);

  return {
    id: idMatch ? idMatch[1] : null,
    displayName: nameMatch ? nameMatch[1] : null,
  };
}

/**
 * Check if tests already exist for a widget
 */
function testsExist(
  widget: { name: string; entity: string },
  config: Partial<TestGeneratorConfig>
): boolean {
  const interactorPath = path.join(
    config.interactorOutputPath || DEFAULT_CONFIG.interactorOutputPath,
    widget.name
  );
  const testPath = path.join(
    config.testOutputPath || DEFAULT_CONFIG.testOutputPath,
    widget.entity,
    `${widget.name.toLowerCase()}.spec.ts`
  );

  return fs.existsSync(interactorPath) || fs.existsSync(testPath);
}

/**
 * Check if a path is a valid widget directory
 */
function isValidWidgetPath(widgetPath: string): boolean {
  return (
    fs.existsSync(path.join(widgetPath, 'index.ts')) ||
    fs.existsSync(path.join(widgetPath, 'index.tsx'))
  );
}

/**
 * Parse widget path from a file path
 */
function parseWidgetPath(
  filePath: string,
  sectionsPath: string
): { entity: EntityType; name: string; path: string } | null {
  if (!filePath.startsWith(sectionsPath)) {
    return null;
  }

  const relativePath = filePath.replace(`${sectionsPath}/`, '');
  const parts = relativePath.split('/');

  if (parts.length < 2) {
    return null;
  }

  const entity = parts[0] as EntityType;
  const widgetName = parts[1];

  if (!ENTITY_TYPES.includes(entity)) {
    return null;
  }

  return {
    entity,
    name: widgetName,
    path: `${sectionsPath}/${entity}/${widgetName}`,
  };
}

/**
 * Detect new widget sections from added files
 */
export function detectNewWidgets(
  addedFiles: string[],
  config: Partial<TestGeneratorConfig> = {}
): WidgetInfo[] {
  const sectionsPath = config.sectionsPath || DEFAULT_CONFIG.sectionsPath;
  const newWidgets: WidgetInfo[] = [];
  const detectedWidgetPaths = new Set<string>();

  for (const file of addedFiles) {
    const parsed = parseWidgetPath(file, sectionsPath);
    if (!parsed || detectedWidgetPaths.has(parsed.path)) {
      continue;
    }

    if (!isValidWidgetPath(parsed.path)) {
      continue;
    }

    detectedWidgetPaths.add(parsed.path);

    const widgetInfo = extractWidgetInfo(parsed.path);
    const { sources, sourcePaths } = readWidgetSources(parsed.path);

    const widget: WidgetInfo = {
      type: 'widget',
      entity: parsed.entity,
      name: parsed.name,
      path: parsed.path,
      id: widgetInfo.id,
      displayName: widgetInfo.displayName,
      sources,
      sourcePaths,
    };

    if (!testsExist(widget, config)) {
      newWidgets.push(widget);
    }
  }

  return newWidgets;
}
