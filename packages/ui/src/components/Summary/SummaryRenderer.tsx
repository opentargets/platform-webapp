import { Box, GridLegacy } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo, useState } from "react";
import type { Widget } from "sections";
import { v1 } from "uuid";
import usePermissions from "../../hooks/usePermissions";
import Chip from "../Chip/Chip";
import { CATEGORIES, CATEGORY_ICONS, type Category } from "./categoryConfig";

type SummaryRendererProps = {
  widgets: Widget[];
  useKeys?: boolean;
  keyPrefix?: string;
};

function primaryCategory(widget: Widget): Category | undefined {
  const category = widget.definition.category;
  return Array.isArray(category) ? category[0] : category;
}

function SummaryRenderer({ widgets, useKeys = true, keyPrefix = "summary" }: SummaryRendererProps) {
  const { isPartnerPreview } = usePermissions();
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");

  const visibleWidgets = widgets.filter(
    widget => !widget.definition.isPrivate || isPartnerPreview
  );

  // Stable category order so the flat "All" view still visually clusters by category.
  const sortedWidgets = useMemo(() => {
    const rank = (widget: Widget) => {
      const category = primaryCategory(widget);
      return category ? CATEGORIES.indexOf(category) : CATEGORIES.length;
    };
    return [...visibleWidgets].sort((a, b) => rank(a) - rank(b));
  }, [visibleWidgets]);

  const presentCategories = CATEGORIES.filter(category =>
    visibleWidgets.some(widget => primaryCategory(widget) === category)
  );

  const filteredWidgets =
    activeCategory === "All"
      ? sortedWidgets
      : sortedWidgets.filter(widget => primaryCategory(widget) === activeCategory);

  return (
    <GridLegacy item xs={12}>
      {presentCategories.length > 1 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
          <Chip
            label="All"
            clickable
            variant="filled"
            onClick={() => setActiveCategory("All")}
            sx={{
              height: 26,
              borderRadius: 2,
              ...(activeCategory === "All" && {
                bgcolor: "primary.dark",
                color: "common.white",
              }),
            }}
          />
          {presentCategories.map(category => (
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
                ...(activeCategory === category && {
                  bgcolor: "primary.dark",
                  color: "common.white",
                }),
              }}
            />
          ))}
        </Box>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
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
