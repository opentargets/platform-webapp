import { useMemo } from "react";
import type { CollectHooks, ReportSection, WidgetExportHooks } from "../core";
import { useReportConfig, useReportRegistry, widgetType } from "../react";

/**
 * The host hooks the non-React parts (collect, provenance, notebook inputs) need:
 * each widget's export hooks from the registry plus the config's labels and links.
 */
export const useCollectHooks = (): CollectHooks => {
  const registry = useReportRegistry();
  const config = useReportConfig();
  return useMemo<CollectHooks>(
    () => ({
      widget: (section) => registry.get(widgetType(section)),
      sourceLabel: config.sourceLabel,
      widgetDeepLink: config.widgetDeepLink,
      entityDeepLink: config.entityDeepLink,
      endpointLabel: config.endpointLabel,
      isFirstPartyEndpoint: config.isFirstPartyEndpoint,
    }),
    [registry, config]
  );
};

export const useWidgetExportHooks = (section: ReportSection): WidgetExportHooks | undefined => {
  const registry = useReportRegistry();
  return registry.get(widgetType(section));
};
