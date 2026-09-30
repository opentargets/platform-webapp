import { ReportSection } from "../types/report";
import {
  createRenderFunctionsFromMetadata,
  getSectionComponent,
  type SectionRenderFunctions,
} from "../providers/SectionRegistry";

/**
 * Get render functions for a stored section: remount its registered Body with the
 * saved request, entity, props and state. Same path on first add and after a
 * reload, so a report never depends on nodes captured from the page.
 */
export const getRenderFunctions = (section: ReportSection): SectionRenderFunctions => {
  // Composite ID format "entity:sectionId" matches registerAllSections
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

  // Fallback if the section isn't registered
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
 */
export const useReportSectionContent = (section: ReportSection) => {
  const renderers = getRenderFunctions(section);

  return {
    body: renderers.renderBody(),
    chart: renderers.renderChart ? renderers.renderChart() : undefined,
    description: renderers.renderDescription(),
  };
};
