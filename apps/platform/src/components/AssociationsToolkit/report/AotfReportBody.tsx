import { Box } from "@mui/material";
import type { DocumentNode } from "graphql";
import { useExportTableSink, useReportComponentState } from "ui";
import AssociationsView from "../AssociationsView";
import type { ENTITY } from "../types";
import { AOTF_STATE_KEY, type AotfSnapshot } from "./aotfReportSection";

interface AotfReportBodyProps {
  id: string;
  entity: ENTITY;
  query: DocumentNode;
  label?: string;
}

/**
 * The associations table inside a report: state comes from the section's
 * componentState snapshot and stays in memory, so it never touches the page URL.
 * Serves both the cached render (AddToReportButton) and the registry rebuild.
 */
function AotfReportBody({ id, entity, query, label }: AotfReportBodyProps) {
  const snapshot = useReportComponentState()?.getState(AOTF_STATE_KEY) as AotfSnapshot | undefined;
  const exporting = !!useExportTableSink();

  return (
    <Box
      // Exporting: full width (not clipped by the scroll box), captured as just this element;
      // right padding for the rotated column headers, which overhang the table
      data-export-capture={exporting || undefined}
      sx={exporting ? { width: "max-content", pr: 8 } : { overflowX: "auto" }}
    >
      <AssociationsView
        id={id}
        entity={entity}
        query={query}
        label={label}
        embedded
        hideToolbar={exporting}
        snapshot={snapshot}
      />
    </Box>
  );
}

export default AotfReportBody;
