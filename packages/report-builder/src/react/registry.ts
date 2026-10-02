import type { ReactNode } from "react";
import { createRegistry, type Registry, type ReportSection, type WidgetDefinition } from "../core";

/**
 * A widget as React renders it. Until LIBRARY_DESIGN.md step 2 lands, the props a
 * widget is rendered from are the stored section itself.
 */
export type ReactWidgetDefinition = WidgetDefinition<ReportSection, ReactNode>;
export type ReactWidgetRegistry = Registry<ReactWidgetDefinition>;

export const createReactWidgetRegistry = (
  options: Parameters<typeof createRegistry<ReactWidgetDefinition>>[0] = {}
): ReactWidgetRegistry => createRegistry<ReactWidgetDefinition>(options);

/**
 * The registry a host populates at boot (before any provider mounts) when it
 * doesn't pass its own to `ReportProvider`.
 */
export const defaultWidgetRegistry: ReactWidgetRegistry = createReactWidgetRegistry();

/** Registry key of a stored widget: "<entity>:<definitionId>". */
export const widgetType = (section: Pick<ReportSection, "definition">): string =>
  `${section.definition.entity}:${section.definition.id}`;
