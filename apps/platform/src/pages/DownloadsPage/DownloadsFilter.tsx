import { useContext, useMemo } from "react";
import { Box, Paper, Typography, Chip } from "ui";
import DownloadsSearchInput from "./DownloadsSearchInput";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiagramProject, faTrash } from "@fortawesome/free-solid-svg-icons";
import { DownloadsContext } from "./context/DownloadsContext";
import { clearFilterData, setActiveFilter } from "./context/downloadsActions";
import { getCategoryColor, tintHex } from "./categoryColors";

export interface ConnectionFilter {
  id: string;
  label: string;
  count: number;
}

interface DownloadsFilterProps {
  /** The dataset + neighbours filter dropped in by clicking a graph node, if any */
  connectionFilter?: ConnectionFilter | null;
  onClearConnectionFilter?: () => void;
  /** Number of cards currently visible after all filters are applied */
  resultCount: number;
}

function DownloadsFilter({
  connectionFilter,
  onClearConnectionFilter,
  resultCount,
}: DownloadsFilterProps) {
  const { state, dispatch } = useContext(DownloadsContext);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    state.rows.forEach((row: any) => {
      (row.categories || []).forEach((category: string) => {
        counts[category] = (counts[category] || 0) + 1;
      });
    });
    return counts;
  }, [state.rows]);

  function handleToggleCategory(category: string) {
    const currentFilters = [...state.selectedFilters];
    if (currentFilters.includes(category)) {
      currentFilters.splice(currentFilters.indexOf(category), 1);
    } else currentFilters.push(category);
    dispatch(setActiveFilter(currentFilters));
  }

  function handleClearAll() {
    dispatch(clearFilterData());
    onClearConnectionFilter?.();
  }

  const hasActiveFilters =
    state.selectedFilters.length > 0 || Boolean(state.freeTextQuery) || Boolean(connectionFilter);

  return (
    <Paper
      variant="outlined"
      elevation={0}
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        mb: 3,
        px: 2,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1.25,
        backgroundColor: "background.paper",
      }}
    >
      <DownloadsSearchInput sx={{ width: 220, flexShrink: 0 }} />
      <div>
        <Typography
          component="span"
          variant="body1"
          color="text.secondary"
          id="category-filter-label"
          sx={{ whiteSpace: 'nowrap', marginLeft: 1, marginRight: 1 }}
        >
          Filter by category:
        </Typography>
      {state.allUniqueCategories.map(category => {
        const active = state.selectedFilters.includes(category);
        const color = getCategoryColor(category);
        return (
          <Chip
            key={category}
            label={`${category} (${categoryCounts[category] || 0})`}
            clickable
            size="small"
            onClick={() => handleToggleCategory(category)}
            sx={{
              fontWeight: 500,
              borderColor: color,
              color: active ? "#fff" : color,
              backgroundColor: active ? color : tintHex(color, 0.08),
              "&:hover": {
                backgroundColor: active ? color : tintHex(color, 0.18),
              },
            }}
          />
        );
      })}
      </div>

      {connectionFilter && (
        <Chip
          size="small"
          icon={<FontAwesomeIcon icon={faDiagramProject} size="xs" />}
          label={`${connectionFilter.label} + ${connectionFilter.count} connected`}
          onDelete={onClearConnectionFilter}
          color="primary"
          variant="outlined"
        />
      )}

      <Box sx={{ flex: 1 }} />

      <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
        {resultCount} of {state.rows.length}
      </Typography>

      {hasActiveFilters && (
        <Chip
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FontAwesomeIcon icon={faTrash} />
              clear
            </Box>
          }
          size="small"
          clickable
          sx={{ fontWeight: "normal", typography: "caption" }}
          onClick={handleClearAll}
        />
      )}
    </Paper>
  );
}
export default DownloadsFilter;
