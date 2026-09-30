# Report Builder — Standalone Library Design

**Status:** proposal, 2026-09-30
**Companion:** `ARCHITECTURE.md` (what exists today). This document describes where we want to go and the order to get there.

---

## 1. Summary

The report builder becomes three layers. The core is framework-free; the two layers above it are written once per UI framework, React first.

| Layer | Contents | Runtime deps |
|---|---|---|
| **core** | Block types, block-kind plugin registry, composable reducer, store, widget registry, state bag, live capture, storage contract, serialization + migrations, ref/graph utils | none (no React, not even types) |
| **framework** (`react` first) | Hooks and boundary components: the interface for widget authors, host pages and the UI | `react` |
| **ui** (`ui-mui` first) | Drawer, inspector, inserter, block views, drag-and-drop, export dialog | `@mui/material`, FontAwesome, dnd-kit, tiptap, CodeMirror |

Export (`collect → plan → writers`) is already React-free and becomes a fourth package that depends on core only. A second framework (Vue, Svelte, Solid) means writing a new framework layer and a new UI; nothing in core or export changes.

Open Targets is the first host. It integrates through a small adapter that maps `sections` and the associations toolkit onto the registry. Nothing in the library knows about entities, GraphQL requests or `Body` components.

Three changes have to land before the layering holds:

1. **A widget is registered as a render function, not a React node.** A node is already bound to its props and cannot be rebuilt after a reload. `(props, ctx) => Out` is the minimal contract; the node is its output. Core is generic over `Out`; the React layer fixes it to `ReactNode`.
2. **Report state is fully serializable.** The reducer currently stores live React nodes (`renderedContent`) as a same-session cache. That leaves state; reconstruction from the registry becomes the only render path.
3. **Block kinds are plugins from day one.** `ReportBlock` gets an open `kind`, the reducer composes plugin-supplied action handlers, and the widget is the first plugin. Building the hooks and views against a closed union and reopening it later would mean doing the framework layer twice.

The split is done in place, inside this monorepo, one behaviour-preserving step at a time (§10). Only once the OT-specific assumptions have all surfaced do we move packages to their own repository.

---

## 2. Goals and non-goals

**Goals**

- Any React data platform can adopt the report builder by registering its widgets and mounting a provider.
- The host chooses the design system. Our MUI UI is one implementation of the hooks layer, not the only one.
- The host chooses persistence (localStorage, IndexedDB, an API).
- Widget authors get a tiny SDK: "am I in a report?", "what props was I saved with?", and a `useState` that the report captures and restores.
- Existing saved reports in `localStorage["ot-reports"]` keep loading.
- Core is framework-free. A framework layer plus a UI is the price of supporting a framework, and we accept paying it per framework.
- Core is extensible without forking: hosts add widgets, block kinds, actions, storage and export writers through registries, never by editing core.

**Non-goals (for this pass)**

- A second framework layer. React is first; the design keeps the door open, it does not walk through it.
- Server-side rendering of reports.
- Rewriting the block kinds (text, image, data, notebook). They come along as plugins; their logic does not change.
- A new repo. Folder and package boundaries first.

---

## 3. Where the code is today

The pieces already exist. They are just coupled to Open Targets at the edges.

