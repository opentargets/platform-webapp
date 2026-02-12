#!/usr/bin/env node
/**
 * CLI for the test generator package
 */

import * as fs from 'fs';
import * as path from 'path';
import { detect } from './detector';
import { generateTestsForWidget } from './generator';
import { generateTestsForPage } from './generator/page-orchestrator';
import { TestGeneratorConfig, DEFAULT_CONFIG, GenerationResult, WidgetInfo, PageInfo, PageGenerationResult } from './types';

function printUsage(): void {
  console.log(`
Test Generator CLI

Usage:
  test-generator detect [options]    Detect new widgets and pages in PR
  test-generator generate [options]  Generate tests for detected widgets and pages
  test-generator --help              Show this help message

Options:
  --base-branch <branch>    Base branch to compare against (default: main)
  --pr-number <number>      Pull request number
  --dry-run                 Don't write any files
  --verbose                 Show detailed output
  --skip-data-testids       Skip adding data-testid attributes
  --output-file <path>      Write detected widgets to JSON file (detect command)
  --pages-output-file <path> Write detected pages to JSON file (detect command)
  --widgets-file <path>     Read widgets from JSON file (generate command)
  --pages-file <path>       Read pages from JSON file (generate command)
  --skip-widgets            Skip widget generation (only generate page tests)
  --skip-pages              Skip page generation (only generate widget tests)

Environment Variables:
  ANTHROPIC_API_KEY         API key for Claude (required for generate)
  GITHUB_TOKEN              GitHub token for PR access
  
Examples:
  # Detect new widgets and pages in a PR
  test-generator detect --base-branch main --output-file detected.json
  
  # Generate tests for detected widgets
  test-generator generate --widgets-file widgets.json
  
  # Generate tests for pages only
  test-generator generate --pages-file pages.json --skip-widgets
  
  # Detect and generate in one step
  test-generator detect --output-file detected.json && test-generator generate --widgets-file detected.json
`);
}

function parseArgs(args: string[]): {
  command: string;
  options: {
    baseBranch: string;
    prNumber?: string;
    dryRun: boolean;
    verbose: boolean;
    skipDataTestIds: boolean;
    outputFile?: string;
    pagesOutputFile?: string;
    widgetsFile?: string;
    pagesFile?: string;
    skipWidgets: boolean;
    skipPages: boolean;
    help: boolean;
  };
} {
  const command = args[0] || 'help';
  const options = {
    baseBranch: 'main',
    prNumber: undefined as string | undefined,
    dryRun: false,
    verbose: false,
    skipDataTestIds: false,
    outputFile: undefined as string | undefined,
    pagesOutputFile: undefined as string | undefined,
    widgetsFile: undefined as string | undefined,
    pagesFile: undefined as string | undefined,
    skipWidgets: false,
    skipPages: false,
    help: false,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--base-branch':
        options.baseBranch = args[++i];
        break;
      case '--pr-number':
        options.prNumber = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--skip-data-testids':
        options.skipDataTestIds = true;
        break;
      case '--output-file':
        options.outputFile = args[++i];
        break;
      case '--pages-output-file':
        options.pagesOutputFile = args[++i];
        break;
      case '--widgets-file':
        options.widgetsFile = args[++i];
        break;
      case '--pages-file':
        options.pagesFile = args[++i];
        break;
      case '--skip-widgets':
        options.skipWidgets = true;
        break;
      case '--skip-pages':
        options.skipPages = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return { command, options };
}

async function runDetect(options: ReturnType<typeof parseArgs>['options']): Promise<void> {
  console.log('🔍 Detecting new widgets and pages...\n');

  const result = detect(options.baseBranch);
  const widgets = result.widgets;
  const pages = result.pages;

  // Report widgets
  if (!options.skipWidgets) {
    if (widgets.length === 0) {
      console.log('✅ No new widgets detected.');
    } else {
      console.log(`Found ${widgets.length} new widget(s):\n`);
      for (const widget of widgets) {
        console.log(`  📦 ${widget.name} (${widget.entity})`);
        if (options.verbose) {
          console.log(`     Path: ${widget.path}`);
          console.log(`     Files: ${Object.keys(widget.sources || {}).join(', ')}`);
        }
      }
    }
  }

  // Report pages
  if (!options.skipPages) {
    if (pages.length === 0) {
      console.log('✅ No new pages detected.');
    } else {
      console.log(`\nFound ${pages.length} new page(s):\n`);
      for (const page of pages) {
        console.log(`  📄 ${page.name} (${page.type})`);
        if (options.verbose) {
          console.log(`     Path: ${page.path}`);
          console.log(`     Route: ${page.route || 'unknown'}`);
          if (page.tabs && page.tabs.length > 0) {
            console.log(`     Tabs: ${page.tabs.map(t => t.name).join(', ')}`);
          }
          console.log(`     Files: ${Object.keys(page.sources || {}).join(', ')}`);
        }
      }
    }
  }

  // Save outputs
  if (options.outputFile && !options.skipWidgets) {
    const outputPath = path.resolve(options.outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(widgets, null, 2));
    console.log(`\n📝 Saved widget info to ${outputPath}`);
  }

  if (options.pagesOutputFile && !options.skipPages) {
    const pagesPath = path.resolve(options.pagesOutputFile);
    fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2));
    console.log(`📝 Saved page info to ${pagesPath}`);
  }
}

