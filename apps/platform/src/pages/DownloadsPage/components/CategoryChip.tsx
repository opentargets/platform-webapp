import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Box, Tooltip } from "ui";
import CategoryDot from "./CategoryDot";
import { MONO_FONT } from "./tokens";

interface CategoryChipProps {
  category: string;
  /** Matches for the current search, before category filtering */
  count: number;
  active: boolean;
  onToggle: () => void;
}

/**
 * Multi-select category filter pill. A zero count disables it; a selected chip
 * with a zero count stays selected (dimmed) so the user can see the filter is
 * what's hiding results, and its ✕ still removes it.
 */
function CategoryChip({ category, count, active, onToggle }: CategoryChipProps) {
  const noMatches = count === 0;
  const disabled = noMatches && !active;

  const chip = (
    <Box
      component="button"
      type="button"
      role="checkbox"
      aria-checked={active}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onToggle();
      }}
      sx={theme => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        height: 24,
        padding: "0 10px",
        borderRadius: "12px",
        font: "inherit",
        fontSize: ".8125rem",
        lineHeight: 1,
        whiteSpace: "nowrap",
        cursor: disabled ? "default" : "pointer",
        opacity: noMatches ? 0.45 : 1,
        transition: "background-color 120ms ease, border-color 120ms ease",
        ...(active
          ? {
              backgroundColor: theme.palette.primary.dark,
              border: `1px solid ${theme.palette.primary.dark}`,
              color: "#fff",
              fontWeight: 500,
            }
          : {
              backgroundColor: "#fff",
              border: `1px solid ${theme.palette.grey[300]}`,
              color: theme.palette.text.primary,
              "&:hover": disabled ? undefined : { borderColor: theme.palette.grey[500] },
            }),
      })}
    >
      <CategoryDot category={category} />
      {category}
      <Box
        component="span"
        sx={theme => ({
          fontFamily: MONO_FONT,
          fontSize: ".6875rem",
          color: active ? "rgba(255,255,255,.8)" : theme.palette.grey[500],
        })}
      >
        {count}
      </Box>
      {active && <FontAwesomeIcon icon={faXmark} style={{ fontSize: 11 }} aria-hidden />}
    </Box>
  );

  if (disabled) {
    return (
      <Tooltip title="No matches for this search" arrow>
        <span style={{ display: "inline-flex" }}>{chip}</span>
      </Tooltip>
    );
  }
  return chip;
}

export default CategoryChip;
