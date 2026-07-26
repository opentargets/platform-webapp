import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { createViewer } from "3dmol";
import { parseCif } from "./parseCif";
import { schemeSet1, schemeDark2 } from "d3";
import { ViewerLegend, Tooltip, Box, Typography, MuiButton as Button } from "ui";
import { getAlphaFoldConfidence } from "@ot/constants";
import { isAlphaFold, zipToObject, modulo, hoverManagerFactory, onClickCapture } from "./helpers";
import InfoPopper from "./InfoPopper";

const experimentalStructureStem = "https://www.ebi.ac.uk/pdbe/entry-files/download/";
const experimentalStructureSuffix = ".cif";
const alphaFoldStructureStem = "https://alphafold.ebi.ac.uk/files/";
const alphaFoldStructureSuffix = "-model_v6.cif";

const chainColorScheme = [
  ...schemeDark2.slice(0, -1),
  ...[1, 2, 3, 4, 0, 6, 7].map(i => schemeSet1[i]),
];

function showStructure({ viewer, structureDetails, modelIndex, reset = true }) {
  if (viewer && structureDetails) {
    viewer?.setStyle({}, { hidden: true });
    const {
      isAF,
      modelNumbers,
      firstStructureChains,
      firstStructureTargetChains,
      firstStructureNonTargetChains,
      scheme,
    } = structureDetails;
    if (isAF) {
      viewer.setStyle(
        {},
        {
          cartoon: {
            colorfunc: atom => getAlphaFoldConfidence(atom, "color"),
            arrows: true,
          },
        }
      );
    } else if (modelNumbers.length > 1) {
      viewer.setStyle(
        {
          chain: firstStructureTargetChains,
          predicate: atom => atom._model === modelNumbers[modelIndex],
        },
        { cartoon: { colorfunc: atom => scheme[atom.chain], arrows: true } }
      );
      viewer.setStyle(
        {
          chain: firstStructureNonTargetChains,
          predicate: atom => atom._model === modelNumbers[modelIndex],
        },
        {
          cartoon: {
            color: "#eee",
            arrows: true,
            opacity: 0.8,
          },
        }
      );
    } else {
      viewer.setStyle(
        { chain: firstStructureTargetChains },
        { cartoon: { colorfunc: atom => scheme[atom.chain], arrows: true } }
      );
      viewer.setStyle(
        { chain: firstStructureNonTargetChains },
        {
          cartoon: {
            color: "#eee",
            arrows: true,
            opacity: 0.8,
          },
        }
      );
    }
    function resetViewer(duration = 0) {
      viewer.zoomTo(
        {
          chain: firstStructureTargetChains.length
            ? firstStructureTargetChains
            : firstStructureChains,
        },
        duration
      );
      viewer.zoom(isAF ? 1.4 : 1, duration);
    }
    if (reset) resetViewer();
    viewer.getCanvas().ondblclick = () => resetViewer(200);
    viewer.render();
  }
}

