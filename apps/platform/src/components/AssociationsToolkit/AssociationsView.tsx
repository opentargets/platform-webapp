import { Box } from "@mui/material";
import type { DocumentNode } from "graphql";
import ActiveFiltersPanel from "./components/controls/ActiveFiltersPanel";
import DataUploader from "./components/data/DataUploader";
import ExportMenu from "./components/controls/ExportMenu";
import FacetsSearch from "./components/controls/FacetsSearch";
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

interface AssociationsViewProps {
  id: string;
  entity: ENTITY;
  query: DocumentNode;
}

const AssociationsView = ({ id, entity, query }: AssociationsViewProps) => (
  <AssociationsQueryProvider id={id} entity={entity} query={query}>
    <AssociationsURLProvider>
      <AssociationsDataProvider>
        <AssociationsFocusProvider>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: { xs: 2, lg: 2 },
              mt: 4,
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
              <Box display="flex" sx={{ ml: -2 }}>
                <FacetsSearch />
                <ColumnOptionsMenu />
                <DataUploader />
                <ExportMenu />
                <AnalysisMenu />
              </Box>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "end" }}>
              <DisplayModeSwitch />
            </Box>
          </Box>
          <ActiveFiltersPanel />
          <TableAssociations />
        </AssociationsFocusProvider>
      </AssociationsDataProvider>
    </AssociationsURLProvider>
  </AssociationsQueryProvider>
);

export default AssociationsView;