async function runGenerate(options: ReturnType<typeof parseArgs>['options']): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  let widgets: WidgetInfo[] = [];
  let pages: PageInfo[] = [];

  // Load or detect widgets
  if (!options.skipWidgets) {
    if (options.widgetsFile) {
      const widgetsPath = path.resolve(options.widgetsFile);
      if (!fs.existsSync(widgetsPath)) {
        console.error(`❌ Error: Widgets file not found: ${widgetsPath}`);
        process.exit(1);
      }
      widgets = JSON.parse(fs.readFileSync(widgetsPath, 'utf-8'));
    } else {
      console.log('🔍 Detecting widgets...\n');
      const result = detect(options.baseBranch);
      widgets = result.widgets;
    }
  }

  // Load or detect pages
  if (!options.skipPages) {
    if (options.pagesFile) {
      const pagesPath = path.resolve(options.pagesFile);
      if (!fs.existsSync(pagesPath)) {
        console.error(`❌ Error: Pages file not found: ${pagesPath}`);
        process.exit(1);
      }
      pages = JSON.parse(fs.readFileSync(pagesPath, 'utf-8'));
    } else if (!options.widgetsFile) {
      // Only detect if we haven't loaded widgets from file (to avoid detecting twice)
      console.log('🔍 Detecting pages...\n');
      const result = detect(options.baseBranch);
      pages = result.pages;
    }
  }

  if (widgets.length === 0 && pages.length === 0) {
    console.log('✅ No widgets or pages to process.');
    return;
  }

  const config: TestGeneratorConfig = {
    ...DEFAULT_CONFIG,
    anthropicApiKey: apiKey,
    dryRun: options.dryRun,
    verbose: options.verbose,
    skipDataTestIds: options.skipDataTestIds,
  };

  // Process widgets
  const widgetResults: GenerationResult[] = [];
  if (widgets.length > 0) {
    console.log(`🚀 Generating tests for ${widgets.length} widget(s)...\n`);

    for (const widget of widgets) {
      console.log(`\n📦 Processing widget: ${widget.name}...`);

      const result = await generateTestsForWidget(widget, config);
      widgetResults.push(result);

      if (result.success) {
        console.log(`  ✅ Success`);
        if (result.interactorPath) {
          console.log(`     Interactor: ${result.interactorPath}`);
        }
        if (result.testPath) {
          console.log(`     Test: ${result.testPath}`);
        }
        if (result.dataTestIds && result.dataTestIds.applied > 0) {
          console.log(`     Data-testids added: ${result.dataTestIds.applied}`);
        }
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
      }
    }
  }

  // Process pages
  const pageResults: PageGenerationResult[] = [];
  if (pages.length > 0) {
    console.log(`\n🚀 Generating tests for ${pages.length} page(s)...\n`);

    for (const page of pages) {
      console.log(`\n📄 Processing page: ${page.name}...`);

      const result = await generateTestsForPage(page, config);
      pageResults.push(result);

      if (result.success) {
        console.log(`  ✅ Success`);
        if (result.interactorPath) {
          console.log(`     Interactor: ${result.interactorPath}`);
        }
        if (result.testPath) {
          console.log(`     Test: ${result.testPath}`);
        }
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
      }
    }
  }

  // Summary
  const successfulWidgets = widgetResults.filter((r) => r.success).length;
  const failedWidgets = widgetResults.filter((r) => !r.success).length;
  const successfulPages = pageResults.filter((r) => r.success).length;
  const failedPages = pageResults.filter((r) => !r.success).length;

  console.log('\n📊 Summary:');
  if (widgets.length > 0) {
    console.log(`   Widgets: ${widgetResults.length} total, ${successfulWidgets} successful, ${failedWidgets} failed`);
  }
  if (pages.length > 0) {
    console.log(`   Pages: ${pageResults.length} total, ${successfulPages} successful, ${failedPages} failed`);
  }

  if (failedWidgets > 0 || failedPages > 0) {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);

  if (options.help || command === 'help' || command === '--help') {
    printUsage();
    return;
  }

  try {
    switch (command) {
      case 'detect':
        await runDetect(options);
        break;
      case 'generate':
        await runGenerate(options);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    if (options.verbose && error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
