import type { DocumentNode } from "graphql";
import { registerSectionComponent } from "ui";
import type { ENTITY } from "../types";
import AotfReportBody from "./AotfReportBody";
import { AOTF_REPORT_SECTIONS, describeAotfState } from "./aotfReportSection";

/**
 * Registers the associations table's report widgets so saved reports can
 * rebuild them after a reload. The toolkit lives in the app, not in
 * `sections`, so it registers here instead of in registerAllSections.
 */
export function registerAotfSections(queries: Partial<Record<ENTITY, DocumentNode>>) {
  AOTF_REPORT_SECTIONS.forEach(({ entity, ...definition }) => {
    const query = queries[entity as ENTITY];
    if (!query) return;
    const Body = ({ id, label }: { id: string; label?: string }) => (
      <AotfReportBody id={id} entity={entity as ENTITY} query={query} label={label} />
    );
    registerSectionComponent(
      `${entity}:${definition.id}`,
      Body,
      { ...definition, entity },
      { describeState: describeAotfState(entity) }
    );
  });
}
