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
import { useAotfData } from "../context/AssociationsDataContext";
import { ENTITY } from "../types";
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
  diseaseName: string;
}): AssociationsState {
  return {
    efoId: params.id,
    efoName: params.diseaseName,
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

/** Extract entity name from the query results to avoid refetching */
function getEntityName(entity: ENTITY, data: any[]): string {
  if (!data || data.length === 0) return "";
  
  if (entity === ENTITY.DISEASE) {
    return data[0].diseaseName || "";
  }
  if (entity === ENTITY.TARGET) {
    return data[0].target?.approvedSymbol || "";
  }
  return "";
}

function GeneEnrichmentAnalysis() {
  const {
    id,
    entity,
    entitySearch,
    sorting,
    enableIndirect,
    dataSourceControls,
    facetFiltersIds,
  } = useAotfQueryState();
  const { data } = useAotfData();
  const { pinnedEntries, uploadedEntries } = useAotfURLState();

  const [, dispatch] = useGeneEnrichment();

  const entityName = getEntityName(entity, data);

  const associationsState = buildAssociationsState({
    id,
    entitySearch,
    sorting,
    enableIndirect,
    dataSourceControls,
    pinnedEntries,
    uploadedEntries,
    facetFiltersIds,
    diseaseName: entityName,
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
