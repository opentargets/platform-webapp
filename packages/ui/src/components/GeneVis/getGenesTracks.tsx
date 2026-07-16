import { Fragment } from "react";
import { Container } from '@pixi/react';
import { TextStyle } from "pixi.js";
import { DataSprite, DataText, DataBackground, DataGeneBox } from "../GenTrack";
import { useGenTrackState, useGenTrackTooltipDispatch } from "ui";
import type { RefObject } from "react";
import type { ScalesRef } from "../GenTrack/ScalesContext";
import { grey } from "@mui/material/colors";
import { GENE_COLORS } from "./helpers";

const DEFAULT_ROW_HEIGHT = 28;
const DEFAULT_EXON_HEIGHT = 10;

export function getGenesTracks({
    geneToRow,
    color,
    biotype,
    id,
    YInfo,
    rowHeight = DEFAULT_ROW_HEIGHT,
    rowHeightMap,
    rowYOffsets,
    trackHeight: explicitTrackHeight,
    paddingTop: explicitPaddingTop,
    labeledIds = new Set(),
    nonL2GColor,
    highlightIds = new Set(),
  }) {
  const genTrackState = useGenTrackState();
  const { data, xMin, xMax } = genTrackState ?? { data: null, xMin: 0, xMax: 1 };
  const genTrackTooltipDispatch = useGenTrackTooltipDispatch() as unknown as (action: { type: string; value?: any }) => void;

  // Look up targets from pre-grouped data in context
  const targets = data?.region?.groupedTargets?.[biotype] ?? [];

  // Check if using variable row heights (new mode) or fixed row height (legacy mode)
  const useVariableHeights = rowHeightMap !== undefined && rowYOffsets !== undefined;

  // All gene types should have same visual appearance in zoom-level view
  // Exon/intron heights are consistent regardless of biotype
  const intronHeight = 2;
  const baseRowHeight = useVariableHeights ? rowHeightMap[0] || 28 : rowHeight;
  // Standard exon height for all biotypes - consistent visual appearance
  const exonHeight = DEFAULT_EXON_HEIGHT; // 10px for all gene types
  // Labels only shown for L2G genes (protein_coding only)
  const hasAnyLabels = labeledIds.size > 0;
  const labelHeight = hasAnyLabels ? baseRowHeight - exonHeight : 0;

  // Y-position functions: use variable offsets if provided, otherwise calculate from row index
  const yTop = (rowIndex: number) => {
    if (useVariableHeights) {
      return rowYOffsets[rowIndex] ?? rowIndex * baseRowHeight;
    }
    return rowIndex * rowHeight;
  };

  // Center the gene bar vertically in the available space (below label if labels shown)
  const ycenter = (rowIndex: number) => {
    const rowStart = yTop(rowIndex);
    const currentRowHeight = useVariableHeights ? (rowHeightMap[rowIndex] || baseRowHeight) : rowHeight;
    if (hasAnyLabels && labeledIds.size > 0) {
      // If this specific row has labels, position below label area
      const rowHasLabels = targets.some(g => geneToRow[g.target.id] === rowIndex && labeledIds.has(g.target.id));
      if (rowHasLabels) {
        // Label takes space at top, center gene in remaining space below
        // But shift slightly up to visually balance with label text above
        return rowStart + labelHeight + (currentRowHeight - labelHeight) / 2;
      }
    }
    // For non-labeled rows, center in the row but shift up slightly for visual balance
    return rowStart + currentRowHeight / 2 - 1;
  };

  // Calculate track height
  const nRows = Math.max(...Object.values(geneToRow)) + 1;
  const trackHeight = explicitTrackHeight ?? (useVariableHeights
    ? (rowYOffsets[nRows - 1] + rowHeightMap[nRows - 1])
    : rowHeight * nRows);
  const paddingTop = explicitPaddingTop ?? 0;

  return {
    id: id || "genes",
    height: trackHeight,
    paddingTop,
    yMin: 0,
    yMax: trackHeight,
    YInfo,
    // Pass row metadata for potential use by the container
    rowHeightMap,
    rowYOffsets,
    Track: ({ trackId, scalesRef }: { trackId: string; isInner: boolean; scalesRef: RefObject<ScalesRef> }) => {
      return (
        <Container>
          <DataBackground scalesRef={scalesRef} trackId={trackId} color={grey[100]} alpha={1} />
          {targets.map(gene => {
            const { target } = gene;
            const rowIndex = geneToRow[target.id];
            if (rowIndex === undefined) return null;
            // Only show label if this specific gene is in the labeledIds set
            const showGeneLabel = labeledIds.has(target.id);

            const isL2G = highlightIds.has(target.id);
            const geneColor = (nonL2GColor && !isL2G) ? nonL2GColor : color;

            // Compute exon span for intron line and label positioning
            const exons = target.canonicalExons ?? [];
            const exonStarts = exons.map((e: { start: number }) => e.start);
            const exonEnds = exons.map((e: { end: number }) => e.end);
            const intronStart = exonStarts.length > 0 ? Math.min(...exonStarts) : target.genomicLocation.start;
            const intronEnd = exonEnds.length > 0 ? Math.max(...exonEnds) : target.genomicLocation.end;

            // Compute label text and width for gene box
            const score = data?.l2GPredictions?.rows.find((r: any) => r.target.id === target.id)?.score;
            const leftArrow = target.genomicLocation.strand === -1 ? "← " : "";
            const rightArrow = target.genomicLocation.strand === 1 ? " →" : "";
            const labelText = score !== undefined
              ? `${leftArrow}${target.approvedSymbol || target.id}: ${score.toFixed(3)}${rightArrow}`
              : `${leftArrow}${target.approvedSymbol || target.id}${rightArrow}`;

            // Estimate label width in pixels (constant, doesn't change with zoom)
            const LABEL_FONT_SIZE = 10.5;
            const CHAR_WIDTH_FACTOR = 0.6;
            const labelWidthPixels = showGeneLabel ? labelText.length * LABEL_FONT_SIZE * CHAR_WIDTH_FACTOR : 0;
            const labelCenter = (intronStart + intronEnd) / 2;

            // Box Y position: for labeled genes, start at top; for unlabeled, center with gene
            const rowHasLabels = showGeneLabel;
            const boxY = rowHasLabels
              ? yTop(rowIndex)
              : ycenter(rowIndex) - exonHeight / 2 - 2; // Center with gene, small padding
            const boxHeight = rowHasLabels
              ? labelHeight + exonHeight + 4  // Include label + gene + padding
              : exonHeight + 4; // Just gene + padding

            return (
              <Fragment key={target.id}>
                {/* Gene box: hit area + highlight - RENDERED FIRST (behind gene) */}
                <DataGeneBox
                  scalesRef={scalesRef}
                  trackId={trackId}
                  intronStart={intronStart}
                  intronEnd={intronEnd}
                  labelWidthPixels={labelWidthPixels}
                  labelCenter={labelCenter}
                  y={boxY}
                  height={boxHeight}
                  biotype={target.biotype || 'other'}
                  isL2G={isL2G}
                  pointerover={(e: any) => {
                    const scales = scalesRef.current;
                    const ysi = trackId ? scales?.yScales.get(trackId) : undefined;
                    const boxScreenY = ysi ? boxY * ysi.yScale + ysi.yOffset + (ysi.containerY ?? 0) : e.global.y;
                    const boxScreenHeight = ysi ? boxHeight * ysi.yScale : 0;
                    const nativeEvent = e.nativeEvent ?? e.data?.originalEvent;
                    const cursorPageY = (nativeEvent?.clientY ?? 0) + window.scrollY;
                    const canvasPageY = cursorPageY - e.global.y;
                    const boxTopPageY = canvasPageY + boxScreenY;
                    const boxBottomPageY = boxTopPageY + boxScreenHeight;
                    // genomicX from cursor position (not labelCenter) so sticky tooltip has no jump on click
                    const genomicX = scales ? (e.global.x - scales.xOffset) / scales.xScale : labelCenter;
                    const hoverXY = { x: e.global.x, y: e.global.y, boxTopPageY, boxBottomPageY, genomicX };
                    genTrackTooltipDispatch({ type: "setDatum", value: target });
                    genTrackTooltipDispatch({ type: "setGlobalXY", value: hoverXY });
                    genTrackTooltipDispatch({ type: "setActiveCanvas", value: "inner" });
                    genTrackTooltipDispatch({ type: "setHover", value: { datum: target, globalXY: hoverXY, labelCenter } });
                  }}
                  pointerout={() => {
                    genTrackTooltipDispatch({ type: "setDatum", value: null });
                    genTrackTooltipDispatch({ type: "setGlobalXY", value: null });
                    genTrackTooltipDispatch({ type: "setHover", value: null });
                  }}
                />
                {/* Intron line spans from first exon to last exon */}
                <DataSprite
                  scalesRef={scalesRef}
                  trackId={trackId}
                  x={intronStart}
                  y={ycenter(rowIndex) - intronHeight / 2}
                  width={intronEnd - intronStart}
                  height={intronHeight}
                  tint={geneColor}
                  minPixelWidth={1}
                />
                {target.canonicalExons?.map(exon => (
                  <DataSprite
                    key={`${target.id}-${exon.start}-${exon.end}`}
                    scalesRef={scalesRef}
                    trackId={trackId}
                    x={exon.start}
                    y={ycenter(rowIndex) - exonHeight / 2}
                    width={exon.end - exon.start}
                    height={exonHeight}
                    tint={geneColor}
                    minPixelWidth={1}
                  />
                ))}
                {showGeneLabel && (
                  <DataText
                    scalesRef={scalesRef}
                    trackId={trackId}
                    x={labelCenter}
                    y={yTop(rowIndex) + labelHeight}
                    text={labelText}
                    anchor={[0.5, 1]}
                    style={new TextStyle({
                      align: 'center',
                      fill: "#000",
                      fontSize: 10.5,
                      fontWeight: '100',
                      wordWrap: false,
                    })}
                    {...(isL2G ? {
                      backgroundColor: GENE_COLORS.protein_coding.hoverBox,
                      backgroundPaddingX: 3,
                      backgroundPaddingY: 0,
                    } : {})}
                  />
                )}
              </Fragment>
            );
          })}
        </Container>
      );
    },
  }
}