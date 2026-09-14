import { Box, Typography } from "@mui/material";
import { type PropsWithChildren, useLayoutEffect, useRef, useState } from "react";

type LongTextProps = {
  lineLimit: number;
  variant?: string;
  displayText?: string;
};

const LongText = ({
  lineLimit,
  variant = "body2",
  children,
  displayText,
}: PropsWithChildren<LongTextProps>) => {
  const containerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const [showMore, setShowMore] = useState(false);
  const [numberOfLines, setNumberOfLines] = useState<number | null>();

  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!el || !container) return;
    const height = el.offsetHeight;
    const DOMLineHeight = document.defaultView
      ? document.defaultView.getComputedStyle(el, null).getPropertyValue("line-height")
      : "";
    const lineHeight = Number.parseInt(DOMLineHeight);
    const numberOfLines = Math.round(height / lineHeight);
    container.style.height =
      numberOfLines <= lineLimit ? "auto" : showMore ? "auto" : `${lineLimit * lineHeight}px`;

    setNumberOfLines(numberOfLines);
  }, [lineLimit, showMore, children]);

  return (
    <Typography variant={variant}>
      <Box
        component="span"
        ref={containerRef}
        sx={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <span ref={textRef}>{children}</span>
      </Box>
      {numberOfLines > lineLimit && (
        <span>
          {!showMore && displayText === undefined && "... "}[{" "}
          <Box
            component="span"
            sx={{ color: "primary.main", cursor: "pointer" }}
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? " hide" : (displayText ?? " show more")}
          </Box>{" "}
          ]
        </span>
      )}
    </Typography>
  );
};

export default LongText;
