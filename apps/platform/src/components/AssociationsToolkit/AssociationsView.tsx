import { Box } from "ui";
import type { ReactNode } from "react";
import type { DocumentNode } from "graphql";
import ActiveFiltersPanel from "./components/controls/ActiveFiltersPanel";
import DataUploader from "./components/data/DataUploader";
import ExportMenu from "./components/controls/ExportMenu";
import FacetsSearch from "./components/controls/FacetsSearch";
import { AotfMemoryParamsProvider, AotfUrlParamsProvider } from "./context/AotfParamsContext";
import { AssociationsQueryProvider } from "./context/AssociationsQueryContext";
import { AssociationsURLProvider } from "./context/AssociationsURLContext";
import { AssociationsDataProvider } from "./context/AssociationsDataContext";
import {
  AssociationsFocusProvider,
  ColumnOptionsMenu,
  DisplayModeSwitch,
  TableAssociations,
} from "./index";
import type { ENTITY } from "./types";
import AnalysisMenu from "./components/AnalysisMenu";
import AotfAddToReport from "./report/AotfAddToReport";
import AotfExportTable from "./report/AotfExportTable";
import type { AotfSnapshot } from "./report/aotfReportSection";

interface AssociationsViewProps {
  id: string;
  entity: ENTITY;
  query: DocumentNode;
  // Entity name/symbol, used to label report sections
  label?: string;
  // Rendered inside a report: state in memory (seeded from `snapshot`), page-only controls hidden
  embedded?: boolean;
  snapshot?: AotfSnapshot;
  // No filter/column controls row (static figure export)
  hideToolbar?: boolean;
}

const AssociationsView = ({
  id,
  entity,
  query,
  label,
  embedded = false,
  snapshot,
  hideToolbar = false,
}: AssociationsViewProps) => {
  const withParams = (children: ReactNode) =>
    embedded ? (
      <AotfMemoryParamsProvider initialSearch={snapshot?.search}>{children}</AotfMemoryParamsProvider>
    ) : (
      <AotfUrlParamsProvider>{children}</AotfUrlParamsProvider>
    );

  return withParams(
    <AssociationsQueryProvider
      id={id}
      entity={entity}
      query={query}
      initialQueryState={snapshot?.query}
    >
      <AssociationsURLProvider>
        <AssociationsDataProvider>
          <AssociationsFocusProvider>
            {!hideToolbar && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: { xs: 2, lg: 2 },
                  mt: embedded ? 0 : 4,
                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    flexDirection: { xs: "column", lg: "row" },
                  }}
                >
                  <Box display="flex" sx={{ ml: embedded ? 0 : -2 }}>
                    <FacetsSearch />
                    <ColumnOptionsMenu />
                    {!embedded && (
                      <>
                        <DataUploader />
                        <ExportMenu />
                        <AnalysisMenu />
                      </>
                    )}
                  </Box>
                </Box>
                {!embedded && (
                  <Box sx={{ display: "flex", justifyContent: "end", alignItems: "center", gap: 2 }}>
                    <AotfAddToReport label={label} />
                    <DisplayModeSwitch />
                  </Box>
                )}
              </Box>
            )}
            <ActiveFiltersPanel />
            <TableAssociations />
            {embedded && <AotfExportTable />}
          </AssociationsFocusProvider>
        </AssociationsDataProvider>
      </AssociationsURLProvider>
    </AssociationsQueryProvider>
  );
};

export default AssociationsView;
