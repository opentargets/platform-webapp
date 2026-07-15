/**
 * Page detection from git changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { PageInfo, PAGE_CONFIG } from '../types';

/**
 * Common file patterns in page directories
 */
const PAGE_FILE_PATTERNS = [
  /^[A-Z][a-zA-Z]+Page\.tsx$/,    // MainPage.tsx
  /^[A-Z][a-zA-Z]+\.tsx$/,         // Profile.tsx, Header.tsx
  /^[A-Z][a-zA-Z]+\.jsx$/,         // Header.jsx
  /^[A-Z][a-zA-Z]+\.gql$/,         // Query.gql
  /^index\.(ts|js)$/,              // index.ts/js
];

/**
 * Read all source files for a page
 */
export function readPageSources(pagePath: string): { sources: Record<string, string>; sourcePaths: Record<string, string> } {
  const sources: Record<string, string> = {};
  const sourcePaths: Record<string, string> = {};

  if (!fs.existsSync(pagePath)) {
    return { sources, sourcePaths };
  }

  const files = fs.readdirSync(pagePath);

  for (const file of files) {
    const fullPath = path.join(pagePath, file);
    const stat = fs.statSync(fullPath);

    // Skip directories (like TargetAssociations/)
    if (stat.isDirectory()) {
      continue;
    }

    // Check if file matches our patterns
    const matchesPattern = PAGE_FILE_PATTERNS.some(pattern => pattern.test(file));
    if (!matchesPattern) {
      continue;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const baseName = path.basename(file, path.extname(file));
      sources[baseName] = content;
      sourcePaths[baseName] = fullPath;
    } catch {
      // Skip files that can't be read
    }
  }

  return { sources, sourcePaths };
}

/**
 * Detect the main page component file
 */
function detectMainComponent(pageName: string, files: string[]): string | undefined {
  // Look for {PageName}Page.tsx first
  const pageFile = files.find(f => f === `${pageName}Page.tsx` || f === `${pageName}.tsx`);
  if (pageFile) {
    return path.basename(pageFile, path.extname(pageFile));
  }

  // Fall back to any *Page.tsx file
  const anyPageFile = files.find(f => f.endsWith('Page.tsx'));
  if (anyPageFile) {
    return path.basename(anyPageFile, '.tsx');
  }

  return undefined;
}

/**
 * Infer entity type from page name
 */
function inferEntityType(pageName: string): string | undefined {
  const entityMap: Record<string, string> = {
    'TargetPage': 'target',
    'DiseasePage': 'disease',
    'DrugPage': 'drug',
    'EvidencePage': 'evidence',
    'VariantPage': 'variant',
    'StudyPage': 'study',
    'CredibleSetPage': 'credibleSet',
  };

  return entityMap[pageName] || pageName.replace(/Page$/, '').toLowerCase();
}

/**
 * Infer route pattern from page name
 */
function inferRoutePattern(pageName: string): string {
  const routeMap: Record<string, string> = {
    'TargetPage': '/target/:ensgId',
    'DiseasePage': '/disease/:efoId',
    'DrugPage': '/drug/:chemblId',
    'EvidencePage': '/evidence/:ensgId/:efoId',
    'VariantPage': '/variant/:variantId',
    'StudyPage': '/study/:studyId',
    'CredibleSetPage': '/credible-set/:studyLocusId',
    'SearchPage': '/search',
    'HomePage': '/',
    'DownloadsPage': '/downloads',
    'APIPage': '/api',
  };

  return routeMap[pageName] || `/${pageName.replace(/Page$/, '').toLowerCase()}`;
}

/**
 * Detect new pages from added files
 */
export function detectNewPages(
  addedFiles: string[],
  pagesPath = PAGE_CONFIG.pagesPath
): PageInfo[] {
  const newPages: PageInfo[] = [];
  const detectedPagePaths = new Set<string>();

  for (const file of addedFiles) {
    if (!file.startsWith(pagesPath)) {
      continue;
    }

    const relativePath = file.replace(`${pagesPath}/`, '');
    const parts = relativePath.split('/');

    if (parts.length < 2) {
      continue;
    }

    const pageName = parts[0];
    const pagePath = `${pagesPath}/${pageName}`;

    if (detectedPagePaths.has(pagePath)) {
      continue;
    }

    if (fs.existsSync(pagePath)) {
      detectedPagePaths.add(pagePath);

      // Read sources
      const { sources, sourcePaths } = readPageSources(pagePath);
      const files = Object.keys(sources);
      const mainComponent = detectMainComponent(pageName, files.map(f => `${f}.tsx`));

      newPages.push({
        type: 'page',
        name: pageName,
        path: pagePath,
        route: inferRoutePattern(pageName),
        mainComponent,
        sources,
        sourcePaths,
        entityType: inferEntityType(pageName),
      });
    }
  }

  return newPages;
}

/**
 * Get all existing pages (for reference/testing)
 */
export function getAllPages(pagesPath = PAGE_CONFIG.pagesPath): PageInfo[] {
  const pages: PageInfo[] = [];

  if (!fs.existsSync(pagesPath)) {
    return pages;
  }

  const entries = fs.readdirSync(pagesPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const pageName = entry.name;
    const pagePath = path.join(pagesPath, pageName);

    // Check if it looks like a page directory (has *Page.tsx or similar)
    const files = fs.readdirSync(pagePath);
    const hasPageFile = files.some(f => f.endsWith('Page.tsx') || f.endsWith('Page.jsx'));

    if (!hasPageFile) {
      continue;
    }

    const { sources, sourcePaths } = readPageSources(pagePath);
    const mainComponent = detectMainComponent(pageName, files);

    pages.push({
      type: 'page',
      name: pageName,
      path: pagePath,
      route: inferRoutePattern(pageName),
      mainComponent,
      sources,
      sourcePaths,
      entityType: inferEntityType(pageName),
    });
  }

  return pages;
}
