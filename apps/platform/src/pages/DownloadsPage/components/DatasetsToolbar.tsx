import { RefObject, useContext, useMemo } from "react";
import { Box, Paper, Typography } from "ui";
import { DownloadsContext } from "../context/DownloadsContext";
import { clearFilterData, setActiveFilter } from "../context/downloadsActions";
import { selectCategoryCounts } from "../context/downloadsSelectors";
import { DownloadsView } from "../types/downloadTypes";
import BasketButton from "./BasketButton";
import CategoryChip from "./CategoryChip";
import SearchField from "./SearchField";
import ViewToggle from "./ViewToggle";
import { MONO_FONT, RADIUS } from "./tokens";

export interface DatasetsToolbarProps {
  view: DownloadsView;
  onViewChange: (view: DownloadsView) => void;
  basketCount: number;
  basketOpen: boolean;
  onBasketClick: () => void;
  /** Filtered rows */
  resultCount: number;
  /** All rows */
  totalCount: number;
  /** Anchor for the coach mark */
  basketButtonRef?: RefObject<HTMLButtonElement>;
  basketHighlighted?: boolean;
}

/**
 * The sticky bar above both views. In Cards view it carries search, the
 * result count, "Clear all" and the category chips; in Network view only the
 * view toggle and the basket remain.
 */
function DatasetsToolbar({
  view,
  onViewChange,
  basketCount,
  basketOpen,
  onBasketClick,
  resultCount,
  totalCount,
  basketButtonRef,
  basketHighlighted = false,
}: DatasetsToolbarProps) {
  const { state, dispatch } = useContext(DownloadsContext);
  const isCards = view === "cards";

  const counts = useMemo(
    () => selectCategoryCounts(state.rows, state.freeTextQuery, state.allUniqueCategories),
    [state.rows, state.freeTextQuery, state.allUniqueCategories]
  );

  const hasActiveFilters = state.selectedFilters.length > 0 || Boolean(state.freeTextQuery);

  const toggleCategory = (category: string) => {
    const next = state.selectedFilters.includes(category)
      ? state.selectedFilters.filter(c => c !== category)
      : [...state.selectedFilters, category];
    dispatch(setActiveFilter(next));
  };

  return (
    <Paper
      variant="outlined"
      elevation={0}
      sx={theme => ({
        position: "sticky",
        top: 0,
        zIndex: 100,
        mb: 3,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        borderRadius: RADIUS,
        borderColor: theme.palette.divider,
        backgroundColor: "#fff",
      })}
    >
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
        {isCards && (
          <>
            <SearchField width={260} />
            <Typography
              component="span"
              sx={theme => ({
                fontFamily: MONO_FONT,
                fontSize: ".75rem",
                color: theme.palette.grey[600],
                whiteSpace: "nowrap",
              })}
              aria-live="polite"
            >
              {resultCount} of {totalCount}
            </Typography>
            {hasActiveFilters && (
              <Box
                component="button"
                type="button"
                onClick={() => dispatch(clearFilterData())}
                sx={theme => ({
                  border: 0,
                  padding: 0,
                  background: "none",
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: ".8125rem",
                  color: theme.palette.primary.main,
                  "&:hover": { textDecoration: "underline" },
                })}
              >
                Clear all
              </Box>
            )}
          </>
        )}

        <Box sx={{ flex: 1 }} />

        <ViewToggle view={view} onViewChange={onViewChange} />
        <BasketButton
          ref={basketButtonRef}
          count={basketCount}
          open={basketOpen}
          onClick={onBasketClick}
          highlighted={basketHighlighted}
        />
      </Box>

      {isCards && state.allUniqueCategories.length > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.75 }} role="group" aria-label="Filter by category">
          <Typography
            component="span"
            sx={theme => ({ fontSize: ".8125rem", color: theme.palette.grey[600], mr: 0.5 })}
          >
            Category
          </Typography>
          {state.allUniqueCategories.map(category => (
            <CategoryChip
              key={category}
              category={category}
              count={counts[category] ?? 0}
              active={state.selectedFilters.includes(category)}
              onToggle={() => toggleCategory(category)}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}

export default DatasetsToolbar;
