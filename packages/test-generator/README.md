# Test Generator

Automated test generation for Open Targets Platform widgets using LLM (Claude) + AST analysis.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TEST GENERATOR PIPELINE                               │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   GitHub Action  │
                              │   / CLI Trigger  │
                              └────────┬─────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: DETECTION                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │  │
│  │   ┌─────────────┐      ┌─────────────────┐      ┌────────────────────┐    │  │
│  │   │  Git Diff   │─────▶│ Widget Detector │─────▶│ New Widget Paths   │    │  │
│  │   │ (vs base)   │      │                 │      │ (packages/sections)│    │  │
│  │   └─────────────┘      └─────────────────┘      └────────────────────┘    │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: SOURCE COLLECTION                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │  │
│  │   ┌─────────────┐      ┌─────────────────┐      ┌────────────────────┐    │  │
│  │   │Widget Path  │─────▶│ Source Reader   │─────▶│ Widget Sources     │    │  │
│  │   │             │      │                 │      │ • Body.tsx         │    │  │
│  │   └─────────────┘      │ • Reads files   │      │ • Summary.tsx      │    │  │
│  │                        │ • Follows imports│      │ • Local components │    │  │
│  │   ┌─────────────┐      │ • Finds UI deps │      │ • GraphQL queries  │    │  │
│  │   │ UI Package  │─────▶│                 │─────▶│ • UI component src │    │  │
│  │   │ (components)│      └─────────────────┘      └────────────────────┘    │  │
│  │   └─────────────┘                                                          │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: LLM ANALYSIS                                                           │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │  │
│  │   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐   │  │
│  │   │ Widget Sources  │─────▶│   Claude LLM    │─────▶│ Widget Analysis │   │  │
│  │   │ + UI Sources    │      │                 │      │ • hasTable      │   │  │
│  │   └─────────────────┘      │ Analyzes:       │      │ • hasChart      │   │  │
│  │                            │ • Components    │      │ • interactions  │   │  │
│  │                            │ • Interactions  │      │ • testIds needed│   │  │
│  │                            │ • Data flow     │      └─────────────────┘   │  │
│  │                            └─────────────────┘                             │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                       │
                          ┌────────────┴────────────┐
                          ▼                         ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────────────────┐
│  PHASE 4A: DATA-TESTID INJECTION    │  │  PHASE 4B: TEST GENERATION              │
│  ┌───────────────────────────────┐  │  │  ┌─────────────────────────────────────┐│
│  │                               │  │  │  │                                     ││
│  │  ┌───────────┐ ┌───────────┐  │  │  │  │  ┌───────────┐    ┌─────────────┐  ││
│  │  │ LLM-based │ │   Code    │  │  │  │  │  │  Claude   │───▶│ Interactor  │  ││
│  │  │ Analysis  │─▶│  Changes  │  │  │  │  │  │   LLM     │    │   (.ts)     │  ││
│  │  │           │ │           │  │  │  │  │  │           │    └─────────────┘  ││
│  │  │ Checks:   │ │ Applies:  │  │  │  │  │  │ Generates │                     ││
│  │  │ • Props   │ │ • testids │  │  │  │  │  │ code for  │    ┌─────────────┐  ││
│  │  │ • Context │ │ to source │  │  │  │  │  │ detected  │───▶│ Test Suite  │  ││
│  │  │ • DOM     │ │ files     │  │  │  │  │  │ features  │    │  (.spec.ts) │  ││
│  │  └───────────┘ └───────────┘  │  │  │  │  └───────────┘    └─────────────┘  ││
│  │                               │  │  │  │                                     ││
│  └───────────────────────────────┘  │  │  └─────────────────────────────────────┘│
└─────────────────────────────────────┘  └─────────────────────────────────────────┘
                          │                         │
                          └────────────┬────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: OUTPUT                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │  │
