import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Box, Typography } from "ui";
import { NetworkScope } from "../../types/downloadTypes";
import type { GraphController } from "../../graph/types";
import { CONTROL_BORDER, RADIUS } from "../tokens";

interface CanvasHeaderProps {
  scope: NetworkScope;
  basketCount: number;
  onScopeChange: (scope: NetworkScope) => void;
  hint: string;
  selectedLabel: string | null;
  onClearSelection: () => void;
  controller: GraphController | null;
}

/** The bar above the network canvas: scope switch, hint, selected chip and the canvas controls. */
function CanvasHeader({
  scope,
  basketCount,
  onScopeChange,
  hint,
  selectedLabel,
  onClearSelection,
  controller,
}: CanvasHeaderProps) {
  return (
    <Box
      sx={theme => ({
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1.5,
        padding: "10px 16px",
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: "#fff",
      })}
    >
      <BasketScopeSwitch scope={scope} basketCount={basketCount} onChange={onScopeChange} />
      <Typography component="span" sx={theme => ({ fontSize: ".75rem", color: theme.palette.grey[600] })}>
        {hint}
      </Typography>
      {selectedLabel && <SelectedChip label={selectedLabel} onClear={onClearSelection} />}
      <Box sx={{ flex: 1 }} />
      <CanvasControls controller={controller} />
    </Box>
  );
}

/* ------------------------------------------------------------------ */

interface BasketScopeSwitchProps {
  scope: NetworkScope;
  basketCount: number;
  onChange: (scope: NetworkScope) => void;
}

export function BasketScopeSwitch({ scope, basketCount, onChange }: BasketScopeSwitchProps) {
  const basketDisabled = basketCount === 0;
  const optionSx = (selected: boolean, disabled = false) => (theme: any) => ({
    font: "inherit",
    fontSize: ".8125rem",
    lineHeight: 1.2,
    padding: "3px 10px",
    borderRadius: RADIUS,
    cursor: disabled ? "default" : "pointer",
    border: `1px solid ${selected ? CONTROL_BORDER : "transparent"}`,
    backgroundColor: selected ? theme.palette.grey[50] : "transparent",
    color: disabled
      ? theme.palette.grey[400]
      : selected
        ? theme.palette.primary.dark
        : theme.palette.text.primary,
    fontWeight: selected ? 500 : 400,
    whiteSpace: "nowrap",
    "&:hover": selected || disabled ? undefined : { backgroundColor: theme.palette.grey[300] },
  });

  return (
    <Box
      role="radiogroup"
      aria-label="Datasets shown"
      sx={theme => ({
        display: "inline-flex",
        gap: "3px",
        padding: "3px 5px",
        borderRadius: RADIUS,
        backgroundColor: theme.palette.grey[200],
      })}
    >
      <Box
        component="button"
        type="button"
        role="radio"
        aria-checked={scope === "all"}
        onClick={() => onChange("all")}
        sx={optionSx(scope === "all")}
      >
        All datasets
      </Box>
      <Box
        component="button"
        type="button"
        role="radio"
        aria-checked={scope === "basket"}
        aria-disabled={basketDisabled || undefined}
        onClick={() => {
          if (!basketDisabled) onChange("basket");
        }}
        sx={optionSx(scope === "basket", basketDisabled)}
      >
        {basketDisabled ? "Basket" : `Basket · ${basketCount}`}
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */

export function SelectedChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Box
      sx={theme => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        height: 24,
        padding: "0 4px 0 10px",
        borderRadius: "12px",
        border: `1px solid ${theme.palette.primary.dark}`,
        color: theme.palette.primary.dark,
        backgroundColor: "#fff",
        fontSize: ".75rem",
        whiteSpace: "nowrap",
        maxWidth: 320,
      })}
    >
      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        Selected: {label}
      </Box>
      <Box
        component="button"
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          border: 0,
          padding: 0,
          borderRadius: "50%",
          background: "none",
          color: "inherit",
          cursor: "pointer",
          fontSize: 11,
          "&:hover": { backgroundColor: "rgba(31,82,121,.1)" },
        }}
      >
        <FontAwesomeIcon icon={faXmark} />
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */

export function CanvasControls({ controller }: { controller: GraphController | null }) {
  const buttonSx = (theme: any) => ({
    font: "inherit",
    fontSize: ".8125rem",
    lineHeight: 1.2,
    padding: "5px 10px",
    border: `1px solid ${CONTROL_BORDER}`,
    marginLeft: "-1px",
    backgroundColor: "#fff",
    color: theme.palette.text.primary,
    cursor: "pointer",
    whiteSpace: "nowrap",
    "&:first-of-type": { marginLeft: 0, borderRadius: `${RADIUS} 0 0 ${RADIUS}` },
    "&:last-of-type": { borderRadius: `0 ${RADIUS} ${RADIUS} 0` },
    "&:hover": { backgroundColor: theme.palette.grey[100] },
    "&:disabled": { opacity: 0.45, cursor: "default" },
  });
  const disabled = !controller;
  return (
    <Box role="group" aria-label="Canvas controls" sx={{ display: "inline-flex" }}>
      <Box component="button" type="button" aria-label="Zoom out" disabled={disabled} onClick={() => controller?.zoomOut()} sx={buttonSx}>
        −
      </Box>
      <Box component="button" type="button" aria-label="Zoom in" disabled={disabled} onClick={() => controller?.zoomIn()} sx={buttonSx}>
        +
      </Box>
      <Box component="button" type="button" disabled={disabled} onClick={() => controller?.fit()} sx={buttonSx}>
        Fit
      </Box>
    </Box>
  );
}

export default CanvasHeader;
