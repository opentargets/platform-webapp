import React, { Suspense } from "react";
import { ReportSectionDefinition, ReportRequest } from "../types/report";
import { ReportSectionContext } from "./ReportSectionContext";
import { ReportQueryVariablesProvider } from "./ReportQueryVariablesProvider";
import { getComponentAsync, getComponentSync } from "./ComponentRegistry";

/**
 * Section Component Constructor
 * Used to dynamically create render functions from stored metadata
 */
export interface SectionComponentConstructor {
  Body: React.ComponentType<any>;
  definition?: ReportSectionDefinition;
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
  definition?: ReportSectionDefinition
) => {
  // sectionId should be in composite format "entity:sectionId" from registerAllSections
  sectionComponentRegistry.set(sectionId, { Body, definition });
};

/**
 * Get a registered section component
 */
export const getSectionComponent = (sectionId: string) => {
  return sectionComponentRegistry.get(sectionId);
};

/**
 * Preload components for report sections
 * Useful for ensuring components are cached before rendering a report
 * Returns a promise that resolves when all components are loaded
 */
export const preloadSectionComponents = async (sectionIds: string[]): Promise<void> => {
  const promises = sectionIds.map(async (sectionId) => {
    // // Try in-memory registry first
    // if (sectionComponentRegistry.has(sectionId)) {
    //   return;
    // }

    // Try to lazy-load the component
    await getComponentAsync(sectionId);
  });

  await Promise.all(promises);
};

/**
 * Create render functions from stored request data
 * The request object includes:
 * - data: The fetched GraphQL data
 * - variables: The variables used in the GraphQL query (essential for reconstructing requests)
 * - loading/error: Current state flags
 */
export const createRenderFunctionsFromMetadata = (
  definition: ReportSectionDefinition,
  request: ReportRequest,
  entityId?: string,
  entityLabel?: string,
  sectionComponentData?: SectionComponentConstructor
) => {
  const entityIdToUse = entityId || request?.data?.[definition.entity]?.id;
  const entityLabelToUse = entityLabel || request?.data?.[definition.entity]?.name || request?.data?.[definition.entity]?.symbol;

  // Use composite ID format "entity:sectionId" to match registerAllSections format
  const compositeId = `${definition.entity}:${definition.id}`;
  const component = sectionComponentData || getSectionComponent(compositeId);

  if (false) {
    // Try to get from lazy-loaded cache
    const lazyComponent = getComponentSync(definition.id);
    if (!lazyComponent) {
      return null; // Cannot reconstruct
    }
    
    const Body = lazyComponent;

    return {
      renderBody: () => (
        <Suspense fallback={<div style={{ padding: "16px", textAlign: "center" }}>Loading section...</div>}>
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
        </Suspense>
      ),
      renderChart: undefined,
      renderDescription: () => <div>Section: {definition.name}</div>,
    };
  }

  const { Body } = component;

  return {
    renderBody: () => (
      <Suspense fallback={<div style={{ padding: "16px", textAlign: "center" }}>Loading section...</div>}>
        <ReportQueryVariablesProvider variables={request?.variables}>
          <ReportSectionContext.Provider 
            value={{ 
              entityId: entityIdToUse, 
              entityLabel: entityLabelToUse, 
              entityType: definition.entity 
            }}
          >
            <Body
              id={entityIdToUse}
              label={entityLabelToUse}
              entity={definition.entity}
              request={request}
            />
          </ReportSectionContext.Provider>
        </ReportQueryVariablesProvider>
      </Suspense>
    ),
    renderChart: undefined,
    renderDescription: () => <div>Section: {definition.name}</div>,
  };
};
