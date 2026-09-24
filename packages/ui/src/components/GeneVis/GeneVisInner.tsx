// import { useState, Fragment} from "react";
import { useRef } from "react";
import {
  GenTrack,
  useGenTrackState,
  RegionBoundaryOverlay,
  DataVLine,
} from "ui";
import { Box, Typography } from "@mui/material";
import { useMeasure } from "@uidotdev/usehooks";
import XAxis from "./XAxis";
import XAxisLabel from "./XAxisLabel";
import YDetails from "./YDetails";
import { getGenesTracks } from "./getGenesTracks";
import { getVariantTrack } from "./getVariantTrack";
import { getVariantMinimapTrack } from "./getVariantMinimapTrack";
import { packIntervals } from "./packIntervals";
import UnifiedTooltip, { TOOLTIP_WIDTH } from "./UnifiedTooltip";
import { TextMetrics, TextStyle } from "pixi.js";

const BIOTYPE_DISPLAY_NAMES = {
  protein_coding: "Protein coding",
  processed_transcript: "Processed transcript",
  pseudogene: "Pseudogene",
  rna: "RNA",
  other: "Other",
};

const BIOTYPE_ORDER = ["protein_coding", "rna", "pseudogene", "processed_transcript", "other"];
const geneLabelStyle = new TextStyle({ align: "center", fill: "#000", fontSize: 10.5, fontWeight: "100", wordWrap: false });
const L2G_LABEL_PADDING = 6;

function getGeneLabelText(gene: any, score: number | undefined) {
  const leftArrow = gene.genomicLocation.strand === "NEGATIVE" ? "← " : "";
  const rightArrow = gene.genomicLocation.strand === "POSITIVE" ? " →" : "";
  const name = gene.approvedSymbol || gene.id;
  return score !== undefined ? `${leftArrow}${name}: ${score.toFixed(3)}${rightArrow}` : `${leftArrow}${name}${rightArrow}`;
}

function groupTargetsByBiotype(targets) {
  return Object.groupBy(targets, gene => {
    const b = gene.biotype?.toLowerCase() ?? "other";
    if (b === "protein_coding") return "protein_coding";
    if (b === "processed_transcript") return "processed_transcript";
    if (b.includes("pseudogene")) return "pseudogene";
    if (b.includes("rna")) return "rna";
    return "other";
  });
}

