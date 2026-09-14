import { extent, interpolateRgbBasis, mean, scaleDiverging, scaleLinear } from "d3";
import { DIVERGING_COLORS, featureToGroup, groupNames } from "./constants";

export function getGroupResults(data) {
  const rows = data.map((d) => {
    const row = {
      targetId: d.target.id,
      targetSymbol: d.target.approvedSymbol,
      shapBaseValue: d.shapBaseValue,
      score: d.score,
    };
    for (const groupName of groupNames) {
      row[groupName] = 0;
    }
    for (const feature of d.features) {
      const groupName = featureToGroup[feature.name];
      if (groupName) {
        row[groupName] += feature.shapValue;
      } else {
        console.warn(`feature ${feature.name} does not belong to any group`);
      }
    }
    return row;
  });
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

export function computeWaterfall(originalRow, fullXDomain, zeroBase) {
  const row = structuredClone(originalRow);
  const { features } = row;
  features.sort((a, b) => Math.abs(a.shapValue) - Math.abs(b.shapValue));
  for (const [index, feature] of features.entries()) {
    feature._start = features[index - 1]?._end ?? (zeroBase ? 0 : row.shapBaseValue);
    feature._end = feature._start + feature.shapValue;
  }
  const xExtent = extent(features.flatMap((d) => [d._start, d._end]));
  if (fullXDomain) {
    const relativeSize = (xExtent[1] - xExtent[0]) / (fullXDomain[1] - fullXDomain[0]);
    if (relativeSize < 0.25) {
      const middle = mean(xExtent);
      const stretch = 0.25 / relativeSize;
      xExtent[0] = middle + (xExtent[0] - middle) * stretch;
      xExtent[1] = middle + (xExtent[1] - middle) * stretch;
    }
  }
  const xDomain = scaleLinear().domain(xExtent).nice().domain();
  return { row, xDomain };
}

export function getColorInterpolator(groupResults) {
  let min = Infinity;
  let max = -Infinity;
  for (const row of groupResults) {
    for (const groupName of groupNames) {
      min = Math.min(min, row[groupName]);
      max = Math.max(max, row[groupName]);
    }
  }
  Math.abs(min) > max ? (max = -min) : (min = -max);
  return scaleDiverging().domain([min, 0, max]).interpolator(interpolateRgbBasis(DIVERGING_COLORS));
}