| Concern | Where | Coupling to fix |
|---|---|---|
| Data model | `packages/ui/src/types/report.ts` | `ReportSection` stores `definition` (OT section metadata), `request` (GraphQL result + variables), `entityId`/`entityLabel`, `bodyProps`, and live `renderedContent` nodes. Registry key is `entity:definitionId`. |
| State | `packages/ui/src/providers/ReportBuilderProvider.tsx` | Reducer is pure and good. Built on `createScopedContext` from `@ot/utils`. Persistence wrapper hard-codes `localReportStorage` and renders an MUI `Snackbar` for save errors. |
| Registry | `packages/ui/src/providers/SectionRegistry.tsx` | Module-level `Map`. `createRenderFunctionsFromMetadata` wraps every Body in **five** providers: component state, query variables, section context, `PlatformApiContext`, body props. Only the first and third are library concerns. |
| Render strategy | `packages/ui/src/hooks/useReportSectionRenderer.tsx` | Strategy 1 (cached nodes) goes away. Strategy 2 (registry) becomes the only path. |
| Widget SDK | `ReportSectionContext`, `ReportComponentStateContext` (`useReportState`), `ReportQueryVariablesProvider` | The first two generalize. Query variables are OT-specific and move into the host's `props`. |
| Host page side | `SectionBody` (`SectionBodyPropsContext.tsx`), `SectionItem.tsx`, `LiveCaptureRegistrar`, `LiveSectionStateRegistry.tsx`, `AddToReportButton.tsx` | The "create a state bag on a live page, reuse it inside a report, register live capture" logic is spread across four files and re-implemented by AotF. |
| Second host | `apps/platform/src/components/AssociationsToolkit/report/` | `AotfAddToReport.tsx` fabricates a fake `request` object purely to satisfy `AddToReportButton`'s prop shape. This is the clearest evidence the widget contract is wrong. |
| Registration | `packages/sections/src/registerAllSections.ts`, `registerAotfSections.tsx` | Both call `registerSectionComponent(key, Body, definition, exportAdapter)`. Fine as a host adapter; wrong as the library API. |
| Export | `components/Report/export/` | `collect.ts` reaches into the global registry and two module-level result stores. `RenderHost.tsx` inspects Apollo to decide when a widget is "quiet". |
| Data blocks | `blocks/GraphqlBlockView.tsx`, `blocks/RestBlockView.tsx` | GraphQL block reads the endpoint from `ConfigurationProvider` and uses the app's Apollo client. |
| Notebook | `blocks/notebook/` | Sandbox iframe points at `/notebook-runtime/index.html`, a host-served asset. |

---

## 4. The widget contract

A widget has two halves: **capture** on the host page and **replay** in the report. The library must own both, or every host re-implements the reuse-the-provider trick.

### 4.1 What is stored

```ts
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

interface WidgetBlock {
  kind: "widget";
  id: string;            // block id (today: reportSectionId)
  type: string;          // registry key, host-chosen, e.g. "target:safety"
  props: Json;           // whatever the renderer needs to rebuild
  state?: Json;          // captured UI state (filters, tab, sort, page)
  title: string;
  subtitle?: string;     // today: definition description, chipText
  view?: string;         // host-defined, e.g. "table" | "chart"
  note?: string;
  ref?: string;          // assigned when linked as a notebook input
  addedAt: number;
  stateCapturedAt?: number;
}
```

Everything Open Targets currently keeps on a section (`definition`, `request`, `entityId`, `entityLabel`, `bodyProps`) collapses into `props`. The OT adapter decides what goes in there. The library never reads inside `props`.

### 4.2 What is registered

```ts
interface WidgetContext {
  inReport: boolean;
  blockId: string;
  view?: string;
  state: StateBag;   // §4.3
}

// `Out` is whatever the framework layer renders: ReactNode for React, a VNode or
// a mount function elsewhere. Core never inspects it.
interface WidgetDefinition<P extends Json = Json, Out = unknown> {
  render: (props: P, ctx: WidgetContext) => Out;
  // Optional export hooks (today: SectionExportAdapter)
  describeState?: (state: Json) => string[];
  toTable?: (props: P, state?: Json) => TableData | undefined;
  toSvg?: (el: HTMLElement) => string | undefined;
  references?: (props: P) => Reference[];
  // Optional: which views this widget supports, for the view toggle
  views?: string[];
}

interface WidgetRegistry<Out = unknown> {
  register<P extends Json>(type: string, def: WidgetDefinition<P, Out>): () => void;
  get(type: string): WidgetDefinition<Json, Out> | undefined;
  // Optional lazy fallback supplied by the host
  resolve?(type: string): Promise<WidgetDefinition<Json, Out> | undefined>;
  has(type: string): boolean;
  subscribe(listener: () => void): () => void;
}

const createWidgetRegistry = <Out,>(opts?: { resolve?: WidgetRegistry<Out>["resolve"] }) => WidgetRegistry<Out>;
```

