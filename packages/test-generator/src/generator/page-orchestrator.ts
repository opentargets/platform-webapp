/**
 * Page orchestrator - coordinates page test generation pipeline
 */

import * as fs from 'fs';
import * as path from 'path';
import { PageInfo, PageAnalysis, PageGenerationResult, TestGeneratorConfig, PAGE_CONFIG } from '../types';
import { analyzePage } from './page-analyzer';
import { generatePageInteractor } from './page-interactor-generator';
import { generatePageTest } from './page-test-generator';
import { loadExamples } from './file-io';

/**
 * Write generated page files to disk
 */
function writePageFiles(
  page: PageInfo,
  interactorCode: string,
  testCode: string,
  config: TestGeneratorConfig
): { interactorPath: string; testPath: string } {
  const entityType = page.entityType || page.name.toLowerCase().replace(/page$/, '');
  
  // Interactor path: POM/page/{entityType}/{pageName}.ts
  const interactorDir = path.join(PAGE_CONFIG.pageInteractorOutputPath, entityType);
  const interactorFileName = page.name.charAt(0).toLowerCase() + page.name.slice(1).replace(/Page$/, '') + '.ts';
  const interactorPath = path.join(interactorDir, interactorFileName);

  // Test path: e2e/pages/{entityType}/{pageName}.spec.ts
  const testDir = path.join(PAGE_CONFIG.pageTestOutputPath, entityType);
  const testFileName = page.name.charAt(0).toLowerCase() + page.name.slice(1) + '.spec.ts';
  const testPath = path.join(testDir, testFileName);

  if (!config.dryRun) {
    // Create directories
    fs.mkdirSync(interactorDir, { recursive: true });
    fs.mkdirSync(testDir, { recursive: true });

    // Write files
    fs.writeFileSync(interactorPath, interactorCode);
    fs.writeFileSync(testPath, testCode);
  }

  return { interactorPath, testPath };
}

/**
 * Load page-specific examples for few-shot learning
 */
function loadPageExamples(entityType: string): { interactor?: string; test?: string } {
  const examples: { interactor?: string; test?: string } = {};

  // Try to load existing page interactor as example
  const interactorPath = path.join(PAGE_CONFIG.pageInteractorOutputPath, 'target', 'target.ts');
  if (fs.existsSync(interactorPath)) {
    examples.interactor = fs.readFileSync(interactorPath, 'utf-8');
  }

  // Try to load existing page test as example
  const testPath = path.join(PAGE_CONFIG.pageTestOutputPath, 'target', 'targetPage.spec.ts');
  if (fs.existsSync(testPath)) {
    examples.test = fs.readFileSync(testPath, 'utf-8');
  }

  return examples;
}

/**
 * Generate tests for a single page
 *
 * Pipeline:
 * 1. Analyze page structure using LLM
 * 2. Load example files for few-shot learning
 * 3. Generate interactor code
 * 4. Generate test code
 * 5. Write files to disk
 */
export async function generateTestsForPage(
  page: PageInfo,
  config: TestGeneratorConfig
): Promise<PageGenerationResult> {
  try {
    if (config.verbose) {
      console.log(`  Analyzing page: ${page.name}`);
    }

    // Step 1: Analyze page
    const analysis = await analyzePage(page, config);

    if (config.verbose) {
      console.log(`  Analysis: tabs=${analysis.hasTabs}, externalLinks=${analysis.hasExternalLinks}`);
      if (analysis.tabs.length > 0) {
        console.log(`  Tabs: ${analysis.tabs.map(t => t.name).join(', ')}`);
      }
    }

    // Step 2: Load examples
    const examples = loadPageExamples(page.entityType || '');

    // Step 3: Generate interactor
    if (config.verbose) {
      console.log(`  Generating interactor...`);
    }
    const interactorCode = await generatePageInteractor(page, analysis, config, examples);

    // Step 4: Generate test
    if (config.verbose) {
      console.log(`  Generating tests...`);
    }
    const testCode = await generatePageTest(page, analysis, interactorCode, config, examples);

    // Step 5: Write files
    const paths = writePageFiles(page, interactorCode, testCode, config);

    if (config.verbose) {
      console.log(`  Written: ${paths.interactorPath}`);
      console.log(`  Written: ${paths.testPath}`);
    }

    return {
      page: page.name,
      success: true,
      analysis: {
        hasTabs: analysis.hasTabs,
        tabs: analysis.tabs,
        hasExternalLinks: analysis.hasExternalLinks,
        urlParams: analysis.urlParams,
      },
      ...paths,
    };
  } catch (error) {
    return {
      page: page.name,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
