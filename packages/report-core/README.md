# report-core

Framework-free core of the report builder. No React, no MUI, no DOM framework of any kind:
block types, the reducer and store, the widget registry, the per-widget state bag, live
capture, the storage contract and serialization, and the ref/dependency-graph utilities.

Framework layers (`ui` today, `report-react` once extracted) wrap these in hooks and
components. See `packages/ui/src/components/Report/LIBRARY_DESIGN.md`.

Rule: nothing in `src/` may import `react`, `@mui/*` or any other UI framework, types included.
