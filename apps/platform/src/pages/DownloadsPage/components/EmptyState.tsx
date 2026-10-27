import { Box, Button, Typography } from "ui";
import { RADIUS } from "./tokens";

export type EmptyStateProps =
  | {
      type: "no-results";
      query: string;
      onClearSearch: () => void;
    }
  | {
      type: "no-matches-in-category";
      query: string;
      categories: string[];
      /** Datasets in other categories that match the query */
      otherMatches: number;
      onRemoveFilters: () => void;
    };

/** Dashed placeholder shown in place of the card grid when a search or filter leaves nothing to show. */
function EmptyState(props: EmptyStateProps) {
  const q = props.query.trim();
  let title: string;
  let body: string;
  let action: string;
  let onAction: () => void;

  if (props.type === "no-results") {
    title = `No datasets match “${q}”`;
    body =
      "Search looks at dataset names, ids and descriptions. Try a broader term, or clear the search to browse by category.";
    action = "Clear search";
    onAction = props.onClearSearch;
  } else {
    const single = props.categories.length === 1;
    const label = single ? props.categories[0] : props.categories.join(", ");
    title = q ? `No ${label} datasets match “${q}”` : `No ${label} datasets`;
    body = `${props.otherMatches} ${props.otherMatches === 1 ? "dataset" : "datasets"} in other categories match. Remove the ${
      single ? `${label} filter` : "filters"
    } to see them.`;
    action = single ? `Remove ${label} filter` : "Remove filters";
    onAction = props.onRemoveFilters;
  }

  return (
    <Box
      role="status"
      sx={theme => ({
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 1,
        padding: "48px 24px",
        border: `1px dashed ${theme.palette.grey[400]}`,
        borderRadius: RADIUS,
        gridColumn: "1 / -1",
      })}
    >
      <Typography
        component="h3"
        sx={theme => ({ fontSize: "1rem", fontWeight: 700, color: theme.palette.grey[800], m: 0 })}
      >
        {title}
      </Typography>
      <Typography sx={theme => ({ fontSize: ".8125rem", color: theme.palette.grey[600], maxWidth: "52ch" })}>
        {body}
      </Typography>
      <Button variant="outlined" onClick={onAction} sx={{ mt: 1, borderRadius: RADIUS, fontSize: ".8125rem" }}>
        {action}
      </Button>
    </Box>
  );
}

export default EmptyState;
