import { ReactNode } from "react";
import { ReportSectionDefinition, ReportRequest } from "../types/report";
import { ReportSectionContext } from "./ReportSectionContext";

/**
 * Section Component Constructor
 * Used to dynamically create render functions from stored metadata
 */
export interface SectionComponentConstructor {
  Body: React.ComponentType<any>;
  definition: ReportSectionDefinition;
}

/**
 * Global registry to map section IDs to their component constructors
 * Allows reconstruction of render functions from stored section data
 */
const sectionComponentRegistry = new Map<string, SectionComponentConstructor>();

/**
 * Register a section component so it can be reconstructed from storage
 */
export const registerSectionComponent = (
  sectionId: string,
  Body: React.ComponentType<any>,
  definition: ReportSectionDefinition
) => {
  sectionComponentRegistry.set(sectionId, { Body, definition });
};

/**
 * Get a registered section component
 */
export const getSectionComponent = (sectionId: string) => {
  return sectionComponentRegistry.get(sectionId);
};

/**
 * Create render functions from stored request data
 * Uses the registered component to reconstruct renders
 */
export const createRenderFunctionsFromMetadata = (
  definition: ReportSectionDefinition,
  request: ReportRequest,
  entityId?: string,
  entityLabel?: string,
  sectionComponentData?: SectionComponentConstructor
) => {
  const component = sectionComponentData || getSectionComponent(definition.id);
  
  if (!component) {
    return null; // Cannot reconstruct
  }

  const { Body } = component;

  return {
    renderBody: () => (
      <ReportSectionContext.Provider 
        value={{ 
          entityId, 
          entityLabel, 
          entityType: definition.entity 
        }}
      >
        <Body
          id={entityId}
          label={entityLabel}
          entity={definition.entity}
          request={request}
        />
      </ReportSectionContext.Provider>
    ),
    renderChart: undefined,
    renderDescription: () => <div>Section: {definition.name}</div>,
  };
};
