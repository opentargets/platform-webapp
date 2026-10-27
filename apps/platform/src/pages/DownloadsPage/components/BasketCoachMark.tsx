import { RefObject, useState } from "react";
import { Box, Button, Popper, Typography } from "ui";
import { RADIUS } from "./tokens";

interface BasketCoachMarkProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement>;
  onOpenBasket: () => void;
  onDismiss: () => void;
}

/**
 * One-time hint shown under the BasketButton on the very first add. Dark
 * card with a pointer, two actions. Persistence of "seen" is the caller's job.
 */
function BasketCoachMark({ open, anchorRef, onOpenBasket, onDismiss }: BasketCoachMarkProps) {
  const [arrowEl, setArrowEl] = useState<HTMLElement | null>(null);

  if (!anchorRef.current) return null;

  return (
    <Popper
      open={open}
      anchorEl={anchorRef.current}
      placement="bottom-end"
      role="dialog"
      aria-labelledby="basket-coach-title"
      modifiers={[
        { name: "offset", options: { offset: [0, 12] } },
        { name: "arrow", options: { element: arrowEl, padding: 8 } },
      ]}
      sx={theme => ({
        // ui/Popper paints a white bordered box; this one is a dark card
        border: 0,
        background: "transparent",
        zIndex: theme.zIndex.modal - 1,
        '&[data-popper-placement*="bottom"] .coach-arrow': { top: -6 },
      })}
    >
      <Box
        ref={setArrowEl}
        className="coach-arrow"
        aria-hidden
        sx={theme => ({
          position: "absolute",
          width: 12,
          height: 12,
          transform: "rotate(45deg)",
          backgroundColor: theme.palette.grey[800],
        })}
      />
      <Box
        sx={theme => ({
          width: 300,
          padding: "14px 16px",
          borderRadius: RADIUS,
          backgroundColor: theme.palette.grey[800],
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        })}
      >
        <Typography id="basket-coach-title" component="h3" sx={{ fontSize: ".875rem", fontWeight: 600, m: 0 }}>
          Added to your basket
        </Typography>
        <Typography sx={{ fontSize: ".8125rem", opacity: 0.9, lineHeight: 1.45 }}>
          Collect the datasets you need here, then copy file locations and one access script for all of
          them.
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
          <Button
            onClick={onOpenBasket}
            variant="contained"
            disableElevation
            sx={theme => ({
              backgroundColor: "#fff",
              borderColor: "#fff",
              color: theme.palette.grey[800],
              fontSize: ".8125rem",
              fontWeight: 500,
              borderRadius: RADIUS,
              minHeight: 30,
              height: 30,
              "&:hover": { backgroundColor: theme.palette.grey[100] },
            })}
          >
            Open basket
          </Button>
          <Button
            onClick={onDismiss}
            variant="outlined"
            sx={{
              borderColor: "rgba(255,255,255,.4)",
              color: "#fff",
              fontSize: ".8125rem",
              borderRadius: RADIUS,
              minHeight: 30,
              height: 30,
              "&:hover": { borderColor: "#fff", backgroundColor: "rgba(255,255,255,.08)" },
            }}
          >
            Keep browsing
          </Button>
        </Box>
      </Box>
    </Popper>
  );
}

export default BasketCoachMark;
