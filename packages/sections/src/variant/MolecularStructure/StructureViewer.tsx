import {
  Viewer,
  ViewerRadios,
  ViewerDropdown,
  ViewerLegend,
  useViewerState,
  useViewerDispatch,
  Box,
  Typography,
} from "ui";
import {
  alphaFoldCifUrl,
  fetchPathogenicityScores,
  meanPathogenicityScores,
  pickPathogenicityScore,
  fetchDomains,
  processDomains,
  safeFetch,
} from "@ot/utils";
import { useEffect, useState } from "react";
import { trackColor } from "ui/src/components/Viewer/helpers";
import {
  dataHandler,
  drawAppearance,
  hoverAppearance,
  clickAppearance,
  firstDrawHandler,
  drawHandler,
  trackTicks,
} from "./helpers";
import AtomInfo from "./AtomInfo";
import MissingColorWarning from "./MissingColorWarning";
import { initialState } from "./context";

function StructureViewer({ row }) {
  const viewerState = useViewerState();
  const viewerDispatch = useViewerDispatch();
  const [structureData, setStructureData] = useState(null);
  const [uniprotId, setUniprotId] = useState(null);

  // fetch AlphaFold structure - try uniprot ids until successful
  useEffect(() => {
    if (!row) return;
    async function fetchStructure() {
      let _uniprotId, _structureData;
      const uniprotIds = [...row.uniprotAccessions];
      while (uniprotIds.length) {
        _uniprotId = uniprotIds.shift();
        [_structureData] = await safeFetch(
          alphaFoldCifUrl(_uniprotId),
          "text",
        );
        if (_structureData) break;
      }
      if (_structureData) {
        setUniprotId(_uniprotId);
        setStructureData(_structureData);
        viewerDispatch({
          type: "setVariantResidues",
          value: new Set(
            row.referenceAminoAcid.split("").map((v, i) => i + row.aminoAcidPosition)
          )
        });
        viewerDispatch({
          type: "setMessage",
          value: null,
        });
      } else {
        viewerDispatch({
          type: "setMessage",
          value: "AlphaFold structure not available",
        });
      }
    }
    fetchStructure();
  }, [row]);

  // fetch pathogenicity or domains data if needed
  useEffect(() => {
    if (viewerState.colorBy === "pathogenicity" &&
        !viewerState.pathogenicityScores &&
        uniprotId) {
      async function fetchInfo() {
        const [scoresByResi] = await fetchPathogenicityScores(uniprotId);
        if (!scoresByResi) return;
        viewerDispatch({
          type: "setPathogenicityScores",
          value: meanPathogenicityScores(scoresByResi),
        });        
        const computeVariantScore =
          row.referenceAminoAcid.length === 1 && row.alternateAminoAcid.length === 1;
        viewerDispatch({
          type: "setVariantPathogenicityScore",
          value: computeVariantScore
            ? pickPathogenicityScore(scoresByResi, row.aminoAcidPosition, row.alternateAminoAcid)
            : null
        });
      }
      fetchInfo();
    } else if (viewerState.colorBy === "domain" &&
        !viewerState.domains &&
        uniprotId) {
      async function fetchInfo() {
        const [domains] = await fetchDomains(uniprotId);
        if (!Array.isArray(domains?.features)) return;
        viewerDispatch({
          type: "setDomains",
          value: processDomains(domains.features),
        });
      }
      fetchInfo();
    }
  }, [row, structureData, viewerState.colorBy]);

  // structure options
  const structureOptions = {
    cartoon: "cartoon",
    hybrid: "hybrid",
    transparent: "transparent",
    opaque: "opaque",
  };

  function handleStructureChange(event) {
    viewerDispatch({
      type: "setRepresentBy",
      value: event.target.value,
    });
  }

  // color options
  const colorOptions = {
    confidence: "confidence",
    pathogenicity: "pathogenicity",
    domain: "domain",
    hydrophobicity: "hydrophobicity",
    "secondary structure": "secondary structure",
    none: "none",
  };

  function handleColorChange(event) {
    viewerDispatch({
      type: "setColorBy",
      value: event.target.value,
    });
  }

  return (
    <Box sx={{ position: "relative" }} data-testid="alphafold-viewer">
      {structureData
        ? (
          <>
            <Viewer
              data={[{ structureData }]}
              onData={(viewer, viewerStateDispatch) => {
                dataHandler(viewer, viewerStateDispatch, row)
              }}
              drawAppearance={drawAppearance}
              hoverAppearance={hoverAppearance}
              clickAppearance={clickAppearance}
              onFirstDraw={firstDrawHandler}
              onDraw={drawHandler}
              trackColor={trackColor}
              trackTicks={trackTicks}
              topLeft={<MissingColorWarning />}
              bottomRight={<AtomInfo />}
              usage={{
                Resize: "Drag bottom right corner",
                Highlight: "Click residue",
                Unhighlight: "Click canvas",
              }}
            />
            <Box
              sx={{
                mt: 1.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                flexDirection: { xs: "column", lg: "row" },
                gap: 2,
              }}
            >
              <Box>
                <ViewerRadios
                  titleLabel="Structure"
                  options={structureOptions}
                  defaultValue={initialState.representBy}
                  stateProperty="representBy"
                  onChange={handleStructureChange}
                />
              </Box>
              <Box sx={{
                mt: { xs: 1, lg: 0 },
                display: "flex",
                flexDirection: "column",
                alignItems: { xs: "flex-start", lg: "flex-end" },
                maxWidth: { xs: "100%", lg: "50%" },
              }}>
                <ViewerDropdown 
                  titleLabel="Colour"
                  options={colorOptions}
                  stateProperty="colorBy"
                  onChange={handleColorChange}
                />
                <ViewerLegend />
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ height: "590px", width: "100%" }} />
        )
      }

      {/* message text */}
      {viewerState.message && (
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
          {viewerState.message}
        </Typography>
      )}
    
    </Box>
  );
}

export default StructureViewer