Design points:

- **Function, not node.** `render` runs every time the block mounts. The host's function is responsible for any host contexts its widget needs (Apollo, router, theme). Those are available because the report UI mounts inside the host's app tree, exactly as the drawer does today under `RootLayout`.
- **Generic output.** Core has no opinion on what `render` returns. The React layer exports `type ReactWidgetRegistry = WidgetRegistry<ReactNode>` and every React-facing API is typed against it. This one type parameter is what keeps React out of core.
- **Instance, not singleton.** The host creates a registry and passes it to the provider. Tests, Storybook and a second report system in the same app each get their own. A default instance is exported for convenience.
- **Sync register, optional async resolve.** `register` stays synchronous so `registerAllSections` keeps working. Hosts that do not want to import every widget at boot supply `resolve`; the renderer suspends while it loads.
- **`props` is opaque and JSON.** Storing it verbatim is what makes reload work. Anything not serializable is the host's bug, and the adapter strips it (today: `toStorableBodyProps`).

### 4.3 What the library provides around a render

Two plain objects, both defined in core so every framework layer exposes the same behaviour:

```ts
// One per widget mount. Seeded from block.state in a report, empty on a live page.
interface StateBag {
  get(key: string): Json | undefined;
  set(key: string, value: Json | undefined): void;  // no-op when deep-equal to current
  getAll(): Record<string, Json>;
  subscribe(listener: () => void): () => void;
}
const createStateBag = (initial?: Record<string, Json>) => StateBag;

// "Update from live page": widgets mounted on a host page register a capture function.
interface LiveCaptureRegistry {
  register(key: string, capture: () => Record<string, Json>): () => void;
  get(key: string): (() => Record<string, Json>) | undefined;
  subscribe(listener: () => void): () => void;
}
```

The framework layer wraps them idiomatically. In React that is `useWidgetContext()` returning `{ inReport, blockId, props, view }` and `useReportState(key, initial)` bound to the bag via `useSyncExternalStore`. The React renderer also adds `Suspense` and an error boundary, so one widget failing cannot blank the report. Everything else in today's five-provider stack moves into the OT adapter's `render`.

---

## 5. Layers and packages

```mermaid
flowchart TB
    subgraph host["Host app (Open Targets)"]
        adapter["ot-report-adapter\nregisterOtSection(), registerAotf()"]
        pages["Entity pages\n<ReportWidget> + useAddToReport()"]
        widgets["Section Bodies\nuseReportState(), useWidgetContext()"]
    end

    subgraph ui["@reports/ui-mui"]
        drawer["ReportBuilder drawer\ninspector, inserter, DnD"]
        views["Block views\ntext, image, data, notebook"]
        exportUi["Export dialog"]
    end

    subgraph react["@reports/react  (one per framework)"]
        provider["ReportProvider\n(store + registry + storage + config)"]
        hooks["useReports / useActiveReport / useBlock / actions"]
        boundary["<ReportWidget>  <WidgetRenderer>"]
        sdk["useReportState / useWidgetContext / useAddToReport\n(wrap core's StateBag + LiveCaptureRegistry)"]
    end

    subgraph core["@reports/core  (framework-free)"]
        types["Block types (open kind)"]
        plugins["Block-kind plugin registry"]
        reducer["Composable reducer + createReportStore()"]
        registry["createWidgetRegistry<Out>()"]
        bag["createStateBag() / LiveCaptureRegistry"]
        storage["ReportStorage interface\nserialize / migrate"]
        graph["refs, dependency graph"]
    end

    subgraph exp["@reports/export"]
        collect["collect → IR"]
        plan["plan"]
        writers["writer registry (docx, pptx, md, pdf, video)\ndynamically imported, host-extensible"]
    end

    ui --> react
    react --> core
    exp --> core
    exportUi --> exp
    adapter --> core
    pages --> react
    widgets --> react
```

