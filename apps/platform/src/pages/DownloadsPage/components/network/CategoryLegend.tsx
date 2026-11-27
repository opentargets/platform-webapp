import { useContext, useMemo } from "react";
import { Box, Typography } from "ui";
import { DownloadsContext } from "../../context/DownloadsContext";
import { useGraphData } from "../../graph";
import CategoryDot from "../CategoryDot";

/**
 * The network's colour legend: one dot + label per category that has a node
 * on the canvas. It sits in the toolbar, side by side with the view toggle,
 * so it never covers the graph.
 */
function CategoryLegend() {
  const { state } = useContext(DownloadsContext);
  const { nodes } = useGraphData();
  const basketMode = state.networkScope === "basket";

  // Only datasets with at least one relationship are drawn (see NetworkView)
  const categories = useMemo(() => {
    const present = new Set<string>(nodes.filter(n => (n.data.degree ?? 0) > 0).map(n => n.data.type as string));
    const ordered = state.allUniqueCategories.filter(c => present.has(c));
    present.forEach(c => {
      if (!ordered.includes(c)) ordered.push(c);
    });
    return ordered;
  }, [nodes, state.allUniqueCategories]);

  if (!categories.length) return null;
  return (
    <Box
      component="ul"
      aria-label="Legend"
      data-testid="network-legend"
      sx={theme => ({
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: 1.75,
        rowGap: 0.5,
        m: 0,
        p: 0,
        listStyle: "none",
        fontSize: ".8125rem",
        color: theme.palette.grey[600],
      })}
    >
      <Box component="li" aria-hidden sx={{ mr: -0.5 }}>
        Category
      </Box>
      {categories.map(category => (
        <Box component="li" key={category} data-testid={`legend-item-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
          <CategoryDot category={category} />
          <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>
            {category}
          </Typography>
        </Box>
      ))}
      {basketMode && (
        <Box
          component="li"
          data-testid="legend-item-in-bag"
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
            In bag
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default CategoryLegend;
