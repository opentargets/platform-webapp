# Integrating Offline Component Registry

## Critical: Initialization Order

⚠️ **`initializeComponentRegistry()` MUST be called FIRST, before any other setup.**

This is critical because:
1. Reports are loaded from localStorage on app mount
2. Reports contain section IDs that need lazy-loading
3. Lazy-loading needs manifests to know component paths
4. If manifests aren't registered first, components can't load

### Execution Order

```
1. initializeComponentRegistry()  ← FIRST
2. ReactDOM.createRoot().render()
3. App mounts
4. ReportBuilderProvider loads reports from storage
5. Preloads components for all loaded reports
6. ReportBuilder renders with populated components
```

## Quick Start (3 Steps)

### Step 1: Initialize Registry FIRST in Your App

In your main app entry point (e.g., `src/index.tsx`), initialize the registry **before** rendering:

```typescript
// ⚠️ MUST be first!
import { initializeComponentRegistry } from "ui";
initializeComponentRegistry();

// Then render app
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
```

### Step 2: Verify in Platform App

If using the platform app, update `apps/platform/src/index.tsx`:

```typescript
// ⚠️ MUST be first - before App mount!
import { initializeComponentRegistry } from "ui";
initializeComponentRegistry();

// Then setup other providers and render
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ReportBuilderProvider } from "ui";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <ReportBuilderProvider>
    <App />
  </ReportBuilderProvider>
);
```

### Step 3: Done!

With this single initialization call at app startup, you get:
- ✅ Automatic component preloading when reports load from storage
- ✅ Lazy-loading on-demand for dynamically added components
- ✅ Offline component availability
- ✅ Persistent reports across reloads

## How It Works Now (With Fix)

### Complete Flow

```
App starts
  ↓
initializeComponentRegistry() registers all manifests
  ↓
App renders
  ↓
ReportBuilderProvider mounts
  ↓
Loads reports from localStorage
  ↓
Extracts all section IDs from all loaded reports
  ↓
Calls preloadSectionComponents() with all IDs
  ↓
Components lazy-load in parallel
  ↓
ReportBuilder renders when preload completes
  ↓
All sections show correct entity data
  ↓
User can open any report even if they haven't visited that page yet
```

### Automatic Preloading Points

1. **On App Startup** (ReportBuilderProvider)
   - Loads all reports from localStorage
   - Preloads all components needed by those reports
   
2. **On Report Open** (ReportBuilder)
   - When user opens a specific report
   - Preloads any components not yet cached
   - Defensive fallback in case a section was added dynamically

3. **On Section Add** (Optional)
   - Components auto-register when they mount
   - Fall back to lazy-load if not registered

## Testing the Fix

### Normal Workflow
1. User adds sections to report (components auto-register)
2. User saves report (stored in localStorage with metadata)
3. User closes app and reopens
4. ReportBuilder automatically preloads components
5. Report renders with all sections intact

### Export/Import Workflow
1. User exports report with manifest:
   ```typescript
   const reportData = {
     report: JSON.stringify(report),
     manifest: exportComponentManifest(),
   };
   ```

2. Another user/session imports it:
   ```typescript
   importComponentManifest(reportData.manifest);
   // Then load report
   ```

3. All components available even if not originally registered

## Adding New Components to Registry

When you add a new Body component:

1. **Ensure it's a function component** (it already is)
2. **Export as default** or named `Body`:
   ```typescript
   export default MyComponent;
   // OR
   export const MyComponent = () => { ... };
   ```

3. **Add to `ComponentRegistryInit.ts`**:
   ```typescript
   {
     id: "entity.ComponentName",
     path: "entity/ComponentName",
     type: "entity",
     exportName: "default"
   }
   ```

4. **That's it!** Re-run `initializeComponentRegistry()` and it's available.

## Testing Offline Functionality

