import { Box, type SxProps, type Theme } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Chip from "../Chip/Chip";
import { CATEGORY_ICONS, type Category } from "./categoryConfig";
import { useSummaryCategory } from "./SummaryCategoryContext";

type CategoryFilterChipsProps = {
  categories: Category[];
  sx?: SxProps<Theme>;
};

// Shared "All" + per-category filter chip row, used both in the Summary
// grid and the sticky nav's widget selector so the two stay visually and
// behaviorally identical - both read/write the same SummaryCategoryContext.
function CategoryFilterChips({ categories, sx }: CategoryFilterChipsProps) {
  const { activeCategory, setActiveCategory } = useSummaryCategory();

  if (categories.length <= 1) return null;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, ...sx }}>
      <Chip
        label="All"
        clickable
        variant="filled"
        onClick={() => setActiveCategory("All")}
        sx={{
          height: 26,
          borderRadius: 2,
          fontSize: "0.7rem",
          ...(activeCategory === "All" && {
            bgcolor: "primary.dark",
            color: "common.white",
            "&:hover": {
              bgcolor: "secondary.main",
              color: "common.white",
            },
          }),
        }}
      />
      {categories.map(category => (
        <Chip
          key={category}
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
              <FontAwesomeIcon icon={CATEGORY_ICONS[category]} style={{ fontSize: 12 }} />
              {category}
            </Box>
          }
          clickable
          variant="filled"
          onClick={() => setActiveCategory(category)}
          sx={{
            height: 26,
            borderRadius: 2,
            fontSize: "0.7rem",
            ...(activeCategory === category && {
              bgcolor: "primary.dark",
              color: "common.white",
              "&:hover": {
                bgcolor: "secondary.main",
                color: "common.white",
              },
            }),
          }}
        />
      ))}
    </Box>
  );
}

export default CategoryFilterChips;
