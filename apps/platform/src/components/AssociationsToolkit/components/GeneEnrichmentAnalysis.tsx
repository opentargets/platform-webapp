import { faChartPie } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ListItemIcon, ListItemText, MenuItem, styled } from "@mui/material";
import {
  setAssociationsState,
  setModalOpen,
  useGeneEnrichment,
} from "../../GeneEnrichmentAnalysis";
import { useAotfQueryState } from "../context/AssociationsQueryContext";
import { useAotfURLState } from "../context/AssociationsURLContext";
import type { AssociationsState } from "../../GeneEnrichmentAnalysis/types";

const StyledMenuItem = styled(MenuItem)({
  "&>.MuiListItemIcon-root>svg": {
    fontSize: "1rem",
  },
});

function buildAssociationsState(params: {
  id: string;
  entitySearch: string;
  sorting: Array<{ id: string }>;
  enableIndirect: boolean;
  dataSourceControls: Array<{ id: string; weight: number; propagate: boolean; required: boolean }>;
  pinnedEntries: string[];
  uploadedEntries: string[];
  facetFiltersIds: string[];
}): AssociationsState {
  return {
    efoId: params.id,
    efoName: "",
    filter: params.entitySearch,
    sortBy: params.sorting[0].id,
    enableIndirect: params.enableIndirect,
    pinnedEntities: params.pinnedEntries,
    uploadedEntities: params.uploadedEntries,
    datasources: params.dataSourceControls.map(el => ({
      id: el.id,
      weight: el.weight,
      propagate: el.propagate,
      required: el.required,
    })),
    rowsFilter: params.pinnedEntries.toSorted(),
    facetFilters: params.facetFiltersIds,
    entitySearch: params.entitySearch,
  };
}

function GeneEnrichmentAnalysis() {
  const {
    id,
    entitySearch,
    sorting,
    enableIndirect,
    dataSourceControls,
    facetFiltersIds,
  } = useAotfQueryState();
  const { pinnedEntries, uploadedEntries } = useAotfURLState();

  const [, dispatch] = useGeneEnrichment();

  const associationsState = buildAssociationsState({
    id,
    entitySearch,
    sorting,
    enableIndirect,
    dataSourceControls,
    pinnedEntries,
    uploadedEntries,
    facetFiltersIds,
  });

  const handleOpenModal = () => {
    dispatch(setModalOpen(true));
    dispatch(setAssociationsState(associationsState));
  };

  return (
    <StyledMenuItem onClick={handleOpenModal}>
      <ListItemIcon>
        <FontAwesomeIcon icon={faChartPie} />
      </ListItemIcon>
      <ListItemText>Gene set enrichment analysis (GSEA)</ListItemText>
    </StyledMenuItem>
  );
}

export default GeneEnrichmentAnalysis;
