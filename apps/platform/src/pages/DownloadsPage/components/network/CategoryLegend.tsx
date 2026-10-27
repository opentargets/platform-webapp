import { Box, Typography } from "ui";
import CategoryDot from "../CategoryDot";
import { RADIUS } from "../tokens";

interface CategoryLegendProps {
  categories: string[];
  /** Adds the "In basket" swatch after a divider */
  basketMode?: boolean;
}

/** Bottom-left overlay on the network canvas: one dot + label per category present. */
function CategoryLegend({ categories, basketMode = false }: CategoryLegendProps) {
  if (!categories.length) return null;
  return (
    <Box
      component="ul"
      aria-label="Legend"
      sx={theme => ({
        position: "absolute",
        left: 12,
        bottom: 12,
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1.75,
        m: 0,
        padding: "6px 10px",
        listStyle: "none",
        backgroundColor: "rgba(255,255,255,.9)",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: RADIUS,
        fontSize: ".75rem",
        color: theme.palette.grey[600],
        pointerEvents: "none",
      })}
    >
      {categories.map(category => (
        <Box component="li" key={category} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
          <CategoryDot category={category} />
          <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>
            {category}
          </Typography>
        </Box>
      ))}
      {basketMode && (
        <Box
          component="li"
          sx={theme => ({
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            pl: 1.75,
            borderLeft: `1px solid ${theme.palette.divider}`,
          })}
        >
          <Box
            component="span"
            aria-hidden
            sx={theme => ({
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: theme.palette.primary.dark,
              boxShadow: `0 0 0 1.5px #fff, 0 0 0 2.5px ${theme.palette.primary.dark}`,
              flex: "none",
            })}
          />
          <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>
            In basket
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default CategoryLegend;
