import { Box } from "ui";
import { BADGE_COLOR, MONO_FONT } from "./tokens";

interface CountBadgeProps {
  count: number;
}

/**
 * The red count pill pinned to the BasketButton's top-right corner. Only
 * rendered for a non-zero count. Keeps content-box sizing on purpose so the
 * 2px white border adds to the 18px box, matching the mock.
 */
function CountBadge({ count }: CountBadgeProps) {
  if (count <= 0) return null;
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        position: "absolute",
        top: -8,
        right: -8,
        boxSizing: "content-box",
        minWidth: 18,
        height: 18,
        padding: "0 4px",
        borderRadius: "9px",
        backgroundColor: BADGE_COLOR,
        border: "2px solid #fff",
        color: "#fff",
        fontFamily: MONO_FONT,
        fontSize: ".6875rem",
        lineHeight: "18px",
        textAlign: "center",
        fontWeight: 500,
      }}
    >
      {count}
    </Box>
  );
}

export default CountBadge;
