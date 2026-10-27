import { Box, LongText, Typography } from "ui";
import { DownloadRow } from "../types/downloadTypes";
import { getDatasetId } from "../context/downloadsSelectors";
import BasketToggleButton from "./BasketToggleButton";
import CategoryDot from "./CategoryDot";
import DatasetActionLinks from "./DatasetActionLinks";
import { MONO_FONT, RADIUS, shadow } from "./tokens";

export interface DatasetCardProps {
  dataset: DownloadRow;
  inBasket: boolean;
  onToggleBasket: (id: string) => void;
}

/**
 * One dataset in the Cards view: title, id, two-line description, its
 * category, and the Schema / Access data / basket actions. The card itself is
 * not clickable and search matches are not highlighted in the text.
 */
function DatasetCard({ dataset, inBasket, onToggleBasket }: DatasetCardProps) {
  const id = getDatasetId(dataset);
  const categories = dataset.categories ?? [];

  return (
    <Box
      component="article"
      aria-label={dataset.name}
      sx={theme => ({
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        height: "100%",
        padding: 2,
        backgroundColor: "#fff",
        border: `1px solid ${theme.palette.grey[300]}`,
        borderRadius: RADIUS,
        minWidth: 0,
        transition: "border-color 120ms ease, box-shadow 120ms ease",
        "&:hover": {
          borderColor: theme.palette.primary.main,
          boxShadow: shadow(theme, "md"),
        },
      })}
    >
      <Box>
        <Typography
          component="h3"
          sx={theme => ({
            fontSize: "1rem",
            fontWeight: 700,
            lineHeight: 1.3,
            color: theme.palette.grey[800],
            overflowWrap: "anywhere",
          })}
        >
          {dataset.name}
        </Typography>
        <Typography
          component="div"
          sx={theme => ({
            mt: "2px",
            fontFamily: MONO_FONT,
            fontSize: ".75rem",
            color: theme.palette.grey[500],
            overflowWrap: "anywhere",
          })}
        >
          {id}
        </Typography>
      </Box>

      <Box sx={theme => ({ fontSize: ".8125rem", lineHeight: 1.5, color: theme.palette.grey[700] })}>
        <LongText lineLimit={2} variant="inherit" displayText="more">
          {dataset.description}
        </LongText>
      </Box>

      {categories.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {categories.map(category => (
            <Box key={category} sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <CategoryDot category={category} />
              <Typography component="span" sx={{ fontSize: ".8125rem", color: "text.primary" }}>
                {category}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: "auto", flexWrap: "wrap" }}>
        <DatasetActionLinks datasetId={id} />
        <Box sx={{ flex: 1 }} />
        <BasketToggleButton
          inBasket={inBasket}
          onToggle={() => onToggleBasket(id)}
          datasetName={dataset.name}
        />
      </Box>
    </Box>
  );
}

export default DatasetCard;
