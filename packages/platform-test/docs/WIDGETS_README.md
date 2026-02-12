# Platform Test Widgets API

Welcome to the API documentation for the Platform Test widget classes.

## Overview

This documentation covers all Page Object Model (POM) widget classes used for end-to-end testing in the Open Targets Platform. These widgets provide a clean API for interacting with various UI sections during Playwright tests.

The documentation is generated using [TypeDoc](https://typedoc.org/) from JSDoc comments in the TypeScript source files.

## Widget Categories

### AOTF (Association On-The-Fly)
Widgets for the associations table and its controls:
- **AotfTable** - Main associations table interactions
- **AotfActions** - Table control panel (filters, export, view modes)

### CredibleSet
Credible Set page section widgets for variant analysis:
- **Locus2GeneSection** - L2G gene prioritization scores
- **GWASColocSection** - GWAS colocalisation data
- **MolQTLColocSection** - Molecular QTL colocalisation
- **CredibleSetVariantsSection** - Variants in the credible set
- **CredibleSetEnhancerToGenePredictionsSection** - E2G predictions

### Shared Widgets
Widgets used across multiple entity pages (Target, Disease, Drug, etc.):
- **ExpressionSection** - Baseline expression data
- **TractabilitySection** - Tractability assessment
- **SafetySection** - Safety liabilities
- **BibliographySection** - Literature references
- And many more...

### Study
Study page section widgets:
- **QTLCredibleSetsSection** - QTL credible sets
- **SharedTraitStudiesSection** - Shared trait studies

### Variant
Variant page section widgets:
- **VariantEffectSection** - In-silico predictions

## Usage Example

```typescript
import { test, expect } from "@playwright/test";
import { Locus2GeneSection } from "../POM/objects/widgets/CredibleSet/locus2GeneSection";

test("L2G section displays data", async ({ page }) => {
  await page.goto("/credible-set/GCST005647_12_56486014_C_T");

  const l2gSection = new Locus2GeneSection(page);

  // Wait for section to load
  await l2gSection.waitForLoad();

  // Verify section is visible
  expect(await l2gSection.isSectionVisible()).toBe(true);

  // Check table has data
  const rowCount = await l2gSection.getTableRows();
  expect(rowCount).toBeGreaterThan(0);
});
```

## Contributing

When adding new widget classes:

1. Add comprehensive JSDoc comments to the class and its methods
2. Follow the existing naming conventions
3. Run `yarn docs:test_interactors` to regenerate documentation
4. Ensure all public methods have JSDoc descriptions

## Regenerating Documentation

```bash
# Generate documentation
yarn docs:test_interactors

# Generate and serve documentation locally
yarn docs:test_interactors:serve
```

## JSDoc Tags

TypeDoc supports standard JSDoc tags. Here are the most useful ones:

- `@param` - Document function parameters
- `@returns` - Document return values
- `@example` - Provide usage examples
- `@category` - Group classes by category
- `@see` - Reference related items
- `@deprecated` - Mark deprecated methods
