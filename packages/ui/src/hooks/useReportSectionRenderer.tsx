import { ReportSection } from "../types/report";
import { createRenderFunctionsFromMetadata, getSectionComponent } from "../providers/SectionRegistry";

/**
 * Get render functions for a section definition + request
 * Tries multiple strategies to get content:
 * 1. Cached renders from when section was added
 * 2. Metadata-based reconstruction (if component registered in global registry)
 * 3. Fallback placeholder
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

  // Strategy 2: Try to reconstruct from registered component metadata
  // Use composite ID format "entity:sectionId" to match registerAllSections format
  const compositeId = `${section.definition.entity}:${section.definition.id}`;
  const componentData = getSectionComponent(compositeId);
  if (componentData) {
    const reconstructed = createRenderFunctionsFromMetadata(
      section.definition,
      section.request,
      section.entityId,
      section.entityLabel,
      componentData,
      section.componentState,
      section.bodyProps
    );
    if (reconstructed) {
      return reconstructed;
    }
  }

  // Fallback if no method works
  return {
    renderBody: () => {
      console.log('section.definition', section.definition);
      return (

      <div style={{ padding: "16px", textAlign: "center", color: "#999" }}>
        Section not available - no renderer found for {section.definition.name}
      </div>
    )},
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
