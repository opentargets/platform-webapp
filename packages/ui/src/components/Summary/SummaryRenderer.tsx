import { Box, GridLegacy } from "@mui/material";
import type { Widget } from "sections";
import { v1 } from "uuid";
import usePermissions from "../../hooks/usePermissions";
import CategoryFilterChips from "./CategoryFilterChips";
import { CATEGORIES, primaryCategory } from "./categoryConfig";
import { useSummaryCategory } from "./SummaryCategoryContext";

type SummaryRendererProps = {
  widgets: Widget[];
  useKeys?: boolean;
  keyPrefix?: string;
};

function SummaryRenderer({ widgets, useKeys = true, keyPrefix = "summary" }: SummaryRendererProps) {
  const { isPartnerPreview } = usePermissions();
  const { activeCategory } = useSummaryCategory();

  const visibleWidgets = widgets.filter(
    widget => !widget.definition.isPrivate || isPartnerPreview
  );

  const presentCategories = CATEGORIES.filter(category =>
    visibleWidgets.some(widget => primaryCategory(widget.definition) === category)
  );

  // Keep the same order the widgets are displayed in elsewhere on the page
  // (nav, body) rather than regrouping by category.
  const filteredWidgets =
    activeCategory === "All"
      ? visibleWidgets
      : visibleWidgets.filter(widget => primaryCategory(widget.definition) === activeCategory);

  return (
    <GridLegacy item xs={12}>
      <CategoryFilterChips categories={presentCategories} sx={{ mb: "18px" }} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(5, 1fr)",
          },
          rowGap: 1.5,
          columnGap: 2,
        }}
      >
        {filteredWidgets.map((widget, index) => {
          const Summary = widget.Summary;
          const key = useKeys ? `${keyPrefix}-${v1()}` : `${keyPrefix}-${index}`;
          return <Summary key={key} />;
        })}
      </Box>
    </GridLegacy>
  );
}

export default SummaryRenderer;
