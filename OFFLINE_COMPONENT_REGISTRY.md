# Offline Component Registry System

## Overview

The offline component registry system allows report sections to work even when:
- Components aren't currently loaded in memory
- The page is reloaded after components are unloaded
- Reports are exported and imported in different sessions
- Components are code-split and lazy-loaded on demand

## How It Works

### Two-Level Component Loading

1. **In-Memory Registry** (SectionRegistry)
   - Components registered when they mount
   - Fast, synchronous access
   - Lost on page reload if not actively mounted

2. **Lazy-Load System** (ComponentRegistry)
   - Components loaded on-demand via dynamic imports
   - Cached after first load
   - Survives page reloads
   - Component code split into separate chunks

### Component Lifecycle

```
User adds Section to Report
  ↓
Body component mounts → registerSectionComponent()
  ↓
Report persists: { sectionId, entityId, entityLabel, ... }
  ↓
Page reloads
  ↓
Report loads from localStorage
  ↓
ReportBuilder tries to render sections
  ↓
Checks in-memory registry (empty)
  ↓
Triggers lazy-load of components via ComponentRegistry
  ↓
Components cached in memory
  ↓
Sections render with reconstructed Body components
```

## Implementation Details

### ComponentRegistry API

```typescript
// Register component manifest (where components live)
registerComponentManifest({
  id: "disease.Ontology",
  path: "disease/Ontology",
  type: "disease",
  exportName: "default"
});

// Lazy-load a component
const component = await getComponentAsync("disease.Ontology");

// Get cached component (sync, returns null if not loaded)
const cached = getComponentSync("disease.Ontology");

// Preload multiple components at once
await preloadComponentsForReport(["disease.Ontology", "variant.Effect"]);

// Export/import manifest for sharing reports
const manifest = exportComponentManifest();
// Later...
importComponentManifest(manifest);
```

### SectionRegistry Enhancement

`SectionRegistry` now has fallback support:

```typescript
// Tries three sources in order:
// 1. In-memory registered component
// 2. Lazy-loaded cached component
// 3. Null (component not available)
const renders = createRenderFunctionsFromMetadata(
  definition,
  request,
  entityId,
  entityLabel
);
```

### Automatic Preloading

When ReportBuilder opens a report, it automatically preloads all needed components:

```typescript
useEffect(() => {
  if (activeReport && state.isBuilderOpen) {
    const sectionIds = activeReport.sections.map(s => s.definition.id);
    preloadSectionComponents(sectionIds); // Auto-loads all
  }
}, [activeReport?.id, state.isBuilderOpen]);
```

## For Developers: Enabling Lazy Loading

Each Body component should support being lazy-loaded. They're already compatible because:

1. They're function components (can be dynamically imported)
2. They export `default` or named export `Body`
3. They have consistent props interface
4. They use hooks (useState, useQuery) which work in lazy components

### Adding Manifests

During app initialization, register manifests for all sections:

```typescript
import { registerComponentManifests } from "ui";

const manifests = [
  { id: "disease.Ontology", path: "disease/Ontology", type: "disease", exportName: "default" },
  { id: "disease.Phenotypes", path: "disease/Phenotypes", type: "disease", exportName: "default" },
  { id: "variant.Effect", path: "variant/VariantEffect", type: "variant", exportName: "default" },
  // ... more manifests
];

registerComponentManifests(manifests);
```

Or import from a generated manifest file:

```typescript
import { importComponentManifest } from "ui";
import manifestJson from "./componentManifest.json";

importComponentManifest(JSON.stringify(manifestJson));
```

## Export/Import Reports with Components

### Exporting a Report

```typescript
export const exportReportWithManifest = (reportId: string) => {
  const report = state.reports.get(reportId);
  const manifest = exportComponentManifest();
  
  return {
    report: JSON.stringify(report),
    componentManifest: manifest,
    exportedAt: new Date().toISOString(),
    version: "1.0"
  };
};
```

### Importing a Report

```typescript
export const importReportWithManifest = (exportData: string) => {
  const data = JSON.parse(exportData);
  
  // Load component manifest first
  importComponentManifest(data.componentManifest);
  
  // Then import report
  const report = JSON.parse(data.report);
  // ... add to state
};
```

## Benefits

✅ **Offline Availability**: Reports work even without active component code  
✅ **Code Splitting**: Components lazy-loaded only when needed  
✅ **Persistence**: Reports survive page reloads  
✅ **Portability**: Export/import reports with all component metadata  
✅ **Performance**: Cached components avoid repeated imports  
✅ **Backward Compatible**: Works with existing synchronous registry  

## Limitations

- Component code still needs to be available in the app's bundle chunks
- Very large reports (100+ sections) may take time to preload all components
- Dynamic component loading adds ~5-50ms per unique component type
- Components must be expressible as dynamic imports (no complex initialization)

## Future Enhancements

1. **Component Versioning** - Track component versions in manifests
2. **Selective Preloading** - Load only visible sections, lazy-load on scroll
3. **Remote Component Loading** - Load components from CDN for true offline
4. **Component Snapshots** - Save component state/render output for faster loading
5. **Background Preloading** - Idle-time component preloading in background

