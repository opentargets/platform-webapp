import React, { Suspense } from "react";
import { ReportSectionDefinition, ReportRequest } from "../types/report";
import { ReportSectionContext } from "./ReportSectionContext";
import { ReportQueryVariablesProvider } from "./ReportQueryVariablesProvider";
import { ReportComponentStateProvider } from "./ReportComponentStateContext";
import { SectionBodyPropsProvider } from "./SectionBodyPropsContext";
import { PlatformApiContext } from "./PlatformApiProvider";
import ErrorBoundary from "../components/ErrorBoundary";

const noopAsync = async () => undefined;
import type { Reference, TableData } from "../components/Report/export/types";

/**
 * Optional per-section hooks used by the report export (collect/RenderHost).
 * `data` is the section's captured request.data; `state` its componentState.
 * Table-backed sections usually need none of this: OtTable publishes its rows
 * to the RenderHost on its own.
 */
export interface SectionExportAdapter {
  toTable?(data: unknown, state?: Record<string, any>): TableData | undefined;
  toSvg?(el: HTMLElement): string | undefined;
  references?(data: unknown): Reference[];
  // Human-readable captured state (chips, provenance), for state the generic formatter can't read
  describeState?(state: Record<string, any>): string[];
}

/**
 * Section Component Constructor
 * Used to dynamically create render functions from stored metadata
 */
export interface SectionComponentConstructor {
  Body: React.ComponentType<any>;
  definition?: ReportSectionDefinition;
  exportAdapter?: SectionExportAdapter;
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
  definition?: ReportSectionDefinition,
  exportAdapter?: SectionExportAdapter
) => {
  // sectionId should be in composite format "entity:sectionId" from registerAllSections
  sectionComponentRegistry.set(sectionId, { Body, definition, exportAdapter });
};

/**
 * Get a registered section component
 */
export const getSectionComponent = (sectionId: string) => {
  return sectionComponentRegistry.get(sectionId);
};

/**
 * Export adapter for a widget's definition, if its section registered one
 */
export const getSectionExportAdapter = (definition: {
  entity: string;
  id: string;
}): SectionExportAdapter | undefined =>
  sectionComponentRegistry.get(`${definition.entity}:${definition.id}`)?.exportAdapter;

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
  sectionComponentData?: SectionComponentConstructor,
  componentState?: Record<string, any>,
  bodyProps?: Record<string, unknown>
) => {
  const entityIdToUse = entityId || request?.data?.[definition.entity]?.id;
  const entityLabelToUse = entityLabel || request?.data?.[definition.entity]?.name || request?.data?.[definition.entity]?.symbol;

  // Use composite ID format "entity:sectionId" to match registerAllSections format
  const compositeId = `${definition.entity}:${definition.id}`;
  const component = sectionComponentData || getSectionComponent(compositeId);

  const { Body } = component;

  // A few Bodies read the page-level query (usePlatformApi) rather than running their own;
  // off-page, the section's saved request stands in for it
  const platformApi = {
    entity: definition.entity,
    loading: false,
    error: request?.error,
    data: request?.data,
    refetch: noopAsync,
    fetchMore: noopAsync,
  };

  return {
    renderBody: () => (
      <Suspense fallback={<div style={{ padding: "16px", textAlign: "center" }}>Loading section...</div>}>
        <ReportComponentStateProvider initialState={componentState}>
          <ReportQueryVariablesProvider variables={request?.variables}>
            <ReportSectionContext.Provider
              value={{
                entityId: entityIdToUse,
                entityLabel: entityLabelToUse,
                entityType: definition.entity
              }}
            >
              {/* One section failing must not take the rest of the report down with it */}
              <ErrorBoundary>
                <PlatformApiContext.Provider value={platformApi}>
                  {/* Saved mount props win: the entity id alone doesn't rebuild every Body */}
                  <SectionBodyPropsProvider value={bodyProps ?? null}>
                    <Body
                      id={entityIdToUse}
                      label={entityLabelToUse}
                      entity={definition.entity}
                      {...bodyProps}
                      request={request}
                    />
                  </SectionBodyPropsProvider>
                </PlatformApiContext.Provider>
              </ErrorBoundary>
            </ReportSectionContext.Provider>
          </ReportQueryVariablesProvider>
        </ReportComponentStateProvider>
      </Suspense>
    ),
    renderChart: undefined,
    renderDescription: () => <div>Section: {definition.name}</div>,
  };
};
