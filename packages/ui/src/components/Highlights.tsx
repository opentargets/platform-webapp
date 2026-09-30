import { Box, Typography } from "@mui/material";
import { type ReactNode, useState } from "react";

type HighlightItem = string | TrustedHTML;

type HighlightsProps = {
  highlights: HighlightItem[];
};

function Highlights({ highlights }: HighlightsProps): ReactNode {
  const [showMore, setShowMore] = useState(false);

  if (highlights.length === 0) return null;

  return (
    <Box sx={{ marginTop: "4px" }}>
      <Typography component="span" display="inline" variant="subtitle2">
        Matches:
      </Typography>{" "}
      <Typography
        display="inline"
        variant="caption"
        className="highlights"
        dangerouslySetInnerHTML={{
          __html: showMore ? highlights.join('<span class="separator"> | </span>') : highlights[0],
        }}
      />
      {highlights.length > 1 && (
        <>
          {" "}
          <Typography variant="body2" display="inline">
            [{" "}
            <Box
              component="span"
              sx={{ cursor: "pointer", color: "primary.main" }}
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? "hide" : "more"}
            </Box>{" "}
            ]
          </Typography>
        </>
      )}
    </Box>
  );
}

export default Highlights;
