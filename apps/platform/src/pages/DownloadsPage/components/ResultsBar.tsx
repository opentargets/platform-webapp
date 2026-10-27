import { Box, Typography } from "ui";
import AddAllButton from "./AddAllButton";

interface ResultsBarProps {
  count: number;
  categories: string[];
  query: string;
  missingCount: number;
  onAddAll: () => void;
}

/**
 * Summary line above the card grid while a category filter is active and
 * matches exist, with the bulk "Add all" action on the right.
 */
function ResultsBar({ count, categories, query, missingCount, onAddAll }: ResultsBarProps) {
  const noun = count === 1 ? "dataset" : "datasets";
  const summary =
    categories.length === 1 ? (
      <b>
        {count} {categories[0]} {noun}
      </b>
    ) : (
      <b>
        {count} {noun} in {categories.join(", ")}
      </b>
    );

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1.5,
        mb: 2,
      }}
    >
      <Typography component="p" sx={{ fontSize: ".875rem", color: "text.primary", m: 0 }}>
        {summary}
        {query.trim() ? <> matching &ldquo;{query.trim()}&rdquo;</> : null}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <AddAllButton missingCount={missingCount} onAddAll={onAddAll} />
    </Box>
  );
}

export default ResultsBar;