Dependency direction is strict: **ui → framework → core**, and **export → core**. Core imports nothing from any UI framework, types included. The framework layer never imports MUI. The host imports the framework layer (for pages and widgets) and core (for registration).

### 5.1 core

- `types.ts` — `Report`, `ReportState`, the built-in block interfaces, and `ReportBlock` with an **open** `kind: string`. Built-in kinds are exported as interfaces; the union is not closed.
- `plugins.ts` — the block-kind plugin registry (§8.4). Widget, text, callout, image, divider, chapter, graphql, rest, table and notebook are each a plugin shipped with core (their data logic) and with the UI (their views).
- `reducer.ts` — the generic actions from `ReportBuilderProvider.tsx` (create, insert, update, duplicate, remove, reorder, rename, delete, export settings, init) plus composition: each plugin may contribute `actions: Record<string, (state, action) => state>`, namespaced by kind. Notebook linking, runs and ref renames move to the notebook plugin.
- `store.ts` — `createReportStore({ storage, registry, plugins })` returning `{ getState, subscribe, dispatch, load(), flush() }`. Framework layers subscribe; export and tests use it without a framework.
- `registry.ts` — §4.2, generic over `Out`.
- `stateBag.ts`, `liveCapture.ts` — §4.3.
- `storage.ts` — `interface ReportStorage { load(): Promise<Stored | null>; save(stored): Promise<SaveResult> }`, plus `localStorageAdapter(key, budgetBytes)` and `memoryAdapter()`.
- `serialize.ts` — `toStored(state)`, `fromStored(stored)`, `migrate(stored)` with a `version` field. Plugins may register a `migrate(block, fromVersion)` for their own kind.
- `refs.ts`, `graph.ts`, `codeRefs.ts` — moved as-is. `refOf` and `inputsOf` are answered by plugins, so the graph stays generic.

No `uuid` dependency: use `crypto.randomUUID()` with a fallback. `lodash.isEqual` replaced by a small deep-equal. No `react` in `dependencies` or `peerDependencies`.

### 5.2 framework layer (react first)

Each framework gets one of these. The React one:

- `ReportProvider` — props: `store` (or `storage` + `registry` + `config` to build one), `children`. Exposes the store, registry and config through context.
- Hooks (§6), all thin `useSyncExternalStore` wrappers over core objects.
- `ReportWidget` — the boundary component for host pages (§6.2).
- `WidgetRenderer` — headless: resolves the registry, mounts `render`, provides the two contexts, Suspense, error boundary. Renders a host-supplied `fallback` and `missing` slot.
- `config` — `{ graphql?: { endpoint, client? }, notebookRuntimeUrl?, confirmedHosts?, dataRelease?, deepLink?(block) }`. Everything a block view currently pulls from OT providers.

A Vue or Svelte layer would be the same list with composables or stores instead of hooks. The contract it must honour is small: seed a `StateBag` from `block.state` and write it back on change; register live capture on host pages; resolve the widget registry and call `render`; expose the store. That contract is what §4.3 fixes in core so the layers cannot drift.

### 5.3 ui-mui

Today's `components/Report/**` minus the things that moved down. It imports only from `@reports/react` and `@reports/export`. It is the reference UI; a host may replace it wholesale.

### 5.4 export

`export/collect.ts`, `plan/`, `writers/`, `richText/`, `extract/`, `video/`. Writers become a registry (`registerWriter(format, () => import("./docx"))`) so a host can add a target without forking. Two injections replace the current globals:

```ts
interface CollectDeps {
  registry: WidgetRegistry;
  captureWidget: (block: WidgetBlock, opts) => Promise<WidgetCapture>; // RenderHost, supplied by react layer
  liveResults: { data(blockId): DataSnapshot | undefined; notebook(blockId): NotebookResult | undefined };
  isBusy?: () => boolean; // host hook; OT supplies the Apollo check
}
```

Writers that pull heavy deps (`docx`, `pptxgenjs`) are loaded with `import()` so a host that only wants markdown does not ship them.

---

## 6. Public API

### 6.1 For widget authors

