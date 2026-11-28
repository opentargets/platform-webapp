import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { Box, Button } from "ui";
import BagPlusIcon from "./BagPlusIcon";
import { RADIUS } from "./tokens";

interface BasketToggleButtonProps {
  inBasket: boolean;
  onToggle: () => void;
  /** `button` (cards, popover, panel) or `text` (link-style, for connected rows) */
  variant?: "button" | "text";
  /** Label used while not in the bag; the hover popover uses "Add to bag" */
  addLabel?: string;
  /** Spoken name of the dataset, so the button reads "Add X to bag" */
  datasetName?: string;
  stopPropagation?: boolean;
}

/**
 * Adds a dataset to the bag or takes it out again. Outlined bag-plus `Add` when
 * out, filled primary.dark `✓ In bag` when in; `aria-pressed` tracks it.
 */
function BasketToggleButton({
  inBasket,
  onToggle,
  variant = "button",
  addLabel = "Add",
  datasetName,
  stopPropagation = false,
}: BasketToggleButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    onToggle();
  };
  const ariaLabel = datasetName
    ? inBasket
      ? `Remove ${datasetName} from bag`
      : `Add ${datasetName} to bag`
    : undefined;

  if (variant === "text") {
    return (
      <Box
        component="button"
        type="button"
        onClick={handleClick}
        aria-pressed={inBasket}
        aria-label={ariaLabel}
        data-testid="basket-toggle"
        sx={{
          background: "none",
          border: 0,
          padding: 0,
          cursor: "pointer",
          font: "inherit",
          fontSize: ".75rem",
          whiteSpace: "nowrap",
          flex: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          color: theme => (inBasket ? theme.palette.primary.dark : theme.palette.primary.main),
          "&:hover": { textDecoration: "underline" },
        }}
      >
        {inBasket ? <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10 }} /> : <BagPlusIcon size={12} />}
        {inBasket ? "In bag" : addLabel}
      </Box>
    );
  }

  return (
    <Button
      onClick={handleClick}
      aria-pressed={inBasket}
      aria-label={ariaLabel}
      data-testid="basket-toggle"
      variant={inBasket ? "contained" : "outlined"}
      disableElevation
      sx={theme => ({
        fontSize: ".8125rem",
        minHeight: 30,
        height: 30,
        padding: "4px 10px",
        whiteSpace: "nowrap",
        flex: "none",
        borderRadius: RADIUS,
        gap: 0.75,
        lineHeight: 1.2,
        ...(inBasket
          ? {
              backgroundColor: theme.palette.primary.dark,
              borderColor: theme.palette.primary.dark,
              color: "#fff",
              "&:hover": { backgroundColor: theme.palette.primary.dark, opacity: 0.92 },
            }
          : { color: theme.palette.text.primary }),
      })}
    >
      {inBasket ? <FontAwesomeIcon icon={faCheck} style={{ fontSize: 11 }} /> : <BagPlusIcon size={14} />}
      {inBasket ? "In bag" : addLabel}
    </Button>
  );
}

export default BasketToggleButton;
