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
import GeneVisTooltip, { TOOLTIP_WIDTH } from "./GeneVisTooltip";
import type { GeneVisTooltipOptions } from "./model";
import { TextMetrics } from "pixi.js";
import {
  BIOTYPE_DISPLAY_NAMES,
  BIOTYPE_ORDER,
  geneLabelStyle,
  getBiotypeConfig,
  getGeneLabelText,
  getGeneTrackLayout,
  groupTargetsByBiotype,
} from "./helpers";

function GeneVisInner(props: {
  initialZoom?: [number, number];
  tooltip?: GeneVisTooltipOptions;
}) {
  const { initialZoom, tooltip } = props;

  const genTrackState = useGenTrackState();
  const { data: model, xMin, xMax } = genTrackState;
  const genePresentation = model?.genePresentation ?? {};
  const priorityGeneIds = new Set(genePresentation.priorityIds ?? []);
  const scoreByGeneId = genePresentation.scoreByGeneId ?? {};
  const highlightStylesById = new Map();
  for (const highlight of genePresentation.highlights ?? []) {
    for (const targetId of highlight.targetIds) highlightStylesById.set(targetId, highlight);
  }
  const regionTargets = model?.genes ?? [];
  const Tooltip = () => <GeneVisTooltip tooltip={tooltip} emphasis={model?.variantTrack?.emphasis} />;
  const getTooltipWidth = (datum: any, otherData: any) => (
    tooltip?.getWidth?.({ datum, entityType: otherData?.entityType, context: tooltip.context }) ?? TOOLTIP_WIDTH
  );

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
  const variantMinimapTrack = getVariantMinimapTrack({
    variants: model?.overviewVariants,
    referencePosition: model?.referencePosition,
    emphasisVariantId: model?.variantTrack?.emphasis?.variantId,
  });
  if (model?.overviewVariants || model?.referencePosition !== undefined) {
    fixedTrackList.push(variantMinimapTrack);
  }
  const variantTrack = getVariantTrack({
    variantTrack: model?.variantTrack,
    referencePosition: model?.referencePosition,
  });
  if (variantTrack) innerTrackList.push(variantTrack);
 
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
        targets.filter((gene: { id: string }) => priorityGeneIds.has(gene.id)).map((gene: { id: string }) => gene.id)
      ) as string[];
      const zoomableLabelWidths = Object.fromEntries((biotype === "protein_coding" ? targets : []).map((gene: any) => {
        const score = scoreByGeneId[gene.id];
        const textWidth = TextMetrics.measureText(getGeneLabelText(gene, score), geneLabelStyle).width;
        return [gene.id, textWidth + (highlightStylesById.get(gene.id)?.labelPadding ?? 0)];
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

      const zoomableLayout = getGeneTrackLayout({
        targets,
        geneToRow: zoomableGeneToRow,
        labeledIds: zoomableLabeledIds,
        detailRowHeight: zoomableConfig.detailRowHeight,
        biotype,
      });

      // Add zoomable detail track
      innerTrackList.push(getGenesTracks({
        targets,
        geneToRow: zoomableGeneToRow,
        biotype,
        id: `genes-${biotype}`,
        YInfo: TrackYInfo,
        rowHeightMap: zoomableLayout.rowHeightMap,
        rowYOffsets: zoomableLayout.rowYOffsets,
        trackHeight: zoomableLayout.trackHeight,
        paddingTop: zoomableLayout.paddingTop,
        labeledIds: zoomableLabeledIds,
        referencePosition: model?.referencePosition,
        highlightStylesById,
        scoreByGeneId,
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
        Tooltip={Tooltip}
        tooltipProps={{ xAnchor: "adapt", yAnchor: "boxTop", tooltipWidth: getTooltipWidth }}
        InnerTooltip={Tooltip}
        innerTooltipProps={{
          xAnchor: "adapt",
          yAnchor: "anchorAdapt",
          gap: 4,
          tooltipWidth: getTooltipWidth,
          scalesRef: innerScalesRef,
          stickyOnClick: true,
        }}
        onInnerScalesReady={(ref) => { innerScalesRef.current = ref.current; }}
        innerOverlayGraphics={
          <RegionBoundaryOverlay scalesRef={innerScalesRef} />
        }
        innerUnderlayGraphics={
          model?.referencePosition !== undefined ? (
            <DataVLine scalesRef={innerScalesRef} x={model.referencePosition} lineWidth={1} />
          ) : null
        }
      />
      <Box sx={{
        display: "flex",
        justifyContent: "flex-end",
        mt: 0.75,
        columnGap: 1.5,
        flexWrap: "wrap",
        color: (theme) => theme.palette.grey[600],
      }}>
        <Typography variant="caption">
          <Box component="span" sx={{ fontWeight: 600 }}>Zoom:</Box> Ctrl + scroll or drag edges of top bar
        </Typography>
        <Typography variant="caption">
          <Box component="span" sx={{ fontWeight: 600 }}>Pan: </Box>drag main panel or top bar
        </Typography>
      </Box>
    </Box>
  );
}

export default GeneVisInner;
