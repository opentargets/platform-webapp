import { ReactNode } from "react";
import { ReportSection } from "../types/report";
import { createRenderFunctionsFromMetadata, getSectionComponent } from "../providers/SectionRegistry";

/**
 * Registry to store render function factories for each section definition
 * Maps definition.id -> render functions factory
 */
const sectionRendererRegistry = new Map<
  string,
  (definition: any, request: any) => {
    renderBody: () => ReactNode;
    renderChart?: () => ReactNode;
    renderDescription: () => ReactNode;
  }
>();

/**
 * Register render functions for a section definition
 * Call this from components that can render sections (e.g., SectionItem)
 */
export const registerSectionRenderer = (
  definitionId: string,
  rendererFactory: (
    definition: any,
    request: any
  ) => {
    renderBody: () => ReactNode;
    renderChart?: () => ReactNode;
    renderDescription: () => ReactNode;
  }
) => {
  sectionRendererRegistry.set(definitionId, rendererFactory);
};

/**
 * Get render functions for a section definition + request
 * Tries multiple strategies to get content:
 * 1. Cached renders from when section was added
 * 2. Registered renderer factory (if component mounted)
 * 3. Metadata-based reconstruction (if component registered in global registry)
 * 4. Fallback placeholder
 */
export const getRenderFunctions = (section: ReportSection) => {
  // Strategy 1: If we have meaningful cached renderers (from initial add), use them
  const hasCachedContent = 
    section.renderedContent?.body !== null && 
    section.renderedContent?.body !== undefined;

  if (hasCachedContent && section.renderedContent?.description) {
    return {
      renderBody: () => section.renderedContent.body,
      renderChart: () => section.renderedContent.chart,
      renderDescription: () => section.renderedContent.description,
    };
  }

  // Strategy 2: Look up renderer from registry (if component instance mounted)
  const factory = sectionRendererRegistry.get(section.definition.id);
  if (factory) {
    return factory(section.definition, section.request);
  }

  // Strategy 3: Try to reconstruct from registered component metadata
  // Use composite ID format "entity:sectionId" to match registerAllSections format
  const compositeId = `${section.definition.entity}:${section.definition.id}`;
  const componentData = getSectionComponent(compositeId);
  if (componentData) {
    const reconstructed = createRenderFunctionsFromMetadata(
      section.definition,
      section.request,
      section.entityId,
      section.entityLabel,
      componentData
    );
    if (reconstructed) {
      return reconstructed;
    }
  }

  // Fallback if no method works
  return {
    renderBody: () => (
      <div style={{ padding: "16px", textAlign: "center", color: "#999" }}>
        Section not available - no renderer found for {section.definition.name}
      </div>
    ),
    renderChart: undefined,
    renderDescription: () => <div>Section not loaded</div>,
  };
};

/**
 * Hook to get displayable content for a report section
 * Handles both cached and fresh renders
 */
export const useReportSectionContent = (section: ReportSection) => {
  const renderers = getRenderFunctions(section);

  return {
    body: renderers.renderBody(),
    chart: renderers.renderChart ? renderers.renderChart() : undefined,
    description: renderers.renderDescription(),
  };
};

/**
 * Clear the registry (useful for testing)
 */
export const clearSectionRendererRegistry = () => {
  sectionRendererRegistry.clear();
};
