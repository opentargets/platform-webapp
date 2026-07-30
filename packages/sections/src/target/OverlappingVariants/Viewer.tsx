import { createViewer } from "3dmol";
import { useStateValue, useActions } from "./Context";
import { useState, useEffect, useRef } from "react";
import { ViewerLegend, Box, Typography, Button } from "ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import {
  setNoHoverStyle,
  highlightVariants,
  highlightVariantFromTable,
  onClickCapture,
} from "./viewerHandlers";

export default function Viewer() {
  const viewerHeight = "480px";

  const viewerRef = useRef(null);

  const [messageText, setMessageText] = useState("Loading structure ...");
  const [structureData, setStructureData] = useState(null);
  const [atomInfo, setAtomInfo] = useState(null);

  const { state, filteredRows } = useStateValue();
  const { setStartPosition, setUniprotId } = useActions();
  const { setViewer } = useActions();

  // fetch structure data
  useEffect(() => {
    async function fetchStructure() {
      async function fetchStructureFile(uniprotId) {
        const pdbUri = `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v6.cif`;
        try {
          const response = await fetch(pdbUri);
          if (response?.ok) return response;
        } catch (error) {}
      }
      const uniprotIds = [
        ...(state.data.proteinCodingCoordinates?.rows?.[0]?.uniprotAccessions ?? []),
      ];
      let currentUniprotId = null;
      let alphaFoldResponse = null;
      while (!alphaFoldResponse && uniprotIds.length) {
        currentUniprotId = uniprotIds.shift();
        alphaFoldResponse = await fetchStructureFile(currentUniprotId);
      }
      if (alphaFoldResponse) {
        setStructureData(await alphaFoldResponse.text());
        setUniprotId(currentUniprotId);
      } else {
        setMessageText("Structure data not available");
      }
    }
    fetchStructure();
  }, [state.data.proteinCodingCoordinates]);

  // view structure
  useEffect(() => {
    let viewer;
    if (structureData && viewerRef.current) {
      function setupViewer() {
        viewer = createViewer(viewerRef.current.querySelector(".viewerContainer"), {
          backgroundColor: "#f8f8f8",
          antialias: true,
          cartoonQuality: 10,
        });
        window.viewer = viewer; // !! REMOVE !!
        setViewer(viewer);
        // viewerRef.current.__viewer__ = viewer;
        const hoverDuration = 10;
        // viewer.getCanvas().ondblclick = () => resetViewer(viewer, 200); // use ondblclick so replaces existing
        viewer.addModel(structureData, "cif");
        viewer.setHoverDuration(hoverDuration);
        // const hoverArgs = hoverManagerFactory({ viewer, atomInfoRef });
        // const hideAtomInfo = hoverArgs[3];
        // viewer.getCanvas().onmouseleave = () => {
        //   setTimeout(hideAtomInfo, hoverDuration + 50);
        // };
        // viewer.setHoverable(...hoverArgs);
        setNoHoverStyle(viewer);
        // viewer.addSurface(
        //   "VDW",
        //   {
        //     opacity: 1,
        //     opacity: 0.65,
        //     color: "#fff",
        //     // color: {'prop': 'b', map:elementColors.greenCarbon}
        //   },
        //   {}
        // );
        const viewerAtoms = viewer.getModel().selectedAtoms();
        viewer.__atomsByResi__ = Map.groupBy(viewerAtoms, atom => atom.resi);
        viewer.__highlightedResis__ = new Map();
        viewer.__extraHighlightedResi__ = null;
        highlightVariants(viewer, filteredRows);
        // resetViewer(viewer);
        // viewer.zoom(0.2);
        viewer.render();
        setMessageText("");
      }
      setupViewer();
      return () => {
        // hideAtomInfo();
        viewer?.clear();
      };
    }
    // !! DODGY TO LOCAL VARIABLE AS DE. HOW SHOLD KNOW WHEN REQUEST FULFILLED?
  }, [structureData]);

  // highlight variants
  useEffect(() => {
    if (state.viewer) {
      highlightVariants(state.viewer, filteredRows, setStartPosition);
    }
  }, [state.viewer, filteredRows]);

  // (un)highlight variant corresponding to (un)hovered
  useEffect(() => {
    highlightVariantFromTable(state.viewer, state.hoveredRow.at(-1));
  }, [state.viewer, state.hoveredRow]);

  return (
    <Box ref={viewerRef} position="relative" width="100%">
      {!messageText && (
        <Box
          sx={{
            top: 0,
            right: 0,
            position: "absolute",
            zIndex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "white",
            m: 1,
          }}
        >
          <Button
            sx={{ display: "flex", gap: 1 }}
            onClick={() => onClickCapture(viewerRef, state.data.id)}
          >
            <FontAwesomeIcon icon={faCamera} /> Screenshot
          </Button>
        </Box>
      )}
      <Box
        className="viewerContainer"
        position="relative"
        width="100%"
        height={viewerHeight}
        mb={1}
      />
      <ViewerLegend />
      {atomInfo && (
        <Box
          position="absolute"
          bottom={0}
          right={0}
          p="0.6rem 0.8rem"
          zIndex={10}
          bgcolor="#f8f8f8c8"
          sx={{ borderTopLeftRadius: "0.2rem", pointerEvents: "none" }}
          fontSize={14}
        >
          <Box display="flex" flexDirection="column">
            {JSON.stringify(atomInfo)}
            {/* <Typography variant="caption" component="p" textAlign="right" />
            <Typography variant="caption" component="p" textAlign="right" /> */}
          </Box>
        </Box>
      )}
      {messageText && (
        <Typography
          variant="body2"
          component="div"
          sx={{
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            position: "absolute",
            zIndex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f8f8f8",
          }}
        >
          {messageText}
        </Typography>
      )}
    </Box>
  );
}