```ts
// Inside any component rendered by a registered widget, or on a live host page
const [tab, setTab] = useReportState("tab", "overview");
// Same semantics as today: seeded from saved state, saved on change, default not saved

const ctx = useWidgetContext();
// { inReport: false } on a live page
// { inReport: true, blockId, props, view } inside a report
```

`useReportState` is unchanged from `ReportComponentStateContext.tsx`. It is the single most valuable primitive and needs no OT knowledge.

### 6.2 For host pages

```tsx
<ReportWidget type="target:safety" props={{ id, label, entity: "target" }} title="Safety">
  <SafetyBody ... />
  <MyAddButton />
</ReportWidget>
```

`ReportWidget` does what `SectionBody` + `SectionItem` + `LiveCaptureRegistrar` do today:

- On a live page: creates the state bag and registers live capture under `type + props`, so the inspector can offer "Update from live page".
- Inside a report: reuses the bag `WidgetRenderer` already provided and registers nothing.

The host owns the button. It calls:

```ts
const add = useAddToReport();
add({ reportId?: string });            // type, props, title and state come from the enclosing ReportWidget
add.toNew({ name, description? });     // create then add, without today's setTimeout
```

An explicit-form is also exposed for hosts like AotF that have no boundary component: `useReportActions().addWidget({ type, props, title, state })`.

### 6.3 For the UI layer

```ts
useReports()            // Map<string, Report>
useActiveReport()       // Report | undefined
useReportUiState()      // { isBuilderOpen, activeReportId }
useBlock(id)            // ReportBlock | undefined, subscribed narrowly
useReportActions()      // typed wrappers over dispatch, one per action
useRegistry()           // WidgetRegistry
useReportConfig()       // config from the provider
useSaveStatus()         // { ok, error? } — replaces the Snackbar in the provider
```

### 6.4 Functions (no React)

```ts
createReportStore(opts)
createWidgetRegistry<Out>(opts)
createStateBag(initial) / createLiveCaptureRegistry()
registerBlockKind(plugin)
localStorageAdapter(key, budgetBytes)
serialize / deserialize / migrate
collectExport(report, deps) / planExport(doc, settings) / registerWriter(format, loader)
```

---

## 7. Host integration: the Open Targets adapter

A new module, `packages/sections/src/report/otAdapter.ts` (or its own package), owns everything the library used to know about OT.

```ts
export function registerOtSection(
  registry: ReactWidgetRegistry,
  entity: string,
  definition: SectionDefinition,
  getBody: () => ComponentType<any>,
  exportAdapter?: SectionExportAdapter
) {
  const Body = getBody();
  registry.register(`${entity}:${definition.id}`, {
    render: (props: OtWidgetProps, ctx) => (
      <PlatformApiContext.Provider value={platformApiFrom(props)}>
        <ReportQueryVariablesProvider variables={props.variables}>
          <ReportSectionContext.Provider value={{ entityId: props.id, entityLabel: props.label, entityType: entity }}>
            <Body id={props.id} label={props.label} entity={entity} {...props.bodyProps} request={props.request} />
          </ReportSectionContext.Provider>
        </ReportQueryVariablesProvider>
      </PlatformApiContext.Provider>
    ),
    describeState: exportAdapter?.describeState,
    toTable: (props, state) => exportAdapter?.toTable?.(props.request?.data, state),
    toSvg: exportAdapter?.toSvg,
    references: (props) => exportAdapter?.references?.(props.request?.data) ?? [],
  });
}
```

Where `OtWidgetProps` is exactly what `addSectionToReport` captures today, moved into `props`:

```ts
interface OtWidgetProps {
  id: string; label?: string; entity: string;
  variables?: Json;
  request?: { data: Json; variables?: Json };   // stored today; keep for PlatformApi consumers
  bodyProps?: Json;
  definition: { id: string; name: string; shortName?: string; isPrivate?: boolean };
}
```

`registerAllSections.ts` becomes a loop over the same table calling `registerOtSection`. `registerAotfSections.tsx` calls `registry.register` directly with its own render function and `describeState`. `AotfAddToReport` uses `useReportActions().addWidget` and stops fabricating a request.

