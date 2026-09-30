import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button } from "@mui/material";
import { createViewer } from "3dmol";
import { useEffect, useRef, useState } from "react";
import { Tooltip, useViewerInteractionDispatch, useViewerInteractionState, ViewerTrack } from "ui";
import { useViewerDispatch, useViewerState } from "../../providers/ViewerProvider";
import { onClickCapture } from "./helpers";
import Usage from "./Usage";

const hoverDuration = 0;

// !!!!! ADD PROP TYPES !!!!!

export default function Viewer({
  height = "400px",
  data,
  onData,
  onDblClick,
  onFirstDraw,
  onDraw,
  drawAppearance = [],
  hoverSelection = {},
  hoverAppearance = [],
  clickSelection = {},
  clickAppearance = [],
  trackColor,
  trackTicks,
  usage = {},
  topLeft,
  bottomRight,
  zoomLimit = [20, 500],
  screenshotId = "",
}) {
  const [viewer, setViewer] = useState(null);
  const viewerState = useViewerState();
  const viewerDispatch = useViewerDispatch();
  const viewerInteractionState = useViewerInteractionState();
  const viewerInteractionDispatch = useViewerInteractionDispatch();
  const viewerRef = useRef(null);
  const hoverTimeout = useRef(null);
  const tempHoveredResi = useRef(null);
  const oldHoveredResi = useRef(null);
  const oldClickedResi = useRef(null);
  const clickHandled = useRef(false);
  const manipulating = useRef(false);
  const startedManipulating = useRef(0);

  function resolveProperty(appearance, propertyName, ...args) {
    let value = appearance[propertyName];
    if (!value && propertyName === "selection") value = {};
    return typeof value === "function" ? value(...args) : value;
  }

  function applyAppearance(
    appearance,
    resi = null // only non-null for click/hover on structure (not track) appearance changes
  ) {
    const resolvedSelection = resolveProperty(appearance, "selection", viewerState, resi);
    const resolvedStyle = resolveProperty(appearance, "style", viewerState, resi);
    if (resolvedSelection && resolvedStyle) {
      viewer[appearance.addStyle ? "addStyle" : "setStyle"](resolvedSelection, resolvedStyle);
    }
  }

  function getEventSelection(selection) {
    return typeof selection === "function" ? selection(viewerState) : selection;
  }

  // keep ref in sync
  useEffect(() => {
    tempHoveredResi.current = viewerInteractionState.hoveredResi;
  }, [viewerInteractionState.hoveredResi]);

  // create viewer and load data
  useEffect(() => {
    let _viewer;

    if (data && viewerRef.current) {
      // create viewer
      _viewer = createViewer(viewerRef.current, {
        backgroundColor: "#f8f8f8",
        antialias: true,
        cartoonQuality: 10,
        lowerZoomLimit: zoomLimit[0],
        upperZoomLimit: zoomLimit[1],
      });
      _viewer._firstDraw = true;
      _viewer.setHoverDuration(hoverDuration);

      // disable wheel-zoom
      setViewer(_viewer);
      _viewer.getCanvas().addEventListener(
        "wheel",
        (event) => {
          if (!event.ctrlKey) event.stopImmediatePropagation();
        },
        true // use capture phase so fires before library handler
      );

      // load data into viewer`
      data.map(({ structureData }) => _viewer.addModel(structureData, "cif"));
      onData?.(_viewer, viewerDispatch);

      // set state viewer after load data - since state groups atoms by resi
      viewerDispatch({ type: "_setViewer", value: _viewer });
    }

    // interaction
    if (viewerInteractionState) {
      // disable hover when mousedown
      _viewer.getCanvas().addEventListener("mousedown", (event) => {
        manipulating.current = true;
        startedManipulating.current = Date.now();
      });
      _viewer.getCanvas().addEventListener("mouseup", (event) => {
        viewerInteractionDispatch({ type: "setHoveredResi", value: null });
        manipulating.current = false;
      });

      // click event on canvas for 'click off' events
      _viewer.getCanvas().addEventListener("click", (event) => {
        setTimeout(() => {
          if (
            !clickHandled.current &&
            Date.now() - startedManipulating.current < 250 // click rather than manipulate structure
          ) {
            viewerInteractionDispatch({ type: "setClickedResi", value: null });
          }
          clickHandled.current = false;
        }, 0);
      });

      // click
      if (clickSelection) {
        const sel = getEventSelection(clickSelection);
        if (sel && clickAppearance?.length > 0) {
          _viewer.setClickable(sel, true, (atom) => {
            viewerInteractionDispatch({ type: "setClickedResi", value: +atom.resi });
            clickHandled.current = true;
          });
        }
      }

      // hover
      if (hoverSelection) {
        const sel = getEventSelection(hoverSelection);
        if (sel && hoverAppearance?.length > 0) {
          _viewer.setHoverable(
            sel,
            true,
            // use tempHoveredResi and setTimeout to prevent flicker when hover aross
            // different atoms on same residue
            (atom) => {
              if (hoverTimeout.current) {
                clearTimeout(hoverTimeout.current);
                hoverTimeout.current = null;
              }
              if (!manipulating.current && viewerInteractionState.hoveredResi !== +atom.resi) {
                viewerInteractionDispatch({ type: "setHoveredResi", value: +atom.resi });
                // tempHoveredResi.current = +atom.resi;
              }
            },
            (atom) => {
              hoverTimeout.current = setTimeout(() => {
                if (
                  !manipulating.current &&
                  // viewerInteractionState.hoveredResi === +atom.resi //&&
                  tempHoveredResi.current === +atom.resi
                ) {
                  viewerInteractionDispatch({ type: "setHoveredResi", value: null });
                  tempHoveredResi.current = null;
                }
                hoverTimeout.current = null;
              }, 50);
            }
          );
          _viewer.render(); // required to reactivate hover
        }
      }

      // clear hover when leave canvas
      _viewer.getCanvas().onmouseleave = () => {
        setTimeout(() => {
          viewerInteractionDispatch({ type: "setHoveredResi", value: null });
        }, hoverDuration + 50);
      };
    }

    return () => _viewer.clear();
  }, []);

  // double click callback
  useEffect(() => {
    if (!viewer || !onDblClick) return;
    viewer.getCanvas().addEventListener("dblclick", (event) => {
      onDblClick(viewerState);
    });
  }, [viewer]);

  // update for change in clicked resi
  useEffect(() => {
    if (!viewer || !viewerInteractionState) return;

    // unclick
    if (oldClickedResi.current) {
      let anyUsed = false;
      for (const appearance of clickAppearance) {
        for (const leaveAppearance of appearance.leave || []) {
          const a = { ...leaveAppearance };
          const resi = Number(oldClickedResi.current);
          if (!a.use || a.use(viewerState, resi)) {
            if (!a.selection) a.selection = { resi };
            applyAppearance(a, resi);
            a.onApply?.(viewerState, resi, viewerInteractionState, viewerInteractionDispatch);
            anyUsed = true;
          }
        }
      }
      if (anyUsed) viewer.render();
    }

    // click
    if (viewerInteractionState.clickedResi) {
      let anyUsed = false;
      for (const appearance of clickAppearance) {
        const a = { ...appearance };
        const resi = Number(viewerInteractionState.clickedResi);
        if (!a.use || a.use(viewerState, resi)) {
          if (!a.selection) a.selection = { resi };
          applyAppearance(a, resi);
          a.onApply?.(viewerState, resi, viewerInteractionState, viewerInteractionDispatch);
          anyUsed = true;
        }
      }
      if (anyUsed) viewer.render();
    }

    oldClickedResi.current = viewerInteractionState.clickedResi;
  }, [viewer, viewerInteractionState?.clickedResi]);

  // update for change in hovered resi
  useEffect(() => {
    if (!viewer || !viewerInteractionState) return;

    // unhover
    if (oldHoveredResi.current) {
      let anyUsed = false;
      for (const appearance of hoverAppearance) {
        for (const leaveAppearance of appearance.leave || []) {
          const a = { ...leaveAppearance };
          const resi = Number(oldHoveredResi.current);
          if (!a.use || a.use(viewerState, resi)) {
            if (!a.selection) a.selection = { resi };
            applyAppearance(a, resi);
            a.onApply?.(viewerState, resi, viewerInteractionState, viewerInteractionDispatch);
            anyUsed = true;
          }
        }
      }
      if (anyUsed) viewer.render();
    }

    // hover
    if (viewerInteractionState.hoveredResi) {
      let anyUsed = false;
      for (const appearance of hoverAppearance) {
        const a = { ...appearance };
        const resi = Number(viewerInteractionState.hoveredResi);
        if (!a.use || a.use(viewerState, resi)) {
          if (!a.selection) a.selection = { resi };
          applyAppearance(a, resi);
          a.onApply?.(viewerState, resi, viewerInteractionState, viewerInteractionDispatch);
          anyUsed = true;
        }
      }
      if (anyUsed) viewer.render();
    }

    oldHoveredResi.current = viewerInteractionState.hoveredResi;
  }, [viewer, viewerInteractionState?.hoveredResi]);

  // draw/redraw
  useEffect(() => {
    if (!viewer) return;
    for (const appearance of drawAppearance) {
      if (!appearance.use || appearance.use(viewerState)) {
        applyAppearance(appearance);
      }
    }
    if (onFirstDraw && viewer._firstDraw) {
      onFirstDraw(viewerState);
      viewer._firstDraw = false;
    }
    onDraw?.(viewerState);
    viewer.render();
  }, [viewerState]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {/* track */}
      {trackColor && <ViewerTrack trackColor={trackColor} trackTicks={trackTicks} />}

      {/* viewer */}
      <Box
        ref={viewerRef}
        sx={{
          position: "relative",
          width: "100%",
          height,
          resize: "vertical",
          overflow: "hidden",
        }}
      >
        {/* // position="relative" width="100%" height={height} sx={{resize: "vertical", overflow: "hidden"}}> */}
        {/* info and screenshot button */}
        <Box
          sx={{
            top: 0,
            right: 0,
            position: "absolute",
            zIndex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            m: 1,
            gap: 1,
          }}
        >
          {/* usage popup button */}
          <Usage instructions={usage} />

          {/* screenshot button */}
          <Tooltip title="Screenshot" placement="top-start">
            <Button
              sx={{
                display: "flex",
                gap: 1,
                bgcolor: "white",
                "&:hover": {
                  bgcolor: "#f8f8f8d8",
                },
              }}
              onClick={() => onClickCapture(viewerRef, screenshotId)}
            >
              <FontAwesomeIcon icon={faCamera} />
            </Button>
          </Tooltip>
        </Box>

        {/* top-left info box */}
        {topLeft && (
          <Box
            position="absolute"
            top={0}
            left={0}
            height="50%" // stops jumping when canvas overlaps top/bottom of window
            display="flex"
            alignItems="start"
            zIndex={100}
            sx={{ pointerEvents: "none" }}
          >
            {topLeft}
          </Box>
        )}

        {/* bottom-right info box */}
        {bottomRight && (
          <Box
            position="absolute"
            bottom={0}
            right={0}
            height="50%" // stops jumping when canvas overlaps top/bottom of window
            display="flex"
            alignItems="end"
            zIndex={100}
            sx={{ pointerEvents: "none" }}
          >
            {bottomRight}
          </Box>
        )}
      </Box>
    </Box>
  );
}
