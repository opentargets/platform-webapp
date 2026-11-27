import { Box, Typography } from "ui";
import { Link, useLocation } from "react-router";
import { DownloadRow } from "../types/downloadTypes";
import { getDatasetId } from "../context/downloadsSelectors";
import CategoryDot from "./CategoryDot";

interface BasketRowProps {
  dataset: DownloadRow;
  onRemove: (id: string) => void;
}

const linkSx = (theme: any) => ({
  border: 0,
  padding: 0,
  background: "none",
  cursor: "pointer",
  font: "inherit",
  fontSize: ".75rem",
  color: theme.palette.primary.main,
  textDecoration: "none",
  whiteSpace: "nowrap",
  "&:hover": { textDecoration: "underline" },
});

/** One basket item: its category, name, and Schema and Remove links. */
function BasketRow({ dataset, onRemove }: BasketRowProps) {
  const id = getDatasetId(dataset);
  const { search } = useLocation();
  const category = dataset.categories?.[0];

  return (
    <Box
      component="li"
      data-testid={`basket-row-${id}`}
      sx={theme => ({
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        padding: "10px 20px",
        borderBottom: `1px solid ${theme.palette.grey[200]}`,
        listStyle: "none",
      })}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        {category && <CategoryDot category={category} />}
        <Typography
          component="span"
          sx={theme => ({
            flex: 1,
            minWidth: 0,
            fontSize: ".875rem",
            fontWeight: 500,
            color: theme.palette.grey[800],
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          })}
          title={dataset.name}
          data-testid="basket-item-name"
        >
          {dataset.name}
        </Typography>
        <Box
          component={Link}
          to={{ pathname: `/downloads/${id}/schema`, search }}
          data-testid="basket-item-schema"
          sx={linkSx}
        >
          Schema
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => onRemove(id)}
          data-testid="basket-item-remove"
          aria-label={`Remove ${dataset.name} from bag`}
          sx={linkSx}
        >
          Remove
        </Box>
      </Box>
    </Box>
  );
}

export default BasketRow;
