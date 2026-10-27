import { Box, Typography } from "ui";
import { Link, useLocation } from "react-router";
import { DownloadRow } from "../types/downloadTypes";
import { getDatasetId, getFileLocation } from "../context/downloadsSelectors";
import CategoryDot from "./CategoryDot";
import CopyField from "./CopyField";

interface BasketRowProps {
  dataset: DownloadRow;
  locationURLs: Record<string, string>;
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

/** One basket item: its category, name, Schema and Remove links, and its file location to copy. */
function BasketRow({ dataset, locationURLs, onRemove }: BasketRowProps) {
  const id = getDatasetId(dataset);
  const { search } = useLocation();
  const category = dataset.categories?.[0];

  return (
    <Box
      component="li"
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
        >
          {dataset.name}
        </Typography>
        <Box component={Link} to={{ pathname: `/downloads/${id}/schema`, search }} sx={linkSx}>
          Schema
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => onRemove(id)}
          aria-label={`Remove ${dataset.name} from basket`}
          sx={linkSx}
        >
          Remove
        </Box>
      </Box>
      <CopyField value={getFileLocation(dataset, locationURLs)} label={`Copy ${dataset.name} file location`} />
    </Box>
  );
}

export default BasketRow;