│  │   Modified Widget Files          Generated Test Files                      │  │
│  │   ┌─────────────────────┐       ┌─────────────────────────────────────┐   │  │
│  │   │ packages/sections/  │       │ packages/platform-test/             │   │  │
│  │   │   src/{entity}/     │       │   POM/objects/{Widget}Interactor.ts │   │  │
│  │   │     {Widget}/       │       │   e2e/pages/{entity}/{Widget}.spec  │   │  │
│  │   │       Body.tsx ✏️   │       │   fixtures/testConfig.ts ✏️         │   │  │
│  │   └─────────────────────┘       └─────────────────────────────────────┘   │  │
│  │                                                                            │  │
│  │                    ┌─────────────────────────────────┐                     │  │
│  │                    │  Create PR with generated tests │                     │  │
│  │                    │  (branch: auto-tests/*)         │                     │  │
│  │                    └─────────────────────────────────┘                     │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Component Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         LLM-BASED DATA-TESTID ANALYSIS                          │
└─────────────────────────────────────────────────────────────────────────────────┘

   Widget Source                    UI Package Sources              LLM Decision
   ─────────────                    ──────────────────              ────────────

   Body.tsx                         SectionItem.tsx
   ┌──────────────────┐            ┌────────────────────┐
   │ <SectionItem     │            │ Already generates  │         ❌ SKIP
   │   definition=..  │ ─────────▶ │ data-testid from   │ ──────▶ (built-in
   │   ...            │            │ definition.id      │          testid)
   │ />               │            └────────────────────┘
   └──────────────────┘

   BodyContent.tsx                  GenTrackProvider.tsx
   ┌──────────────────┐            ┌────────────────────┐
   │ <GenTrackProvider│            │ createScopedContext│         ❌ SKIP
   │   initialState=  │ ─────────▶ │ (Context Provider) │ ──────▶ (no DOM
   │   ...            │            │ No DOM rendered    │          rendered)
   │ >                │            └────────────────────┘
   └──────────────────┘

   BodyContentInner.tsx             OtTable.tsx
   ┌──────────────────┐            ┌────────────────────┐
   │ <OtTable         │            │ Spreads props to   │         ✅ ADD
   │   columns=...    │ ─────────▶ │ root MUI Table     │ ──────▶ data-testid=
   │   data=...       │            │ Accepts data-testid│          "widget-table"
   │ />               │            └────────────────────┘
   └──────────────────┘
```

## Features

- 🔍 **Widget Detection**: Automatically detects new widgets added in PRs
- 🤖 **LLM Analysis**: Uses Claude to analyze widget structure and generate appropriate tests
- 🧠 **Intelligent data-testid**: LLM checks UI component sources to verify prop acceptance
- 📝 **Interactor Generation**: Creates Playwright Page Object Model interactors
- 🧪 **Test Generation**: Creates comprehensive Playwright test suites
- 🔄 **GitHub Action**: Creates separate PR with generated tests

## Installation

```bash
npm install @open-targets/test-generator
```

Or add to your project:

```bash
yarn add @open-targets/test-generator
```

## CLI Usage

### Detect New Widgets

```bash
# Detect widgets changed vs main branch
npx test-generator detect --base-branch main --output-file widgets.json

# With verbose output
npx test-generator detect --verbose
```

### Generate Tests

```bash
# Set API key
export ANTHROPIC_API_KEY=your-api-key

# Generate tests from detected widgets
npx test-generator generate --widgets-file widgets.json

# Dry run (no files written)
npx test-generator generate --widgets-file widgets.json --dry-run

# Skip data-testid injection
npx test-generator generate --widgets-file widgets.json --skip-data-testids
```

## GitHub Action Usage

The action detects new widgets in a PR and creates a **separate PR** with generated tests.

### Basic Usage

```yaml
name: Generate Tests

on:
  pull_request:
    types: [opened]
    paths:
      - 'packages/sections/src/**'

permissions:
  contents: write
  pull-requests: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ github.head_ref }}
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Generate Tests
        uses: ./packages/test-generator
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          base-branch: main
          source-branch: ${{ github.head_ref }}
          original-pr-number: ${{ github.event.pull_request.number }}
```

### Manual Dispatch

```yaml
on:
  workflow_dispatch:
    inputs:
      target_branch:
        description: 'Branch to generate tests for'
        required: true
        type: string
      pr_number:
        description: 'Original PR number (optional)'
        required: false
        type: string

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ inputs.target_branch }}

      - name: Generate Tests
        uses: ./packages/test-generator
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          source-branch: ${{ inputs.target_branch }}
          original-pr-number: ${{ inputs.pr_number }}
```

### Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `anthropic-api-key` | Anthropic API key for Claude | Yes | - |
| `github-token` | GitHub token for PR access | No | `${{ github.token }}` |
| `base-branch` | Base branch to compare against | No | `main` |
| `source-branch` | Source branch where widgets were added | No | `${{ github.head_ref }}` |
| `skip-data-testids` | Skip adding data-testid attributes | No | `false` |
| `dry-run` | Run without writing files | No | `false` |
| `create-pr` | Create a separate PR for generated tests | No | `true` |
| `original-pr-number` | Original PR number (for linking in comments) | No | - |

### Action Outputs

| Output | Description |
|--------|-------------|
| `widgets-detected` | Number of new widgets detected |
| `widgets-json` | JSON array of detected widgets |
| `tests-generated` | Number of tests successfully generated |
| `tests-failed` | Number of tests that failed to generate |
| `has-changes` | Whether any files were generated |
| `generated-branch` | Name of the branch with generated tests |
| `pr-number` | PR number for generated tests |
| `pr-url` | PR URL for generated tests |

### How It Works

1. **Detection**: Compares current branch to `base-branch` to find new widget directories
2. **Generation**: Uses Claude LLM to analyze widgets and generate tests
3. **Branch Creation**: Creates a new branch `auto-tests/{source-branch}-{run-number}`
4. **PR Creation**: Opens a PR from the generated branch to the source branch

The generated PR follows the project's PR template format with:
- Description of detected widgets
- List of generated files
- Checklist for review

## Programmatic API

```typescript
import {
  detectNewWidgets,
  readWidgetSources,
  analyzeWidget,
  generateTestsForWidget,
  processWidgetForTestIds,
} from '@open-targets/test-generator';

// Detect new widgets
const widgets = detectNewWidgets('main');

// Read widget source files
for (const widget of widgets) {
  widget.sources = readWidgetSources(widget.path);
}

// Generate tests
const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  dryRun: false,
  verbose: true,
};

for (const widget of widgets) {
  const result = await generateTestsForWidget(widget, config);
  console.log(`Generated tests for ${widget.name}:`, result);
}
```

## How It Works

### 1. Widget Detection

The detector analyzes git diff between the PR branch and base branch to find new widget directories in `packages/sections/src/*/`.

### 2. Source Collection

For each widget, it reads:
- `index.tsx` - Widget entry point
- `Body.tsx` - Main component
- `Summary.tsx` - Summary component (if exists)
- `Description.tsx` - Description component (if exists)
- All imported local components
- GraphQL query files
- **UI component source files** (from `packages/ui/src/`) for components imported from `"ui"`

### 3. LLM Analysis

Claude analyzes the widget code to understand:
- What UI components are present (tables, charts, etc.)
- What interactions are available
- What existing data-testid attributes exist
- What test scenarios make sense

### 4. LLM-based Data-testid Analysis

The LLM receives both widget sources AND UI component sources to intelligently determine:
- **Which components render DOM** (can accept data-testid)
- **Which are Context Providers** (skip - no DOM rendered)
- **Which have built-in testid mechanisms** (skip - like SectionItem)
- **The exact code modifications needed**

This approach avoids static heuristics by letting the LLM inspect actual component implementations.

### 5. Code Generation

Based on the analysis:
- Generates Playwright interactor classes following POM pattern
- Generates comprehensive test suites
- Only includes methods/tests for features that actually exist

## Configuration

Default configuration:

```typescript
const DEFAULT_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  widgetBasePath: 'packages/sections/src',
  interactorOutputPath: 'packages/platform-test/POM/objects',
  testOutputPath: 'packages/platform-test/e2e/pages',
  fixturesPath: 'packages/platform-test/fixtures/testConfig.ts',
};
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Architecture