`SectionItem` mounts `ReportWidget` instead of managing the provider itself. `ReportSectionContext`, `ReportQueryVariablesProvider` and `PlatformApiContext` stay in `ui` as OT concerns; Bodies keep importing them unchanged.

---

## 8. Other seams

### 8.1 Export

`RenderHost` stays in the react layer (it needs a portal into the host tree) and is passed to `collect` as `captureWidget`. Its "is the widget still loading" check becomes `config.isBusy?.()` plus the DOM heuristics; OT supplies the Apollo observable-query check.

### 8.2 Data blocks

`GraphqlBlockView` takes the endpoint and client from `useReportConfig().graphql`, with the block's own `endpoint` field overriding it. `RestBlockView`'s confirmed-host list moves to config. Both keep using `fetch`; no Apollo requirement in the library.

### 8.3 Notebook

`useNotebookRunner` reads `config.notebookRuntimeUrl`. The runtime build stays a separate package (`notebook-runtime`) the host serves. The completions JSON and CodeMirror setup move with the block view into `ui-mui`.

### 8.4 Block kinds as plugins

Today the reducer has notebook-specific actions (`linkNotebookInput`, `setNotebookRun`, `renameBlockRef`) and `BlockRenderer` is a switch over eleven kinds. In the library a block kind is a plugin with a framework-free half in core and a view half in each UI:

```ts
// core
interface BlockKindPlugin<B extends ReportBlock> {
  kind: B["kind"];
  defaults: (ctx: { blocks: ReportBlock[] }) => Omit<B, "id" | "addedAt">;
  actions?: Record<string, (state: ReportState, action: any) => ReportState>;  // namespaced `${kind}/${name}`
  serialize?: (block: B) => Json;            // e.g. rest: blank secret headers
  migrate?: (block: Json, from: number) => B;
  collect?: (block: B, deps: CollectDeps) => Promise<IRNode | undefined>;
  refOf?: (block: B) => string | undefined;
  inputsOf?: (block: B) => string[];
  onRefRenamed?: (block: B, from: string, to: string) => B;
  title?: (block: B) => string;
}

// ui (per framework)
interface BlockKindView<B extends ReportBlock> {
  kind: B["kind"];
  View: ComponentType<BlockViewProps<B>>;
  Inspector?: ComponentType<{ block: B }>;
  inserter?: { label: string; icon?: ReactNode; group?: string };
}
```

Widget is the first plugin; notebook the second. Core keeps ordering, ids, ref uniqueness and the dependency graph generic by asking plugins `refOf` and `inputsOf`. The reducer composes `actions` from every registered plugin under the generic ones. A host adds a block kind by registering both halves; a host on another framework reuses the core half unchanged.

---

## 9. Persistence and migration

