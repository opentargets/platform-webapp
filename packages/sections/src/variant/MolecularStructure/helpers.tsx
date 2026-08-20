import { aminoAcidLookup } from "@ot/constants";
import { max } from "d3";
import { getAlphaFoldPathogenicityColor } from "@ot/constants";
import {
  clickColor,
  getHydrophobicityColor,
  showHoverSpheres,
  removeHoverSpheres,
  getResiColor,
  clickSurfaceStyle,
  baseCartoonStyle,
} from "ui/src/components/Viewer/helpers";
import { labelStyle } from "ui/src/components/Viewer/labelStyle";

const variantColor = "lime";

function resiOnVariant(state, resi) {
  return state.variantResidues.has(resi);
}

function getHighightVariantResiColor(state, resi) {
  switch (state.colorBy) {
    case "pathogenicity":
      return state.variantPathogenicityScore
        ? getAlphaFoldPathogenicityColor(state.variantPathogenicityScore)
        : "lime";
    case "hydrophobicity":
      return getHydrophobicityColor(state.atomsByResi.get(resi)[0].resn);
    case "none":
      return "lime";
    default:
      return getResiColor(state, resi);
  }
}

function highlightVariantSurface(state) {
  state.viewer.setSurfaceMaterialStyle(
    state.viewer._variantSurfaceId,
    { colorfunc: atom => getHighightVariantResiColor(state, atom.resi) },
  );
}

function unhighlightVariantSurface(state) {
    state.viewer.setSurfaceMaterialStyle(
    state.viewer._variantSurfaceId,
    { color: "lime" },
  );
}

const variantSurfaceStyle = {
  color: variantColor,
  opacity: 1,
};

function getGlobalSurfaceStyle(state, highlightResi) {
  return {
    visible: state.representBy !== "cartoon",
    opacity: state.representBy === "opaque" ? 1 : "transparent" ? 0.65 : 0.55,
    colorfunc: state.representBy === "hybrid"
      ? atom => (resiOnVariant(state, atom.resi)
        ? variantColor
        : atom.resi === state.viewer._clickedResi 
          ? clickColor
          : atom.resi === highlightResi
            ? getResiColor(state, atom.resi)
            : "#fff"
      )
      : atom => (resiOnVariant(state, atom.resi)
        ? variantColor
        : atom.resi === highlightResi || atom.resi === state.viewer._clickedResi
          ? clickColor
          : getResiColor(state, atom.resi)
        )
  };
}

function updateGlobalSurface(state, highlightResi) {
  state.viewer.setSurfaceMaterialStyle(
    state.viewer._globalSurfaceId,
    getGlobalSurfaceStyle(state, highlightResi)
  );
}

export function firstDrawHandler(state) {
  state.viewer.zoomTo({ resi: [...state.variantResidues] }, 0);
  state.viewer.zoom(0.2);
}

export function drawHandler(state) {
  const { viewer } = state;
  if (!viewer._variantSurfaceId) {  // first draw: create surfaces and labels
    viewer._variantSurfaceId = viewer.addSurface(
      "VDW",
      variantSurfaceStyle,
      { resi: [...state.variantResidues] },
      undefined,
      undefined,
      () => {} // include surface callback so addSurface returns surface id synchronously
    );
    viewer._globalSurfaceId = viewer.addSurface(
      "VDW",
      getGlobalSurfaceStyle(state),
      {},
      undefined,
      undefined,
      () => {}
    );
    viewer.addLabel(
      ` ${state.variantSummary} `,
      labelStyle,
      { resi: [...state.variantResidues][0] }
    );
  }
  viewer.setSurfaceMaterialStyle(viewer._variantSurfaceId, variantSurfaceStyle);
  updateGlobalSurface(state);
}

export const drawAppearance = [
  { style: baseCartoonStyle },
  {
    selection: state => {
      if (state.representBy !== "cartoon") return {};
      const resis = [...state.variantResidues];
      if (state.viewer._clickedResi) resis.push(state.viewer._clickedResi);
      return { resi: resis };
    }, 
    style: { clicksphere: { radius: 1.5 } },  
    addStyle: true,
  },
];

