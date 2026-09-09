import {
  aminoAcidHydrophobicity,
  getAlphaFoldConfidence,
  getAlphaFoldPathogenicityColor,
} from "@ot/constants";
import { interpolateRdBu, scaleLinear, schemeDark2, schemeSet1 } from "d3";

const secondaryStructureColors = {
  h: "#008B8B",
  s: "#e6ab02",
  c: "#c0c0c0",
};

export const domainColors = [
  ...[1, 2, 5, 0, 6].map((i) => schemeDark2[i]),
  ...[1, 0, 4, 7, 2].map((i) => schemeSet1[i]),
];

export const hydrophobicityColorInterpolator = (v) => interpolateRdBu(1 - v);

const hydrophobicityColorScale = scaleLinear().domain([-55, 100]).range([0, 1]);

export function getHydrophobicityColor(resn) {
  return hydrophobicityColorInterpolator(
    hydrophobicityColorScale(aminoAcidHydrophobicity[resn].value)
  );
}

export const clickColor = "magenta";

// hover on a residue
export function showHoverSpheres(state, resi) {
  let color, opacity, radius;
  switch (state.representBy) {
    case "cartoon":
      radius = 1.5;
      color = getResiColor(state, resi);
      opacity = 0.7;
      break;
    case "hybrid":
      radius = 1.5;
      color = getResiColor(state, resi);
      opacity = 1;
      break;
    case "transparent":
      radius = 1.5;
      color = getResiColor(state, resi);
      opacity = 1;
      break;
    case "opaque":
      radius = 2;
      color = clickColor;
      opacity = 1;
      break;
  }

  if (resi !== state.viewer._clickedResi) {
    for (const atom of state.atomsByResi.get(resi)) {
      state.viewer.addSphere({
        center: { x: atom.x, y: atom.y, z: atom.z },
        radius,
        color,
        opacity,
      });
    }
  }
}

export function removeHoverSpheres(state) {
  state.viewer.removeAllShapes();
}

export function getResiColor(state, resi) {
  switch (state.colorBy) {
    case "confidence":
      return getAlphaFoldConfidence(state.atomsByResi.get(resi)[0], "color");
    case "pathogenicity":
      return state.pathogenicityScores
        ? getAlphaFoldPathogenicityColor(state.pathogenicityScores.get(resi))
        : "#ddd";
    case "domain": {
      if (!state.domains) return "#ddd";
      const domainIndex = state.domains.descriptionToIndex[state.domains.getDescription(resi)];
      return domainIndex == null ? "#ddd" : domainColors[domainIndex % domainColors.length];
    }
    case "hydrophobicity":
      return getHydrophobicityColor(state.atomsByResi.get(resi)[0].resn);
    case "secondary structure":
      return secondaryStructureColors[state.atomsByResi.get(resi)[0].ss];
    case "none":
      return "#ddd";
  }
}

export const clickSurfaceStyle = {
  color: clickColor,
  opacity: 1,
};

export const baseCartoonStyle = (state) => ({
  cartoon: {
    hidden: state.representBy === "opaque" || state.representBy === "transparent",
    colorfunc: (atom) => getResiColor(state, atom.resi),
    arrows: true,
  },
});

export function trackColor(state, resi) {
  if (!state.viewer) return;
  return getResiColor(state, resi);
}

export function onClickCapture(viewerRef, id) {
  if (!viewerRef.current) return;

  try {
    // Get the canvas element from the container
    const canvas = viewerRef.current.querySelector("canvas");

    if (!canvas) {
      console.error("Canvas element not found");
      return;
    }

    // Create a new canvas with proper background
    const newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;

    const ctx = newCanvas.getContext("2d");

    // Draw background
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);

    // Draw original canvas content on top
    ctx.drawImage(canvas, 0, 0);

    // Convert the new canvas to data URL
    const dataUrl = newCanvas.toDataURL("image/png");

    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${id ? `${id}-` : ""}molecular-structure.png`;
    link.click();
  } catch (error) {
    console.error("Error taking screenshot:", error);
  }
}
