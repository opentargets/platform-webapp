import {
  faArrowDownWideShort,
  faCircleXmark,
  faFileImport,
  faFilter,
  faGear,
  faThumbtack,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Chip,  Typography } from "@mui/material";
import { Tooltip } from "ui";
import type { Facet } from "../../Facets/facetsTypes";
import { setIncludeMeasurements } from "../../context/aotfActions";
import { useAotfQueryState, useAotfQueryDispatch } from "../../context/AssociationsQueryContext";
import { useAotfURLState } from "../../context/AssociationsURLContext";
import dataSources from "../../static_datasets/dataSourcesAssoc";
import { ROW_METRICS } from "../../static_datasets/rowMetrics";

function removeFacet(items: Facet[], idToRemove: string): Facet[] {
  return items.filter((item) => item.id !== idToRemove);
}

function FilterChip({ onDelete, label, tootltipContent, maxWidth = 150, testId }) {
  return (
    <Tooltip title={tootltipContent} placement="bottom">
      <Box sx={{ maxWidth: `${maxWidth}px` }}>
        <Chip
          data-testid={testId}
          sx={{
            borderRadius: 2,
            "& .MuiChip-label": {
              mr: 1,
            },
            "& .MuiChip-deleteIcon": {
              fontSize: "14px",
            },
          }}
          deleteIcon={<FontAwesomeIcon icon={faCircleXmark} size="xs" />}
          onDelete={() => {
            onDelete();
          }}
          size="small"
          label={label}
        />
      </Box>
    </Tooltip>
  );
}

function ActiveFiltersPanel() {
  const { facetFilters, includeMeasurements, entitySearch, modifiedSourcesDataControls, sorting, entityToGet } = useAotfQueryState();
  const { facetFilterSelect, dispatch, resetDatasourceControls, resetSorting, handleEntitySearch } = useAotfQueryDispatch();
  const { pinnedEntries, uploadedEntries, setPinnedEntries, setUploadedEntries } = useAotfURLState();

  const somePinned = pinnedEntries.length > 0;
  const someUploaded = uploadedEntries.length > 0;
  const someFacetFilters = facetFilters.length > 0;
  const tableSorted = sorting[0].id !== "score";
  const modifiedEntitySearch = entitySearch !== "";
  const showExcludeMeasurements = entityToGet === "disease" && !includeMeasurements;

  const filterCategories = [
    someFacetFilters,
    somePinned,
    someUploaded,
    tableSorted,
    modifiedSourcesDataControls,
    modifiedEntitySearch,
    showExcludeMeasurements
  ];

  const showActiveFilter = filterCategories.some((x) => x === true);
  const multipleFiltersOn = filterCategories.filter((x) => x === true).length > 0;

  const onDelete = (id: string) => {
    const newState = removeFacet(facetFilters, id);
    facetFilterSelect(newState);
  };

  const setAllFilters = () => {
    if (somePinned) setPinnedEntries([]);
    if (someUploaded) setUploadedEntries([]);
    if (entitySearch) handleEntitySearch("");
    if (modifiedSourcesDataControls) resetDatasourceControls();
    if (facetFilters.length > 0) facetFilterSelect([]);
    if (tableSorted) resetSorting();
    if (showExcludeMeasurements) dispatch(setIncludeMeasurements(true));
  };

  return (
    <Box
      data-testid="active-filters-panel"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        minHeight: "28px",
        alignItems: "center",
        mb: 2,
      }}
    >
      { multipleFiltersOn && <Typography variant="subtitle2">Applied filters:</Typography>}

      {showExcludeMeasurements && (
         <FilterChip
         maxWidth={300}
          tootltipContent="Exclude measurements"
          label={<Box sx={{ gap: 1 }}><FontAwesomeIcon icon={faFilter} size="sm" /> Exclude measurements</Box>}
          onDelete={() => {
            dispatch(setIncludeMeasurements(true));
          }}
        />
      )}

      {entitySearch && (
        <FilterChip
          testId="active-filter-chip-entity-search"
          tootltipContent="Name entity"
          label={`"${entitySearch}"`}
          onDelete={() => {
            handleEntitySearch("");
          }}
        />
      )}
      {facetFilters.map((facet: Facet) => (
        <FilterChip
        maxWidth={300}
          key={facet.id}
          testId={`active-filter-chip-${facet.id}`}
          tootltipContent={facet.label}
          label={
            <Box sx={{ gap: 1 }}>
              <FontAwesomeIcon icon={faFilter} size="sm" /> {facet.label}
            </Box>
           
          }
          onDelete={() => {
            onDelete(facet.id);
          }}
        />
      ))}
      {modifiedSourcesDataControls && (
        <FilterChip
          testId="active-filter-chip-column-options"
          tootltipContent="Reset Datasource controls"
          maxWidth={300}
          onDelete={() => {
            resetDatasourceControls();
          }}
          label={
            <Box sx={{ gap: 1 }}>
              <FontAwesomeIcon icon={faGear} /> Column options
            </Box>
          }
        />
      )}
      {tableSorted && (
        <FilterChip
          testId="active-filter-chip-sort"
          maxWidth={300}
          tootltipContent="Reset sorting"
          onDelete={() => {
            resetSorting();
          }}
          label={
            <Box sx={{ gap: 1 }}>
              <FontAwesomeIcon icon={faArrowDownWideShort} />{" "}
              {dataSources.find((d) => d.id === sorting[0].id)?.label ??
                ROW_METRICS.find((m) => m.id === sorting[0].id)?.label}
            </Box>
          }
        />
      )}
      {somePinned && (
        <FilterChip
          testId="active-filter-chip-pinned"
          tootltipContent="Pinned entries"
          onDelete={() => {
            setPinnedEntries([]);
          }}
          label={
            <Box>
              <FontAwesomeIcon icon={faThumbtack} size="sm" /> Pinned
            </Box>
          }
        />
      )}
      {someUploaded && (
        <FilterChip
          testId="active-filter-chip-uploaded"
          tootltipContent="Uploaded entries"
          onDelete={() => {
            setUploadedEntries([]);
          }}
          label={
            <Box sx={{ gap: 1 }}>
              <FontAwesomeIcon icon={faFileImport} /> Uploaded
            </Box>
          }
        />
      )}

      {showActiveFilter && (
        <Tooltip title="Reset all filters" placement="bottom">
          <Box>
            <Box
              data-testid="clear-all-filters-button"
              sx={(theme) => ({
                display: "flex",
                alignItems: "center",
                py: 0.3,
                px: 1,
                border: ".9px solid",
                borderRadius: 2,
                borderColor: theme.palette.grey[400],
                cursor: "pointer",
                gap: 1,
                ":hover": {
                  boxShadow: theme.boxShadow.default,
                  color: theme.palette.primary.dark,
                },
              })}
              onClick={setAllFilters}
            >
              <Typography sx={{ fontSize: "0.8125rem" }} variant="body2">
                <FontAwesomeIcon icon={faTrash} size="sm" />
              </Typography>
            </Box>
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}
export default ActiveFiltersPanel;
