# report-builder

The report builder as one library, in three layers that only depend downward:

| Folder | Layer | May import |
|---|---|---|
| `src/core` | Framework-free: block types, reducer, store, storage contract, widget registry, state bag, live capture, refs/graph, export IR types | nothing from a UI framework, not even types |
| `src/react` | React binding: `ReportProvider` (store, widget registry, host config, injectable components), hooks, headless `WidgetRenderer`, state-bag and live-capture bindings | `core`, `react` |
| `src/ui` | Reference MUI UI: drawer, inspector, block views, export dialog and writers | `core`, `react`, MUI |

Hosts import from the package root and integrate through `ReportProvider`: register widgets as
render functions, pass a `ReportConfig` (endpoints, sandbox URL, provenance labels, deep links,
optional client hooks) and, if wanted, their own table component. The Open Targets adapter
lives in this repo's `ui` package and is the reference integration.

`yarn workspace report-builder check:boundaries` fails if a layer imports upward.
Design and architecture notes: `docs/`.