```
packages/test-generator/
├── src/
│   ├── index.ts              # Package exports
│   ├── types.ts              # TypeScript types
│   ├── cli.ts                # Command-line interface
│   │
│   ├── detector/             # Widget detection module
│   │   ├── index.ts          # Module exports
│   │   ├── git-utils.ts      # Git diff operations
│   │   ├── widget-detector.ts # Detects new widgets in PRs
│   │   ├── page-detector.ts  # Detects page components
│   │   └── source-reader.ts  # Reads widget & UI sources
│   │
│   ├── generator/            # Code generation module
│   │   ├── index.ts          # Module exports
│   │   ├── orchestrator.ts   # Coordinates generation pipeline
│   │   ├── analyzer.ts       # LLM-based widget analysis
│   │   ├── llm-client.ts     # Claude API client
│   │   ├── prompt-formatter.ts # Formats LLM prompts
│   │   ├── testid-applicator.ts # Applies data-testid changes
│   │   ├── interactor-generator.ts # Generates POM interactors
│   │   ├── test-generator.ts # Generates Playwright tests
│   │   └── file-io.ts        # File write operations
│   │
│   └── ast/                  # AST utilities module
│       ├── index.ts          # Module exports
│       ├── transformer.ts    # Babel/recast transforms
│       ├── jsx-utils.ts      # JSX manipulation helpers
│       └── widget-processor.ts # Widget-specific processing
│
├── action.yml                # GitHub Action definition
├── package.json
├── tsconfig.json
└── README.md
```

### Module Responsibilities

| Module | Purpose |
|--------|---------|
| **detector/** | Finds new widgets via git diff, reads source files, extracts UI component dependencies |
| **generator/** | LLM-powered analysis, generates interactors & tests, applies data-testid changes |
| **ast/** | Babel/recast utilities for code transformation (format-preserving) |

## License

Apache 2.0
