/**
 * report-builder: the report builder as one library.
 *
 *   core/   framework-free: block types, reducer, store, storage, widget registry, state bag
 *   react/  React binding: ReportProvider, hooks, headless WidgetRenderer
 *   ui/     reference MUI UI: drawer, inspector, block views, export
 *
 * A host imports from this root. Its own widgets, config and components come in
 * through `ReportProvider`; nothing in here knows about a particular platform.
 */
export * from "./core";
export * from "./react";
export * from "./ui";