function Viewer({ ensemblId, selectedRow, segments }) {
  const [viewer, setViewer] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [hoverInfo, setHoverInfo] = useState(null);
  const [structureDetails, setStructureDetails] = useState(null);
  const [modelIndex, setModelIndex] = useState(null);

  const viewerRef = useRef(null);

  // create viewer
  useEffect(() => {
    if (viewerRef.current) {
      const _viewer = createViewer(viewerRef.current, {
        backgroundColor: "#f8f8f8",
        antialias: true,
        cartoonQuality: 10,
      });
      window.viewer = _viewer; // !! REMOVE GLOBAL !!
      setViewer(_viewer);
      _viewer.getCanvas().addEventListener(
        "wheel",
        event => {
          if (!event.ctrlKey) event.stopImmediatePropagation();
        },
        true // use capture phase so fires before library handler
      );
    }
    return () => {
      viewer?.clear();
      setViewer(null);
    };
  }, []);

  // fetch selected structure and show it
  useEffect(() => {
    async function fetchStructure() {
      if (viewer && selectedRow) {
        setStructureDetails(null);
        setModelIndex(null);
        setMessageText("Loading structure ...");

        const isAF = isAlphaFold(selectedRow);
        const pdbUri = isAF
          ? `${alphaFoldStructureStem}${selectedRow.id}${alphaFoldStructureSuffix}`
          : `${experimentalStructureStem}${selectedRow.id.toLowerCase()}${experimentalStructureSuffix}`;

        let response;
        try {
          response = await fetch(pdbUri);
          if (!response.ok) {
            console.error(`Response status (CIF request): ${response.status}`);
            setMessageText("Failed to download structure data");
            return;
          }
        } catch (error) {
          console.error(error.message);
          setMessageText("Failed to download structure data");
          return;
        }

        const data = await response.text();
        if (data.length > 4e7) {
          setMessageText("Structure data too large to visualise");
          return;
        }

        let parsedCif;
        try {
          parsedCif = parseCif(data)[selectedRow.id];
        } catch (error) {
          console.error(error.message);
          setMessageText("Failed to parse structure data");
          return;
        }

        const modelNumbers = [...new Set(parsedCif["_atom_site.pdbx_PDB_model_num"])]
          .map(Number)
          .sort((a, b) => a - b);
        const _modelIndex = 0;
        setModelIndex(0);

        // pdb <-> auth chains
        // - may only need pdb -> auth, but is 1-to-many so get auth->pdb first
        let authToPdbChain = null;
        let pdbToAuthChain = null;
        {
          const authChains = parsedCif["_atom_site.auth_asym_id"];
          if (authChains) {
            const pdbChains = parsedCif["_atom_site.label_asym_id"];
            const authChainsToMap = new Set(authChains);
            authToPdbChain = {};
            for (const [index, pdbChain] of pdbChains.entries()) {
              const authChain = authChains[index];
              if (authChainsToMap.has(authChain)) {
                authToPdbChain[authChain] = pdbChain;
                authChainsToMap.delete(authChain);
                if (authChainsToMap.size === 0) break;
              }
            }
            pdbToAuthChain = {};
            for (const [authChain, pdbChain] of Object.entries(authToPdbChain)) {
              pdbToAuthChain[pdbChain] ??= [];
              pdbToAuthChain[pdbChain].push(authChain);
            }
          }
        }

        // structure chains - pdb chain names
        const structureChains = parsedCif["_pdbx_struct_assembly_gen.asym_id_list"];
        let firstStructureChains;
        let firstStructureTargetChains = [];
        let firstStructureNonTargetChains = [];
        let otherStructureChains;
        const targetChains = segments[selectedRow.id].uniqueChains; // auth names
        const targetChainsPdb = new Set([...targetChains].map(chain => authToPdbChain[chain]));
        if (structureChains) {
          if (Array.isArray(structureChains)) {
            firstStructureChains = structureChains[0].split(",");
            otherStructureChains = structureChains.slice(1).join(",").split(",");
            const firstStructureChainsSet = new Set(firstStructureChains);
            otherStructureChains = otherStructureChains.filter(
              chain => !firstStructureChainsSet.has(chain)
            );
          } else {
            firstStructureChains = structureChains.split(",");
            otherStructureChains = [];
          }
          for (const chain of firstStructureChains) {
            (targetChainsPdb.has(chain)
              ? firstStructureTargetChains
              : firstStructureNonTargetChains
            ).push(chain);
          }
        } else {
          const allChains = new Set(parsedCif["_atom_site.label_asym_id"]);
          firstStructureChains = [...allChains];
          firstStructureTargetChains.push(...targetChainsPdb);
          firstStructureNonTargetChains = firstStructureChains.filter(
            chain => !targetChainsPdb.has(chain)
          );
          otherStructureChains = [];
        }
        if (pdbToAuthChain) {
          firstStructureChains = firstStructureChains.map(chain => pdbToAuthChain[chain]).flat();
          firstStructureTargetChains = firstStructureTargetChains
            .map(chain => pdbToAuthChain[chain])
            .flat();
          firstStructureNonTargetChains = firstStructureNonTargetChains
            .map(chain => pdbToAuthChain[chain])
            .flat();
          otherStructureChains = otherStructureChains.map(chain => pdbToAuthChain[chain]).flat();
        }

        // entities
        const entityIdToDesc = zipToObject(
          parsedCif["_entity.id"],
          parsedCif["_entity.pdbx_description"]
        );
        const chainToEntityId = zipToObject(
          parsedCif["_struct_asym.id"],
          parsedCif["_struct_asym.entity_id"]
        );
        const chainToEntityDesc = {};
        for (const chain of parsedCif["_struct_asym.id"]) {
          chainToEntityDesc[chain] = entityIdToDesc[chainToEntityId[chain]];
        }

        const scheme = {};
        if (!isAF) {
          firstStructureTargetChains.forEach((chain, index) => {
            scheme[chain] = chainColorScheme[index % chainColorScheme.length];
          });
        }

        const _structureDetails = {
          isAF,
          modelNumbers,
          firstStructureChains,
          firstStructureTargetChains,
          firstStructureNonTargetChains,
          otherStructureChains,
          title: parsedCif["_struct.title"],
          scheme,
        };
        setStructureDetails(_structureDetails);
        viewer.removeAllModels();
        viewer.addModel(data, "cif");
        viewer.setStyle({}, { hidden: true });

        // add model numbers to _model property of viewer's atom objects
        // - since viewer not picking up model values automatically
        window.parsedCif = parsedCif; // !! REOVE GLOBAL !!
        if (modelNumbers.length > 1) {
          for (const [index, atom] of viewer.getModel().selectedAtoms().entries()) {
            atom._model = Number(parsedCif["_atom_site.pdbx_PDB_model_num"][index]);
          }
        }

        const hoverDuration = 50;
        viewer.setHoverDuration(hoverDuration);
        const hoverArgs = hoverManagerFactory({ parsedCif, chainToEntityDesc, setHoverInfo });
        const handleUnhover = hoverArgs[3];
        viewer.getCanvas().onmouseleave = () => {
          setTimeout(handleUnhover, hoverDuration + 50);
        };
        viewer.setHoverable(...hoverArgs);

        showStructure({
          viewer,
          structureDetails: _structureDetails,
          modelIndex: _modelIndex,
        });
        setMessageText("");
      }
    }
    fetchStructure();
    return () => {
      setHoverInfo(null);
      viewer?.clear();
    };
  }, [viewer, selectedRow, segments]);

  function handleDecrementModel() {
    const newIndex = modulo(modelIndex - 1, structureDetails.modelNumbers.length);
    showStructure({ viewer, structureDetails, modelIndex: newIndex, reset: false });
    setModelIndex(newIndex);
  }

  function handleIncrementModel() {
    const newIndex = modulo(modelIndex + 1, structureDetails.modelNumbers.length);
    showStructure({ viewer, structureDetails, modelIndex: newIndex, reset: false });
    setModelIndex(newIndex);
  }

  return (
    <>
      <StructureTitle selectedRow={selectedRow} structureDetails={structureDetails} />
      <Box position="relative" display="flex" justifyContent="center" pb={1}>
        <Box ref={viewerRef} position="relative" width="100%">
          <Box className="viewerContainer" position="relative" width="100%" height="380px">
            {/* info and screenshot buttons */}
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
                  m: 1,
                  gap: 1,
                }}
              >
                <InfoPopper />
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
                    onClick={() => onClickCapture(viewerRef, ensemblId)}
                  >
                    <FontAwesomeIcon icon={faCamera} />
                  </Button>
                </Tooltip>
              </Box>
            )}

            {/* atom info */}
            {hoverInfo && (
              <Box
                position="absolute"
                bottom={0}
                right={0}
                p="0.6rem 0.8rem"
                zIndex={100}
                bgcolor="#f8f8f8c8"
                sx={{ borderTopLeftRadius: "0.2rem", pointerEvents: "none" }}
                fontSize={14}
              >
                <Box display="flex" flexDirection="column">
                  <Typography variant="caption" component="p" textAlign="right">
                    {hoverInfo.chainName}
                  </Typography>
                  <Typography variant="caption" component="p" textAlign="right">
                    {hoverInfo.pdbChain}
                    {hoverInfo.authChain && hoverInfo.authChain !== hoverInfo.pdbChain
                      ? ` (auth: ${hoverInfo.authChain})`
                      : ""}{" "}
                    | {hoverInfo.atom.resn} {hoverInfo.pdbAtom}
                    {hoverInfo.authAtom && hoverInfo.authAtom !== hoverInfo.pdbAtom
                      ? ` (auth: ${hoverInfo.authAtom})`
                      : ""}
                  </Typography>
                  {isAlphaFold(selectedRow) && (
                    <Typography variant="caption" component="p" textAlign="right">
                      Confidence: {hoverInfo.atom.b} ({getAlphaFoldConfidence(hoverInfo.atom)})
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* model picker */}
            {structureDetails?.modelNumbers?.length > 1 && (
              <Box
                position="absolute"
                top={0}
                left={0}
                bgcolor="#f8f8f8d8"
                sx={{ borderBottomRightRadius: "0.2rem", zIndex: 1, pointerEvents: "none" }}
                display="flex"
                alignItems="center"
                gap={1}
                p="0.6rem 0.6rem"
              >
                <Button
                  onClick={handleDecrementModel}
                  sx={{ bgcolor: "white", pointerEvents: "auto" }}
                >
                  <FontAwesomeIcon icon={faChevronLeft} size="xs" />
                </Button>
                <Button
                  onClick={handleIncrementModel}
                  sx={{ bgcolor: "white", pointerEvents: "auto" }}
                >
                  <FontAwesomeIcon icon={faChevronRight} size="xs" />
                </Button>
                <Typography variant="caption" fontSize={13}>
                  Model {structureDetails.modelNumbers[modelIndex]}/
                  {structureDetails.modelNumbers.at(-1)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* message */}
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
      </Box>
      {isAlphaFold(selectedRow) && <ViewerLegend />}
    </>
  );
}

function StructureTitle({ selectedRow, structureDetails }) {
  const title = isAlphaFold(selectedRow) ? "AlphaFold prediction" : structureDetails?.title ?? "";

  return (
    <Box display="flex" alignItems="baseline" minHeight={22} gap={0.5} ml={2} mt={0.75} mb={1}>
      {selectedRow && (isAlphaFold(selectedRow) || structureDetails) && (
        <>
          <Typography variant="subtitle2" component="span">
            {`${selectedRow.id}${title ? ":" : ""}`}
          </Typography>
          <Typography variant="body2" component="span">
            {title}
          </Typography>
        </>
      )}
    </Box>
  );
}

export default Viewer;
