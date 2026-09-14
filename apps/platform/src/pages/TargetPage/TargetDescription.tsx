import { useState, useLayoutEffect, useRef } from "react";
import { v1 } from "uuid";
import { Typography, Skeleton } from "ui";
import { styled } from "@mui/material/styles";

const StyledTextContainer = styled("span")({
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  "& span:not(:last-child)": { marginBottom: "12px" },
});

const StyledShowMore = styled("span")(({ theme }) => ({
  color: theme.palette.primary.main,
  cursor: "pointer",
}));

const getStyleHeight = ({ newNumberOfLines, lineLimit, showMore, lineHeight }) => {
  if (newNumberOfLines <= lineLimit) return "auto";
  if (showMore) return "auto";
  return `${lineLimit * lineHeight}px`;
};

function LongText({
  lineLimit,
  children = null,
  variant = "body2",
  descriptions,
  targetId,
  hasGutterBottom = false,
}) {
  const containerRef = useRef();
  const [showMore, setShowMore] = useState(false);
  const [numberOfLines, setNumberOfLines] = useState();

  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = containerRef.current;
    const height = el.offsetHeight;
    const lineHeight = Number.parseInt(
      document.defaultView.getComputedStyle(el, null).getPropertyValue("line-height"),
      10
    );
    const newNumberOfLines = Math.round(height / lineHeight);

    container.style.height = getStyleHeight({
      newNumberOfLines,
      lineHeight,
      lineLimit,
      showMore,
    });

    setNumberOfLines(newNumberOfLines);
  }, [lineLimit, showMore, children]);

  function createDescriptionMarkup(desc) {
    return { __html: desc };
  }

  return (
    <Typography variant={variant} gutterBottom={hasGutterBottom}>
      <StyledTextContainer ref={containerRef}>
        {descriptions.map((desc, i) => (
          <span
            key={`${targetId}-${v1()}`}
            dangerouslySetInnerHTML={createDescriptionMarkup(desc)}
          />
        ))}
      </StyledTextContainer>
      {numberOfLines >= lineLimit && (
        <span>
          {showMore ? "" : "... "}[{" "}
          <StyledShowMore onClick={() => setShowMore(!showMore)}>
            {showMore ? " hide" : " show more"}
          </StyledShowMore>{" "}
          ]
        </span>
      )}
    </Typography>
  );
}

function TargetDescription({
  descriptions,
  loading = false,
  showLabel = true,
  targetId,
  lineLimit = 3,
}) {
  let content;

  if (!descriptions || descriptions.length < 1) {
    content = (
      <Typography variant="body2" gutterBottom>
        No description available
      </Typography>
    );
  } else {
    content = (
      <LongText
        lineLimit={lineLimit}
        descriptions={descriptions}
        targetId={targetId}
        hasGutterBottom
      />
    );
  }

  return (
    <>
      {showLabel && <Typography variant="subtitle2">Description</Typography>}
      {loading ? <Skeleton height="6.5rem" /> : content}
    </>
  );
}

export default TargetDescription;