function GeneVisInner(props: {
  initialZoom?: [number, number];
  [key: string]: any;
}) {
  const { initialZoom } = props;

  const genTrackState = useGenTrackState();
  const { data, xMin, xMax } = genTrackState;

  // Extract L2G prediction gene IDs for priority packing
  const l2gGeneIds = new Set(
    data?.l2GPredictions?.rows?.map(row => row.target.id) || []
  );
  const regionTargets = data?.region?.targets?.rows ?? [];

  // Per-biotype track configuration
  const getBiotypeConfig = (biotype?: string) => {
    if (biotype === 'protein_coding') {
      return {
        pixelGapCenterToCenter: 95, // Adjusted back from 90 - less tight
        detailRowHeight: 30,
      };
    }
    return {
      pixelGapCenterToCenter: 80, // Reduced from 100 for tighter spacing
      detailRowHeight: 20, // Further reduced from 24 for other biotypes
    };
  };

  const Y_INFO_WIDTH = 150;
  const Y_INFO_GAP = 0;
  const [widthRef, { width: totalWidth }] = useMeasure();
  const canvasWidth = (totalWidth ?? 0) - Y_INFO_WIDTH - Y_INFO_GAP;

  const bpPerPixel = (canvasWidth > 0 && xMax > xMin) ? (xMax - xMin) / canvasWidth : 1;

  // Check if we have gene data
  const hasGenes = regionTargets.length > 0;

  const fixedTrackList = [];
  const innerTrackList = [];

  // variant track
  const variantMinimapTrack = getVariantMinimapTrack({ data });
  const variantTrack = getVariantTrack({ data });
  fixedTrackList.push(variantMinimapTrack);
  innerTrackList.push(variantTrack);
 
  // gene tracks
  if (hasGenes) {
    // Group genes by biotype
    const groupedTargets = groupTargetsByBiotype(regionTargets);

    // Create tracks for each biotype that has genes
    for (const biotype of BIOTYPE_ORDER) {
      const targets = groupedTargets[biotype];
      if (!targets || targets.length === 0) continue;

      // YInfo component for this biotype
      const TrackYInfo = () => (
        <YDetails
          labelOffset="-0.25rem"
          SubLabel={() => (
            <Typography variant="caption" sx={{ textAlign: 'right', fontWeight: 600 }}>
              {BIOTYPE_DISPLAY_NAMES[biotype]}
            </Typography>
          )}
          Axis={null}
        />
      );

      // ===== ZOOMABLE TRACK (detail level) =====
      // Only protein-coding genes get labels in zoomable view
      const zoomableLabeledIds = biotype === "protein_coding"
        ? new Set<string>(targets.map((gene: { id: string }) => gene.id))
        : new Set<string>();
      const zoomableConfig = getBiotypeConfig(biotype);
      const zoomablePriorityIds = Array.from(
        targets.filter((gene: { id: string }) => l2gGeneIds.has(gene.id)).map((gene: { id: string }) => gene.id)
      ) as string[];
      const zoomableLabelWidths = Object.fromEntries((biotype === "protein_coding" ? targets : []).map((gene: any) => {
        const score = data?.l2GPredictions?.rows.find((row: any) => row.target.id === gene.id)?.score;
        const textWidth = TextMetrics.measureText(getGeneLabelText(gene, score), geneLabelStyle).width;
        return [gene.id, textWidth + (l2gGeneIds.has(gene.id) ? L2G_LABEL_PADDING : 0)];
      }));

      // Compute packing for zoomable track
      const zoomableGeneToRow = packIntervals(targets, {
        bpPerPixel,
        // Reserve both 6px gene-box side paddings so adjacent boxes cannot overlap.
        pixelGap: 12,
        pixelGapCenterToCenter: zoomableConfig.pixelGapCenterToCenter,
        priorityIds: zoomablePriorityIds,
        labeledIds: Array.from(zoomableLabeledIds),
        labelWidthPixelsById: zoomableLabelWidths,
      });

      // Build zoomable row heights
      const zoomableRowsWithLabels = new Set<number>();
      for (const gene of targets) {
        const row = zoomableGeneToRow[gene.id];
        if (row !== undefined && zoomableLabeledIds.has(gene.id)) {
          zoomableRowsWithLabels.add(row);
        }
      }

      const zoomableNRows = Math.max(...Object.values(zoomableGeneToRow).map((v: unknown) => Number(v))) + 1;
      const zoomableRowHeightMap: number[] = [];
      const zoomableRowYOffsets: number[] = [];
      const zoomableTrackVerticalPadding = 2;
      let zoomableCurrentYOffset = zoomableTrackVerticalPadding;
      const zoomableTallHeight = zoomableConfig.detailRowHeight;
      const zoomableShortHeight = Math.max(16, zoomableTallHeight / 2 + 2);
      const zoomableRowGap = 2;

      for (let r = 0; r < zoomableNRows; r++) {
        const rowHasLabels = zoomableRowsWithLabels.has(r);
        const rowHeight = rowHasLabels ? zoomableTallHeight : zoomableShortHeight;
        zoomableRowHeightMap[r] = rowHeight;
        zoomableRowYOffsets[r] = zoomableCurrentYOffset;
        zoomableCurrentYOffset += rowHeight + (r < zoomableNRows - 1 ? zoomableRowGap : 0);
      }
      const zoomableTrackHeight = zoomableCurrentYOffset + zoomableTrackVerticalPadding;
      const zoomableFinalTrackHeight = Math.max(zoomableTrackHeight, 20);
      const zoomablePadding = biotype === "protein_coding" ? 10 : Math.max(6, (20 - zoomableTrackHeight) / 2);

      // Add zoomable detail track
      innerTrackList.push(getGenesTracks({
        targets,
        geneToRow: zoomableGeneToRow,
        biotype,
        id: `genes-${biotype}`,
        YInfo: TrackYInfo,
        rowHeightMap: zoomableRowHeightMap,
        rowYOffsets: zoomableRowYOffsets,
        trackHeight: zoomableFinalTrackHeight,
        paddingTop: zoomablePadding,
        labeledIds: zoomableLabeledIds,
        highlightIds: new Set(l2gGeneIds),
      }));
    }
  }

  const innerScalesRef = useRef<any>(null);

  return (
    <Box ref={widthRef} sx={{ mr: 3, pb: 2 }}>
      <GenTrack
        tracks={fixedTrackList}
        InnerXInfo={XAxis}
        innerTracks={innerTrackList}
        InnerXYInfo={XAxisLabel}
        innerXYInfoHeight={42}
        overlayZoombar={fixedTrackList?.length > 0}
        yInfoGap={Y_INFO_GAP}
        yInfoWidth={Y_INFO_WIDTH}
        panZoomTopGap={0}
        panZoomBottomGap={4}
        paddingBottom={0}
        crosshairs="vertical"
        initialZoom={initialZoom}
        Tooltip={UnifiedTooltip}
        tooltipProps={{ xAnchor: "adapt", yAnchor: "boxTop", tooltipWidth: TOOLTIP_WIDTH }}
        InnerTooltip={UnifiedTooltip}
        innerTooltipProps={{
          xAnchor: "adapt",
          yAnchor: "anchorAdapt",
          gap: 4,
          tooltipWidth: TOOLTIP_WIDTH,
          scalesRef: innerScalesRef,
          stickyOnClick: true,
        }}
        onInnerScalesReady={(ref) => { innerScalesRef.current = ref.current; }}
        innerOverlayGraphics={
          <RegionBoundaryOverlay scalesRef={innerScalesRef} />
        }
        innerUnderlayGraphics={
          data?.variant ? (
            <DataVLine scalesRef={innerScalesRef} x={data.variant.position} lineWidth={1} />
          ) : null
        }
      />
    </Box>
  );
}

export default GeneVisInner;