export const hoverAppearance = [
  { // show spheres 
    selection: {},
    onApply: (state, resi) => {
      if (!resiOnVariant(state, resi)) showHoverSpheres(state, resi);
    },
    leave: [{ onApply: removeHoverSpheres }],
    addStyle: true,
  },
  { // if hovering on variant residue:
    // - gray the cartoon or global surface
    // - color variant surface (and variant on global sirface) based on color option
    use: resiOnVariant,
    selection: {},
    addStyle: true,
    style: state => ({
      cartoon: {
        colorfunc: () => "#fff",
        hidden: state.representBy === "opaque" || state.representBy === "transparent",
      }
    }),
    onApply: (state, resi, interactionState) => {
      if (state.representBy !== "cartoon") {
        state.viewer.setSurfaceMaterialStyle(
          state.viewer._globalSurfaceId,
          {
            colorfunc: atom => resiOnVariant(state, atom.resi)
              ? getHighightVariantResiColor(state, atom.resi)
              : "#fff",
            opacity: state.representBy === "opaque" ? 1 : state.representBy === "transparent" ? 0.65 : 0.55
          },
        );
      }
      highlightVariantSurface(state);
    },
    leave: [
      { // update cartoon and/or global surface
        use: resiOnVariant,
        selection: {},
        addStyle: true,
        style: baseCartoonStyle,
        onApply: (state, resi, interactionState) => {
          if (!resiOnVariant(state, interactionState.hoveredResi)) {
            if (state.representBy === "opaque" || state.representBy === "transparent") {
              updateGlobalSurface(state);
            }
            unhighlightVariantSurface(state);
          }
        },
      },
    ],
  },
];

export const clickAppearance = [
  {
    use: (state, resi) => !resiOnVariant(state, resi),
    style: (state, resi) => state.representBy === "cartoon"
      ? { clicksphere: { radius: 1.5 } }
      : {},
    addStyle: true,
    onApply: (state, resi) => {
      if (resiOnVariant(state, resi)) return;
      const { viewer } = state;
      viewer._clickedSurfaceId = viewer.addSurface(
        "VDW",
        clickSurfaceStyle,
        { resi },
        undefined,
        undefined,
        () => {}
      );
      viewer._clickedResi = resi;  // hack so can access when hovering
      viewer._clickedLabelId = viewer.addLabel(
        ` ${state.atomsByResi.get(resi)[0].resn} ${resi} `,
        labelStyle,
        { resi }
      );
      if (state.representBy !== "cartoon") updateGlobalSurface(state);
    },
    leave: [
      { 
        use: (state, resi) => !resiOnVariant(state, resi),
        style: baseCartoonStyle,
        addStyle: true,
        onApply: (state, resi) => {
          state.viewer.removeSurface(state.viewer._clickedSurfaceId);
          state.viewer._clickedSurfaceId = null;
          state.viewer.removeLabel(state.viewer._clickedLabelId);
          state.viewer._clickedLabelId = null;
          state.viewer._clickedResi = null;
          if (state.representBy !== "cartoon") updateGlobalSurface(state);
        },
      },
      {
        use: (state, resi) => !resiOnVariant(state, resi),
        addStyle: true,
        style: (state, resi) => state.representBy === "cartoon"
          ? { clicksphere: { radius: 0 } }
          : {},
      }
    ],
  }
];

export function trackTicks(state) {
  return [
    {
      resi: state.variantResidues.values().next().value,
      label: state.variantSummary,
    }
  ];
}

// after load data into viewer, check variant's reference amino acids match
// amino acids at same positions in structure data
export function dataHandler(viewer, dispatch, row) {
  const allAtoms = viewer.getModel().selectedAtoms();
  dispatch({
    type: "setNResidues",
    value: max(allAtoms, atom => atom.resi),
  });
  for (const [j, residueChar] of [...row.referenceAminoAcid].entries()) {
    const structureResidueName = allAtoms.find(atom => {
      return atom.resi === row.aminoAcidPosition - row.referenceAminoAcid.length + 1 + j;
    })?.resn;
    if (aminoAcidLookup[residueChar] !== structureResidueName) {
      dispatch({
        type: "setMessage",
        value: "AlphaFold structure not available",
      });
    }
  }
}