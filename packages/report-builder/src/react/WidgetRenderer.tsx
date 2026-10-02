import { type ReactNode, Suspense, useEffect, useSyncExternalStore } from "react";
import type { ReportSection, WidgetContext } from "../core";
import { ReportComponentStateProvider } from "./componentState";
import { ErrorBoundary } from "./ErrorBoundary";
import { useReportRegistry } from "./ReportProvider";
import { type ReactWidgetDefinition, widgetType } from "./registry";

// The export RenderHost looks for these strings to tell "loading" and "unregistered" apart
export const WIDGET_LOADING_TEXT = "Loading section...";
export const WIDGET_MISSING_TEXT = "Section not available - no renderer found";

/** The registered definition for a stored widget; re-renders when one is registered later. */
export const useWidgetDefinition = (section: ReportSection): ReactWidgetDefinition | undefined => {
  const registry = useReportRegistry();
  const type = widgetType(section);
  const def = useSyncExternalStore(
    registry.subscribe,
    () => registry.get(type),
    () => registry.get(type)
  );
  // Ask the host's lazy resolver once for anything not registered yet
  useEffect(() => {
    if (!def) void registry.load(type);
  }, [def, registry, type]);
  return def;
};

export interface WidgetRendererProps {
  section: ReportSection;
  /** The view the report wants, e.g. "table" | "chart"; passed to the widget's render context. */
  view?: string;
  fallback?: ReactNode;
  missing?: (section: ReportSection) => ReactNode;
  onError?: (error: Error) => void;
  errorFallback?: (error: Error) => ReactNode;
}

const defaultMissing = (section: ReportSection) => (
  <div style={{ padding: 16, textAlign: "center", color: "#999" }}>
    {WIDGET_MISSING_TEXT} for {section.definition.name}
  </div>
);

/**
 * Headless: mounts a stored widget through its registered render function, under
 * the widget's state bag (seeded from `componentState`), a Suspense boundary and
 * an error boundary. What the host wraps around its own widgets (entity context,
 * query variables, API context) belongs inside the registered `render`.
 */
export const WidgetRenderer = ({ section, view, fallback, missing, onError, errorFallback }: WidgetRendererProps) => {
  const def = useWidgetDefinition(section);
  if (!def) return <>{(missing ?? defaultMissing)(section)}</>;
  const ctx: WidgetContext = { inReport: true, blockId: section.reportSectionId, view: view ?? section.selectedView };
  return (
    <Suspense fallback={fallback ?? <div style={{ padding: 16, textAlign: "center" }}>{WIDGET_LOADING_TEXT}</div>}>
      <ReportComponentStateProvider initialState={section.componentState}>
        <ErrorBoundary
          onError={onError}
          fallback={
            errorFallback ??
            ((error) => <div style={{ padding: 16, color: "#b00020" }}>Widget failed to render: {error.message}</div>)
          }
        >
          {def.render(section, ctx)}
        </ErrorBoundary>
      </ReportComponentStateProvider>
    </Suspense>
  );
};
