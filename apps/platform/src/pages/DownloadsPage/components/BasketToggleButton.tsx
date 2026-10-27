import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Box, Button } from "ui";
import { RADIUS } from "./tokens";

interface BasketToggleButtonProps {
  inBasket: boolean;
  onToggle: () => void;
  /** `button` (cards, popover, panel) or `text` (link-style, for connected rows) */
  variant?: "button" | "text";
  /** Label used while not in the basket; the hover popover uses "Add to basket" */
  addLabel?: string;
  /** Spoken name of the dataset, so the button reads "Add X to basket" */
  datasetName?: string;
  stopPropagation?: boolean;
}

/**
 * Adds a dataset to the basket or takes it out again. Outlined `+ Add` when
 * out, filled primary.dark `✓ In basket` when in; `aria-pressed` tracks it.
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
      ? `Remove ${datasetName} from basket`
      : `Add ${datasetName} to basket`
    : undefined;

  if (variant === "text") {
    return (
      <Box
        component="button"
        type="button"
        onClick={handleClick}
        aria-pressed={inBasket}
        aria-label={ariaLabel}
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
        <FontAwesomeIcon icon={inBasket ? faCheck : faPlus} style={{ fontSize: 10 }} />
        {inBasket ? "In basket" : addLabel}
      </Box>
    );
  }

  return (
    <Button
      onClick={handleClick}
      aria-pressed={inBasket}
      aria-label={ariaLabel}
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
      <FontAwesomeIcon icon={inBasket ? faCheck : faPlus} style={{ fontSize: 11 }} />
      {inBasket ? "In basket" : addLabel}
    </Button>
  );
}

export default BasketToggleButton;
