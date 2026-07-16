// import { useState, Fragment} from "react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  GenTrack,
  useGenTrackState,
  useGenTrackTooltipDispatch,
} from "ui";
import { Box, useTheme } from "@mui/material";
import { useMeasure } from "@uidotdev/usehooks";
import XAxis from "./XAxis";
import XAxisLabel from "./XAxisLabel";
import YDetails from "./YDetails";
import { getGenesTracks } from "./getGenesTracks";
import { getGeneMinimapTracks } from "./getGeneMinimapTracks";
import { getVariantTrack, DataVLineOverlay } from "./getVariantTrack";
import { getVariantMinimapTrack } from "./getVariantMinimapTrack";
import { packIntervals } from "./packIntervals";
import UnifiedTooltip, { TOOLTIP_WIDTH } from "./UnifiedTooltip";
import { GENE_COLORS } from "./helpers";

// Map biotype to color keys
const getBiotypeKey = (biotype: string): keyof typeof GENE_COLORS => {
  if (biotype === "protein_coding") return "protein_coding";
  if (biotype === "processed_transcript") return "processed_transcript";
  if (biotype === "pseudogene") return "pseudogene";
  if (biotype === "rna") return "rna";
  return "other";
};

const BIOTYPE_DISPLAY_NAMES = {
  protein_coding: "Protein coding",
  processed_transcript: "Processed transcript",
  pseudogene: "Pseudogene",
  rna: "RNA",
  other: "Other",
};

const BIOTYPE_ORDER = ["protein_coding", "rna", "pseudogene", "processed_transcript", "other"];

function groupTargetsByBiotype(targets) {
  return Object.groupBy(targets, gene => {
    const b = gene.target.biotype.toLowerCase();
    if (b === "protein_coding") return "protein_coding";
    if (b === "processed_transcript") return "processed_transcript";
    if (b.includes("pseudogene")) return "pseudogene";
    if (b.includes("rna")) return "rna";
    return "other";
  });
}

