import { forwardRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping } from "@fortawesome/free-solid-svg-icons";
import { Box } from "ui";
import CountBadge from "./CountBadge";
import { CONTROL_BORDER, RADIUS } from "./tokens";

interface BasketButtonProps {
  count: number;
  open: boolean;
  onClick: () => void;
  /** Ring shown while the coach mark points at this button */
  highlighted?: boolean;
}

/** The toolbar's basket trigger (Figma `Button / Type=Basket`) with its count badge. */
const BasketButton = forwardRef<HTMLButtonElement, BasketButtonProps>(function BasketButton(
  { count, open, onClick, highlighted = false },
  ref
) {
  return (
    <Box
      ref={ref}
      component="button"
      type="button"
      onClick={onClick}
      aria-label={`Basket, ${count} ${count === 1 ? "dataset" : "datasets"}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      sx={theme => ({
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        minHeight: 32,
        padding: "5px 12px",
        borderRadius: RADIUS,
        font: "inherit",
        fontSize: ".875rem",
        fontWeight: 500,
        lineHeight: 1.2,
        cursor: "pointer",
        color: theme.palette.primary.dark,
        border: `1px solid ${open ? theme.palette.primary.dark : CONTROL_BORDER}`,
        backgroundColor: open ? theme.palette.grey[100] : "transparent",
        transition: "background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
        boxShadow: highlighted ? `0 0 0 3px ${theme.palette.primary.light}` : "none",
        "&:hover": { backgroundColor: theme.palette.grey[100] },
      })}
    >
      <FontAwesomeIcon icon={faBagShopping} style={{ width: 14, height: 16 }} />
      Basket
      <CountBadge count={count} />
    </Box>
  );
});

export default BasketButton;
