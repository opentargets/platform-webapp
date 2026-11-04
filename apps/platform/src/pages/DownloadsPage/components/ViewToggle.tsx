import { ToggleButton, ToggleButtonGroup } from "ui";
import { DownloadsView } from "../types/downloadTypes";
import { CONTROL_BORDER, RADIUS } from "./tokens";

interface ViewToggleProps {
  view: DownloadsView;
  onViewChange: (view: DownloadsView) => void;
}

/** Segmented `Cards | Network` control: a grey track with the selected option raised on it. */
function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <ToggleButtonGroup
      exclusive
      value={view}
      onChange={(_, next: DownloadsView | null) => {
        if (next) onViewChange(next);
      }}
      aria-label="View"
      sx={theme => ({
        backgroundColor: theme.palette.grey[200],
        padding: "4px 6px",
        borderRadius: RADIUS,
        gap: "4px",
        "& .MuiToggleButtonGroup-grouped": {
          margin: 0,
          border: "1px solid transparent",
          borderRadius: RADIUS,
          "&:not(:first-of-type), &:not(:last-of-type)": { borderRadius: RADIUS },
        },
        "& .MuiToggleButton-root": {
          textTransform: "none",
          fontSize: ".875rem",
          fontWeight: 400,
          lineHeight: 1.2,
          minHeight: 32,
          padding: "4px 14px",
          color: theme.palette.text.primary,
          backgroundColor: "transparent",
          "&:hover": { backgroundColor: theme.palette.grey[300] },
          "&.Mui-selected, &.Mui-selected:hover": {
            borderColor: CONTROL_BORDER,
            backgroundColor: theme.palette.grey[50],
            color: theme.palette.primary.dark,
            fontWeight: 500,
          },
        },
      })}
    >
      <ToggleButton value="cards">Cards</ToggleButton>
      <ToggleButton value="network">Network</ToggleButton>
    </ToggleButtonGroup>
  );
}

export default ViewToggle;