function GeneVisInner({
  fixedTracks,
  zoomableTracks,
}) {

  const navigate = useNavigate();
  const genTrackState = useGenTrackState();
  const { data, xMin, xMax } = genTrackState;

  // Extract L2G prediction gene IDs for priority packing
  const l2gGeneIds = new Set(
    data?.l2GPredictions?.rows?.map(row => row.target.id) || []
  );

  // Per-biotype track configuration
  const getBiotypeConfig = (hasLabels: boolean, biotype?: string) => {
    // Different row heights for different biotypes when zoomed
    if (hasLabels) {
      if (biotype === 'protein_coding') {
        return {
          pixelGapCenterToCenter: 95, // Adjusted back from 90 - less tight
          detailRowHeight: 26, // Adjusted back from 24 - less tight
        };
      } else {
        return {
          pixelGapCenterToCenter: 80, // Reduced from 100 for tighter spacing
          detailRowHeight: 20, // Further reduced from 24 for other biotypes
        };
      }
    }
    // Unlabeled rows (minimap)
    return {
      pixelGapCenterToCenter: 0,
      detailRowHeight: 16,
    };
  };

  const Y_INFO_WIDTH = 150;
  const Y_INFO_GAP = 0;
  const [widthRef, { width: totalWidth }] = useMeasure();
  const canvasWidth = (totalWidth ?? 0) - Y_INFO_WIDTH - Y_INFO_GAP;

  const bpPerPixel = (canvasWidth > 0 && xMax > xMin) ? (xMax - xMin) / canvasWidth : 1;

  // Check if we have gene data
  const hasGenes = data?.region?.targets?.length &&
    (fixedTracks === true || fixedTracks?.includes("genes") ||
     zoomableTracks === true || zoomableTracks?.includes("genes"));

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
    const groupedTargets = groupTargetsByBiotype(data.region.targets);

    // Create tracks for each biotype that has genes
    for (const biotype of BIOTYPE_ORDER) {
      const targets = groupedTargets[biotype];
      if (!targets || targets.length === 0) continue;

      const biotypeKey = getBiotypeKey(biotype);
      const color = GENE_COLORS[biotypeKey].main;
      const nonL2GColor = biotypeKey === 'protein_coding' ? GENE_COLORS.protein_coding.nonL2G : undefined;

      // YInfo component for this biotype
      const TrackYInfo = () => (
        <YDetails
          SubLabel={BIOTYPE_DISPLAY_NAMES[biotype]}
          Axis={null}
        />
      );

      // ===== MINIMAP TRACK (top level) =====
      // Only L2G genes get labels in minimap
      const minimapLabeledIds = new Set(
        targets.filter(g => l2gGeneIds.has(g.target.id)).map(g => g.target.id)
      );
      const minimapConfig = getBiotypeConfig(minimapLabeledIds.size > 0, biotype);
      const minimapPriorityIds = Array.from(minimapLabeledIds) as string[];

      // Compute packing for minimap
      const minimapGeneToRow = packIntervals(targets, {
        bpPerPixel,
        pixelGap: 2,
        pixelGapCenterToCenter: minimapConfig.pixelGapCenterToCenter,
        priorityIds: minimapPriorityIds,
        labeledIds: Array.from(minimapLabeledIds),
      });

      // Build minimap row heights
      const minimapRowsWithLabels = new Set<number>();
      for (const gene of targets) {
        const row = minimapGeneToRow[gene.target.id];
        if (row !== undefined && minimapLabeledIds.has(gene.target.id)) {
          minimapRowsWithLabels.add(row);
        }
      }

      const minimapNRows = Math.max(...Object.values(minimapGeneToRow).map((v: unknown) => Number(v))) + 1;
      const minimapRowHeightMap: number[] = [];
      const minimapRowYOffsets: number[] = [];
      let minimapCurrentYOffset = biotype === "protein_coding" ? 5 : 0;
      const minimapTallHeight = 22; // Taller rows for labeled genes (label + bigger bar)
      const minimapShortHeight = 12; // Shorter rows for unlabeled genes

      for (let r = 0; r < minimapNRows; r++) {
        const rowHasLabels = minimapRowsWithLabels.has(r);
        const rowHeight = rowHasLabels ? minimapTallHeight : minimapShortHeight;
        minimapRowHeightMap[r] = rowHeight;
        minimapRowYOffsets[r] = minimapCurrentYOffset;
        minimapCurrentYOffset += rowHeight;
      }
      const minimapTrackHeight = minimapCurrentYOffset;
      const minimapFinalTrackHeight = Math.max(minimapTrackHeight, 20);
      const minimapPadding = biotype === "protein_coding" ? 16 : 8; // Larger gap after variant track

      // Add minimap track with variable row heights
      fixedTrackList.push(getGeneMinimapTracks({
        geneToRow: minimapGeneToRow,
        color,
        biotype,
        id: `genes-minimap-${biotype}`,
        YInfo: TrackYInfo,
        rowHeightMap: minimapRowHeightMap,
        rowYOffsets: minimapRowYOffsets,
        trackHeight: minimapFinalTrackHeight,
        paddingTop: minimapPadding,
        labeledIds: minimapLabeledIds,
        nonL2GColor,
        highlightIds: new Set(l2gGeneIds),
      }));

      // ===== ZOOMABLE TRACK (detail level) =====
      // Only protein-coding genes get labels in zoomable view
      const zoomableLabeledIds = biotype === "protein_coding"
        ? new Set<string>(targets.map((g: { target: { id: string } }) => g.target.id))
        : new Set<string>();
      const zoomableConfig = getBiotypeConfig(true, biotype); // Always has labels
      const zoomablePriorityIds = Array.from(
        targets.filter((g: { target: { id: string } }) => l2gGeneIds.has(g.target.id)).map((g: { target: { id: string } }) => g.target.id)
      ) as string[];

      // Compute packing for zoomable track
      const zoomableGeneToRow = packIntervals(targets, {
        bpPerPixel,
        pixelGap: 1,
        pixelGapCenterToCenter: zoomableConfig.pixelGapCenterToCenter,
        priorityIds: zoomablePriorityIds,
        labeledIds: Array.from(zoomableLabeledIds),
      });

      // Build zoomable row heights
      const zoomableRowsWithLabels = new Set<number>();
      for (const gene of targets) {
        const row = zoomableGeneToRow[gene.target.id];
        if (row !== undefined && zoomableLabeledIds.has(gene.target.id)) {
          zoomableRowsWithLabels.add(row);
        }
      }

      const zoomableNRows = Math.max(...Object.values(zoomableGeneToRow).map((v: unknown) => Number(v))) + 1;
      const zoomableRowHeightMap: number[] = [];
      const zoomableRowYOffsets: number[] = [];
      let zoomableCurrentYOffset = 0;
      const zoomableTallHeight = zoomableConfig.detailRowHeight;
      const zoomableShortHeight = Math.max(16, zoomableTallHeight / 2 + 2);

      for (let r = 0; r < zoomableNRows; r++) {
        const rowHasLabels = zoomableRowsWithLabels.has(r);
        const rowHeight = rowHasLabels ? zoomableTallHeight : zoomableShortHeight;
        zoomableRowHeightMap[r] = rowHeight;
        zoomableRowYOffsets[r] = zoomableCurrentYOffset;
        zoomableCurrentYOffset += rowHeight;
      }
      const zoomableTrackHeight = zoomableCurrentYOffset;
      const zoomableFinalTrackHeight = Math.max(zoomableTrackHeight, 20);
      const zoomablePadding = biotype === "protein_coding" ? 10 : Math.max(6, (20 - zoomableTrackHeight) / 2);

      // Add zoomable detail track
      innerTrackList.push(getGenesTracks({
        geneToRow: zoomableGeneToRow,
        color,
        biotype,
        id: `genes-${biotype}`,
        YInfo: TrackYInfo,
        rowHeightMap: zoomableRowHeightMap,
        rowYOffsets: zoomableRowYOffsets,
        trackHeight: zoomableFinalTrackHeight,
        paddingTop: zoomablePadding,
        labeledIds: zoomableLabeledIds,
        nonL2GColor,
        highlightIds: new Set(l2gGeneIds),
      }));
    }
  }

  const innerScalesRef = useRef<any>(null);
  const theme = useTheme();
  const primaryColor = parseInt(theme.palette.primary.main.replace('#', ''), 16);

  return (
    <Box ref={widthRef} sx={{mr: 3}}>
      <GenTrack
        // XInfo={XAxis}
        // XYInfo={XAxisLabel}
        tracks={fixedTrackList.slice(0, 1)}
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
        Tooltip={UnifiedTooltip}
        tooltipProps={{ xAnchor: "adapt", yAnchor: "boxTop", tooltipWidth: TOOLTIP_WIDTH }}
        InnerTooltip={UnifiedTooltip}
        innerTooltipProps={{
          xAnchor: "adapt",
          yAnchor: (datum: any) => datum?.approvedSymbol ? "anchorAdapt" : "adapt",
          gap: 4,
          tooltipWidth: TOOLTIP_WIDTH,
          scalesRef: innerScalesRef,
          onDatumClick: (datum: any) => {
            if (datum?.approvedSymbol) navigate(`/target/${datum.id}`);
            else if (datum?.chromosome) navigate(`/variant/${datum.id}`);
          },
        }}
        onInnerScalesReady={(ref) => { innerScalesRef.current = ref.current; }}
        innerOverlayGraphics={data?.variant ? <DataVLineOverlay position={data.variant.position} scalesRef={innerScalesRef} color={primaryColor} /> : null}
      />
    </Box>
  );
}

export default GeneVisInner;
