import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { Box, Drawer, IconButton, Typography } from "ui";
import { DownloadRow } from "../types/downloadTypes";
import AccessScriptBlock, { sectionLabelSx } from "./AccessScriptBlock";
import BasketRow from "./BasketRow";
import { RADIUS, shadow } from "./tokens";

interface BasketDrawerProps {
  open: boolean;
  onClose: () => void;
  rows: DownloadRow[];
  locationURLs: Record<string, string>;
  onRemove: (id: string) => void;
  onEmpty: () => void;
}

const DRAWER_WIDTH = 520;

const footerLinkSx = (theme: any) => ({
  border: 0,
  padding: 0,
  background: "none",
  cursor: "pointer",
  font: "inherit",
  fontSize: ".75rem",
  color: theme.palette.primary.main,
  "&:hover": { textDecoration: "underline" },
});

/**
 * Right-hand drawer listing the basket: one row per dataset with its file
 * location, then one access script covering all of them. The footer switches
 * to a "jump to script" variant once the list overflows.
 */
function BasketDrawer({ open, onClose, rows, locationURLs, onRemove, onEmpty }: BasketDrawerProps) {
  const n = rows.length;
  const noun = n === 1 ? "dataset" : "datasets";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      aria-labelledby="basket-drawer-title"
      slotProps={{ backdrop: { sx: { backgroundColor: "rgba(33,33,33,.38)" } } }}
      PaperProps={{
        sx: theme => ({
          width: DRAWER_WIDTH,
          maxWidth: "100vw",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: `${RADIUS} 0 0 ${RADIUS}`,
          boxShadow: shadow(theme, "lg"),
        }),
      }}
    >
      <Box
        component="header"
        sx={theme => ({
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
          padding: "18px 20px",
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            id="basket-drawer-title"
            component="h2"
            sx={theme => ({ fontSize: "1.2rem", fontWeight: 700, color: theme.palette.grey[800], m: 0 })}
          >
            Your dataset basket
          </Typography>
          <Typography sx={theme => ({ fontSize: ".75rem", color: theme.palette.grey[600] })}>
            {n} {noun}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close basket" size="small" sx={{ mt: -0.5, mr: -1 }}>
          <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <DrawerBody rows={rows} locationURLs={locationURLs} onRemove={onRemove} onEmpty={onEmpty} />
    </Drawer>
  );
}

type DrawerBodyProps = Pick<BasketDrawerProps, "rows" | "locationURLs" | "onRemove" | "onEmpty">;

/**
 * Scroll area + footer. A separate component so its effects run when it is
 * mounted inside the Drawer's portal (the Drawer's own children mount a
 * commit later than the Drawer itself, when refs would still be null).
 */
function DrawerBody({ rows, locationURLs, onRemove, onEmpty }: DrawerBodyProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, []);

  useLayoutEffect(measure, [measure, rows]);
  // The scroll container's own size is fixed by the drawer, so overflow
  // mostly changes when its content grows or shrinks (rows added, fonts
  // loading, the script block rendering) - observe both.
  useEffect(() => {
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(scrollEl);
    if (contentEl) observer.observe(contentEl);
    return () => observer.disconnect();
  }, [measure]);

  const jumpToScript = () => scriptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const n = rows.length;
  const noun = n === 1 ? "dataset" : "datasets";

  return (
    <>
      <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
        <Box ref={scrollRef} sx={{ height: "100%", overflowY: "auto" }}>
          <Box ref={contentRef}>
            <Typography
              component="h3"
              sx={theme => ({
                ...sectionLabelSx(theme),
                position: "sticky",
                top: 0,
                zIndex: 1,
                m: 0,
                padding: "12px 20px 6px",
                backgroundColor: "#fff",
                borderBottom: `1px solid ${theme.palette.grey[200]}`,
              })}
            >
              Datasets · file location
            </Typography>
            <Box component="ul" sx={{ m: 0, p: 0 }}>
              {rows.map(row => (
                <BasketRow key={row["@id"]} dataset={row} locationURLs={locationURLs} onRemove={onRemove} />
              ))}
            </Box>
            <Box ref={scriptRef}>
              <AccessScriptBlock rows={rows} locationURLs={locationURLs} />
            </Box>
          </Box>
        </Box>
        {overflowing && (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 40,
              pointerEvents: "none",
              background: "linear-gradient(to bottom, rgba(255,255,255,0), #fff)",
            }}
          />
        )}
      </Box>

      <Box
        component="footer"
        sx={theme => ({
          display: "flex",
          alignItems: "center",
          justifyContent: overflowing ? "flex-start" : "center",
          gap: 1,
          padding: "12px 20px",
          borderTop: `1px solid ${theme.palette.divider}`,
          fontSize: ".75rem",
        })}
      >
        {overflowing ? (
          <>
            <Typography component="span" sx={theme => ({ flex: 1, fontSize: ".75rem", color: theme.palette.grey[600] })}>
              {n} {noun} · access script below the list
            </Typography>
            <Box component="button" type="button" onClick={jumpToScript} sx={footerLinkSx}>
              Jump to script ↓
            </Box>
            <Typography component="span" sx={theme => ({ color: theme.palette.grey[500] })}>
              ·
            </Typography>
            <Box component="button" type="button" onClick={onEmpty} sx={footerLinkSx}>
              Empty basket
            </Box>
          </>
        ) : (
          <Box component="button" type="button" onClick={onEmpty} sx={footerLinkSx}>
            Empty basket
          </Box>
        )}
      </Box>
    </>
  );
}

export default BasketDrawer;