- Stored shape gains `version: 2`. `migrate()` upgrades `version` 1 (today's `ot-reports`, no version field) by folding each `ReportSection` into a `WidgetBlock`: `type = \`${definition.entity}:${definition.id}\``, `props = { id: entityId, label: entityLabel, entity, variables: request.variables, request, bodyProps, definition }`, `state = componentState`, `title = definition.name`.
- `ReportStorage` becomes async. `localStorageAdapter` wraps the current budget check and largest-block reporting.
- Save failures surface through `useSaveStatus()`; the UI layer decides how to show them.
- The in-memory result stores (`dataResultsStore`, `notebookResultsStore`) stay ephemeral and move into the react layer as a `liveResults` context, so two providers do not share them.

---

## 10. Extraction plan

Each step ships on its own, keeps the app working, and forces one OT assumption to surface.

**Status (2026-09-30):** steps 1 and 3 are done. Step 4 is partly done: `packages/report-core` exists and holds types, reducer, store, storage, registry (generic `createRegistry`, `WidgetDefinition`/`createWidgetRegistry` defined), state bag, live capture, refs, graph and codeRefs, with `ui` consuming it and a browser smoke test (add → same-session render → persist → reload) passing. Still open in step 4: the open `kind` + block-kind plugin registry and moving the notebook actions out of the core reducer. Step 2 (the `WidgetBlock` shape, OT adapter and stored-shape migration) has not started; the core registry currently holds the OT `{ Body, definition, exportAdapter }` entry via `createRegistry<SectionComponentConstructor>()`.

1. **Make state serializable.** Remove `renderedContent` from `ReportSection` and from `addSectionToReport`. `getRenderFunctions` uses the registry only. Verify same-session add still renders (Apollo cache makes the refetch free). Delete `SerializedBlock` special-casing.
2. **Introduce `createWidgetRegistry` and the `WidgetBlock` shape.** Add the OT adapter (§7). Point `registerAllSections` and `registerAotfSections` at it. Add `version` and `migrate()`. `AotfAddToReport` stops fabricating a request.
3. **Inject storage; remove the Snackbar.** `ReportBuilderProvider` accepts `storage` and `registry`. Save status goes through a hook; the drawer renders the toast.
4. **Create `packages/report-core`.** Move types, reducer, store, registry (generic over `Out`), state bag, live capture, storage, serialize, refs, graph. Open `ReportBlock.kind`, add the block-kind plugin registry, and move the notebook actions into the notebook plugin. `ui` imports from it. Replace `createScopedContext` with the store + `useSyncExternalStore`. Add a lint rule or `package.json` check that core has no framework dependency.
5. **Create `packages/report-react`.** Add `ReportProvider`, the hooks, `WidgetRenderer`, `ReportWidget`, `useAddToReport`, config context. Collapse `SectionBody` + `SectionItem` provider logic + `LiveCaptureRegistrar` onto `ReportWidget` and core's `StateBag`.
6. **Create `packages/report-ui-mui`.** Move the drawer and block views, registering each view as a `BlockKindView`. Route GraphQL endpoint, confirmed hosts and notebook runtime URL through config. Turn writers into a registry with dynamic imports.
7. **Prove the boundary.** Write a throwaway second framework layer (a minimal vanilla-DOM or Preact renderer that lists blocks and mounts one widget) against core only. It is not shipped; its purpose is to catch React leaking into core before the packages leave the monorepo.

Steps 1–3 are small and can land this sprint. Steps 4–6 are mechanical moves once 1–3 are in, with step 4 carrying the plugin work. Step 7 is a day of work and worth doing before extraction.

---

## 11. Risks and open questions

- **Same-session render fidelity.** Dropping `renderedContent` means a freshly added widget re-mounts its Body from the registry instead of reusing the page's JSX. Any Body that behaves differently off-page is already broken after reload today; step 1 just makes that visible immediately. Mitigation: run the existing Playwright add-and-reopen checks after step 1.
- **Widgets that need host contexts.** The render function runs inside the report UI tree. If a host mounts the drawer outside its providers, widgets break. Document it; `WidgetRenderer` cannot fix it.
- **Registry timing.** Lazy `resolve` means a reopened report can show Suspense fallbacks for widgets not yet loaded. Acceptable; the UI must render a real skeleton, not "Section not available".
- **`props` growth.** OT's `props` will carry the full captured `request.data` because a few Bodies read `usePlatformApi`. That is today's storage cost, unchanged, but the adapter should trim it once those Bodies query for themselves.
- **Naming.** "Narrative" in the UI, "Report" in code, "section" for what is really a widget block. Rename in the library; keep OT strings in the UI layer.
- **Per-framework cost.** Each framework needs its own framework layer and UI, including block views for every kind. The core and export halves are shared, which is the bulk of the logic, but the views are not small. Accepted.
- **Plugin action typing.** Namespaced plugin actions lose the single discriminated union the reducer enjoys today. Mitigation: each plugin exports its own action union and typed dispatch helpers; the composed dispatch is `(action: CoreAction | PluginAction) => void`.
- **Open:** does the framework layer own `RenderHost` (portal + capture), or does export? Proposed: the framework layer owns it and export receives it as `captureWidget`.
- **Open:** package names. `@reports/*` is a placeholder; pick before step 4.