### Test 1: Restart Without Visiting Component Page (Critical Fix)
This tests the main issue that was fixed:
```
1. Add a section to report (e.g., disease.Phenotypes)
2. Save report (stored in localStorage)
3. WITHOUT visiting the disease page, reload the entire app (Cmd+Q, reopen)
4. Open report immediately
5. Open DevTools Console
✓ PASS: Section renders with correct entity data
✓ PASS: See "Preloading components: [disease.Phenotypes]" in console
✓ PASS: No "Component not found" errors
✓ PASS: Works because initializeComponentRegistry() ran first
```

### Test 2: Basic Persistence
```
1. Add section to report
2. Reload page (Cmd+R)
3. Open report → section renders with correct entity
✓ PASS: Section visible with data
```

### Test 2: Lazy-Loading
```
1. Add section to report
2. Check DevTools Console
3. Look for: "Preloading components: [...]"
4. Watch Network tab → see component chunk loading
✓ PASS: Component chunk downloaded and cached
```

### Test 3: Without In-Memory Registry
```
1. Add section to report
2. Reload page
3. Immediately navigate to report (before other components mount)
4. Watch console for lazy-load fallback
✓ PASS: Section renders without in-memory component
```

### Test 4: Export/Import
```
1. Add sections and save report
2. Export report with manifest
3. Clear localStorage and ComponentRegistry cache
4. Import report from saved export
✓ PASS: All sections render correctly
```

## Debugging

### Check what's registered
```typescript
import { ComponentRegistry } from "ui";

// In browser console:
console.log(ComponentRegistry.componentCache);
console.log(ComponentRegistry.componentManifests);
```

### View preload status
```typescript
import { preloadSectionComponents } from "ui";

// In browser console:
await preloadSectionComponents(["disease.Phenotypes"]);
// Watch for loading in Network tab
```

### Check manifest export
```typescript
import { exportComponentManifest } from "ui";

const manifest = exportComponentManifest();
console.log(manifest);
// Shows all registered and lazy-loaded components
```

## Performance Considerations

- **First time loading a component**: ~5-50ms (dynamic import)
- **Cached component access**: <1ms (synchronous)
- **Preloading 10 components**: ~50-200ms (parallel imports)
- **Report render** (cached): <100ms for 5-10 sections

### Optimization Tips

1. **Preload strategically**: Only preload sections being used
   ```typescript
   const visibleSectionIds = report.sections.map(s => s.definition.id);
   await preloadSectionComponents(visibleSectionIds);
   ```

2. **Lazy-load on scroll**: Load components as sections come into view
   ```typescript
   useEffect(() => {
     const observer = new IntersectionObserver((entries) => {
       entries.forEach(entry => {
         if (entry.isIntersecting) {
           preloadSectionComponents([sectionId]);
         }
       });
     });
   }, []);
   ```

3. **Background preloading**: Load all components in idle time
   ```typescript
   useEffect(() => {
     requestIdleCallback(() => {
       preloadAllRegisteredComponents();
     });
   }, []);
   ```

## Troubleshooting

### "Component not found" errors
- Check that `initializeComponentRegistry()` was called
- Verify component path in manifest matches actual file location
- Check export name matches in manifest (default vs named)

### Preloading hangs
- Check Network tab for failed chunk loads
- Verify component files exist at specified paths
- Check browser console for import errors

### Manifest conflicts
- Each app instance has separate manifest
- Import overwrites previous manifests
- Use `exportComponentManifest()` before importing new ones

### Performance issues
- Reduce number of components preloaded at once
- Use selective lazy-loading instead of preload-all
- Consider code-splitting body components by type

## Architecture Reference

See [OFFLINE_COMPONENT_REGISTRY.md](./OFFLINE_COMPONENT_REGISTRY.md) for detailed architecture.

Key files:
- `ComponentRegistry.tsx` - Core lazy-loading system
- `SectionRegistry.tsx` - In-memory registry with fallback
- `ComponentRegistryInit.ts` - Manifest initialization
- `ReportBuilder.tsx` - Auto-preloading on report open
- `createRenderFunctionsFromMetadata` - Lazy-load support in rendering

