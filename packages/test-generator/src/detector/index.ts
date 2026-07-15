/**
 * Detector module - detect new widgets and pages from git changes
 */

// Git utilities
export {
  exec,
  getChangedFiles,
  getNewFiles,
  getCurrentBranch,
  isGitRepository,
  type FileChanges,
} from './git-utils';

// Source file reading
export {
  extractLocalImports,
  extractUIPackageImports,
  findUIComponentSource,
  readUIComponentSources,
  resolveImportPath,
  readFileWithExtension,
  readWidgetSources,
} from './source-reader';

// Widget detection
export { detectNewWidgets } from './widget-detector';

// Page detection
export { detectNewPages, readPageSources, getAllPages } from './page-detector';

// Re-export types used by this module
export type { PageInfo, WidgetInfo, TestGeneratorConfig } from '../types';

// Re-export main detect function
import { WidgetInfo, PageInfo, TestGeneratorConfig } from '../types';
import { getNewFiles } from './git-utils';
import { detectNewWidgets } from './widget-detector';
import { detectNewPages } from './page-detector';

/**
 * Main detection function - detects both widgets and pages
 */
export function detect(
  baseBranch = 'main',
  config: Partial<TestGeneratorConfig> = {}
): {
  widgets: WidgetInfo[];
  pages: PageInfo[];
  addedFiles: string[];
} {
  const { added } = getNewFiles(baseBranch);
  const widgets = detectNewWidgets(added, config);
  const pages = detectNewPages(added);

  return { widgets, pages, addedFiles: added };
}
