import { Fragment } from "react";
import { Container } from '@pixi/react';
import { DataSprite, DataText, DataBackground } from "../GenTrack";
import { useGenTrackState, useGenTrackTooltipDispatch } from "ui";
import type { RefObject } from "react";
import type { ScalesRef } from "../GenTrack/ScalesContext";
import { TextStyle } from 'pixi.js';
import { grey } from "@mui/material/colors";

const geneLabelStyle = new TextStyle({
  align: 'center',
  fill: "#000",
  fontSize: 10.5,
  fontWeight: '100',
  wordWrap: false,
});

const DEFAULT_ROW_HEIGHT = 10;
const BAR_HEIGHT = 8;
const LABEL_HEIGHT = 10;

export function getGeneMinimapTracks({ geneToRow, color, nonL2GColor, highlightIds = new Set(), biotype, id, YInfo, background = undefined, rowHeight = DEFAULT_ROW_HEIGHT, rowHeightMap, rowYOffsets, trackHeight: explicitTrackHeight, paddingTop: explicitPaddingTop, labeledIds = new Set() }) {
  const genTrackState = useGenTrackState();
  const { data } = genTrackState ?? { data: null };
  const genTrackTooltipDispatch = useGenTrackTooltipDispatch() as unknown as (action: { type: string; value: any }) => void;

  // Look up targets from pre-grouped data in context
  const targets = data?.region?.groupedTargets?.[biotype] ?? [];

  // Check if using variable row heights (new mode) or fixed row height (legacy mode)
  const useVariableHeights = rowHeightMap !== undefined && rowYOffsets !== undefined;

  const nRows = Math.max(...Object.values(geneToRow)) + 1;
  const calculatedTrackHeight = useVariableHeights
    ? (rowYOffsets[nRows - 1] + rowHeightMap[nRows - 1])
    : rowHeight * nRows;
  const trackHeight = explicitTrackHeight ?? calculatedTrackHeight;
  const paddingTop = explicitPaddingTop ?? 0;

  // Helper to get Y position for a row
  const yTop = (rowIndex: number) => {
    if (useVariableHeights) {
      return rowYOffsets[rowIndex] ?? 0;
    }
    return rowIndex * rowHeight;
  };

  // Position the gene bar with minimal gap below label
  const ycenter = (rowIndex: number) => {
    const rowStart = yTop(rowIndex);
    const currentRowHeight = useVariableHeights ? (rowHeightMap[rowIndex] || rowHeight) : rowHeight;
    const hasLabels = labeledIds.size > 0;
    if (hasLabels) {
      // If this specific row has labels, position bar directly below label
      const rowHasLabels = targets.some(g => geneToRow[g.target.id] === rowIndex && labeledIds.has(g.target.id));
      if (rowHasLabels) {
        // Position bar just below label with small gap (3px)
        return rowStart + LABEL_HEIGHT + 3 - BAR_HEIGHT / 2;
      }
    }
    // For non-labeled rows, center in the row
    return rowStart + currentRowHeight / 2 - BAR_HEIGHT / 2;
  };

  return {
    id: id || "genes-minimap",
    height: trackHeight,
    paddingTop,
    yMin: 0,
    yMax: trackHeight,
    YInfo,
    background,
    Track: ({ trackId, scalesRef }: { trackId: string; isInner: boolean; scalesRef: RefObject<ScalesRef> }) => {
      return (
        <Container>
          <DataBackground scalesRef={scalesRef} trackId={trackId} color={grey[100]} alpha={1} />
          {targets.map(gene => {
            const { target } = gene;
            const rowIndex = geneToRow[target.id];
            if (rowIndex === undefined) return null;
            const hasLabel = labeledIds.has(target.id);
            const isL2G = highlightIds.has(target.id);
            const geneColor = (nonL2GColor && !isL2G) ? nonL2GColor : color;
            return (
              <Fragment key={target.id}>
                {hasLabel && (() => {
                  const score = data?.l2GPredictions?.rows.find((r: any) => r.target.id === target.id)?.score;
                  const leftArrow = target.genomicLocation.strand === -1 ? "← " : "";
                  const rightArrow = target.genomicLocation.strand === 1 ? " →" : "";
                  const labelText = score !== undefined
                    ? `${leftArrow}${target.approvedSymbol || target.id}: ${score.toFixed(3)}${rightArrow}`
                    : `${leftArrow}${target.approvedSymbol || target.id}${rightArrow}`;
                  return (
                    <DataText
                      scalesRef={scalesRef}
                      trackId={trackId}
                      x={(target.genomicLocation.start + target.genomicLocation.end) / 2}
                      y={yTop(rowIndex) + LABEL_HEIGHT}
                      text={labelText}
                      anchor={[0.5, 1]}
                      style={geneLabelStyle}
                    />
                  );
                })()}
                <DataSprite
                  scalesRef={scalesRef}
                  trackId={trackId}
                  x={target.genomicLocation.start}
                  y={ycenter(rowIndex)}
                  width={target.genomicLocation.end - target.genomicLocation.start}
                  height={BAR_HEIGHT}
                  tint={geneColor}
                  minPixelWidth={2}
                  eventMode="static"
                  pointerover={(e: any) => {
                    genTrackTooltipDispatch({ type: "setDatum", value: target });
                    genTrackTooltipDispatch({ type: "setGlobalXY", value: { x: e.global.x, y: e.global.y } });
                  }}
                  pointerout={() => {
                    genTrackTooltipDispatch({ type: "setDatum", value: null });
                    genTrackTooltipDispatch({ type: "setGlobalXY", value: null });
                  }}
                />
              </Fragment>
            );
          })}
        </Container>
      );
    },
  };
}
