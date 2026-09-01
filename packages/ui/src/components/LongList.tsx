import { Box, Typography } from "@mui/material";
import { type ReactNode, useState } from "react";

type LongListProps = {
  maxTerms?: number;
  render: (item?: any, index?: number) => ReactNode;
  terms: any[];
};

function LongList({ terms, render, maxTerms = 10 }: LongListProps): ReactNode {
  const [showMore, setShowMore] = useState(false);

  const handleClick = () => {
    setShowMore(!showMore);
  };

  if (terms.length === 0) return null;

  const shownTerms = terms.slice(0, maxTerms);
  const hiddenTerms = terms.slice(maxTerms);
  return (
    <>
      {shownTerms.map(render)}
      {showMore && hiddenTerms.map(render)}
      {hiddenTerms.length > 0 && (
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }} onClick={handleClick}>
          {showMore ? "" : "... "}[
          <Box component="span" sx={{ color: "primary.main", cursor: "pointer" }}>
            {showMore ? " hide " : " show more "}
          </Box>
          ]
        </Typography>
      )}
    </>
  );
}

export default LongList;
