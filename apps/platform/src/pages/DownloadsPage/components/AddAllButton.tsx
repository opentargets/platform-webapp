import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faCheck } from "@fortawesome/free-solid-svg-icons";
import { Button } from "ui";
import { DISABLED_SX, RADIUS } from "./tokens";

interface AddAllButtonProps {
  /** How many of the shown datasets are not in the basket yet */
  missingCount: number;
  onAddAll: () => void;
}

/** Adds every shown dataset that isn't already in the basket; reads `✓ All in basket` once none are missing. */
function AddAllButton({ missingCount, onAddAll }: AddAllButtonProps) {
  const allIn = missingCount === 0;
  return (
    <Button
      variant="outlined"
      onClick={onAddAll}
      disabled={allIn}
      aria-disabled={allIn}
      sx={theme => ({
        fontSize: ".875rem",
        fontWeight: 500,
        minHeight: 32,
        height: 32,
        padding: "5px 12px",
        gap: 1,
        borderRadius: RADIUS,
        whiteSpace: "nowrap",
        backgroundColor: "#fff",
        borderColor: theme.palette.primary.dark,
        color: theme.palette.primary.dark,
        "&.Mui-disabled": {
          ...DISABLED_SX,
          borderColor: theme.palette.primary.dark,
          color: theme.palette.primary.dark,
        },
      })}
    >
      <FontAwesomeIcon icon={allIn ? faCheck : faBagShopping} style={{ width: 13, height: 15 }} />
      {allIn ? "All in basket" : `+ Add all ${missingCount} to basket`}
    </Button>
  );
}

export default AddAllButton;
