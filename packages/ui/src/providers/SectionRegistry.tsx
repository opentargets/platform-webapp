/**
 * Open Targets adapter for the report widget registry. A platform section is
 * registered as a render function over the stored section: the function mounts
 * the section's Body under the OT-specific contexts (entity, query variables,
 * page-level API data, mount props). The registry itself lives in report-builder.
 */
import React from "react";
import {
  type ReportSectionDefinition,
  type Reference,
  type ReportSection,
  type TableData,
  type WidgetContext,
  defaultWidgetRegistry,
  type ReactWidgetDefinition,
} from "report-builder";
import { PlatformApiContext } from "./PlatformApiProvider";
import { ReportQueryVariablesProvider } from "./ReportQueryVariablesProvider";
import { ReportSectionContext } from "./ReportSectionContext";
import { SectionBodyPropsProvider } from "./SectionBodyPropsContext";

const noopAsync = async () => undefined;

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

/** The registry platform sections register into; the report provider reads the same one. */
export const sectionRegistry = defaultWidgetRegistry;

const entityOf = (section: ReportSection) => {
  const { definition, request, entityId, entityLabel } = section;
  const data = request?.data?.[definition.entity] as { id?: string; name?: string; symbol?: string } | undefined;
  return { id: entityId || data?.id, label: entityLabel || data?.name || data?.symbol };
};

/**
 * Mount a section Body off its page: the saved mount props win (the entity id alone
 * doesn't rebuild every Body), the saved request stands in for the page-level query
 * (`usePlatformApi`), and the saved variables let it re-issue the same query.
 */
const renderSection =
  (Body: React.ComponentType<any>) =>
  (section: ReportSection, _ctx: WidgetContext) => {
    const { definition, request, bodyProps } = section;
    const entity = entityOf(section);
    const platformApi = {
      entity: definition.entity,
      loading: false,
      error: request?.error,
      data: request?.data,
      refetch: noopAsync,
      fetchMore: noopAsync,
    };
    return (
      <ReportQueryVariablesProvider variables={request?.variables}>
        <ReportSectionContext.Provider
          value={{ entityId: entity.id, entityLabel: entity.label, entityType: definition.entity }}
        >
          <PlatformApiContext.Provider value={platformApi}>
            <SectionBodyPropsProvider value={bodyProps ?? null}>
              <Body id={entity.id} label={entity.label} entity={definition.entity} {...bodyProps} request={request} />
            </SectionBodyPropsProvider>
          </PlatformApiContext.Provider>
        </ReportSectionContext.Provider>
      </ReportQueryVariablesProvider>
    );
  };

/**
 * Register a section component so a stored section can be rebuilt after a reload.
 * `sectionId` is the composite "entity:sectionId" (see registerAllSections).
 */
export const registerSectionComponent = (
  sectionId: string,
  Body: React.ComponentType<any>,
  _definition?: ReportSectionDefinition,
  exportAdapter?: SectionExportAdapter
) => {
  const def: ReactWidgetDefinition = {
    render: renderSection(Body),
    describeState: exportAdapter?.describeState?.bind(exportAdapter),
    toTable: exportAdapter?.toTable ? (section, state) => exportAdapter.toTable?.(section.request?.data, state) : undefined,
    toSvg: exportAdapter?.toSvg?.bind(exportAdapter),
    references: exportAdapter?.references ? (section) => exportAdapter.references?.(section.request?.data) ?? [] : undefined,
  };
  return sectionRegistry.register(sectionId, def);
};

/** The registered widget definition, if any (registerAllSections uses it to spot duplicate keys). */
export const getSectionComponent = (sectionId: string) => sectionRegistry.get(sectionId);
