import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { scaleLinear, axisLeft, select } from "d3";
import { Box, Collapse, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import { DataSprite, DataText, DataVLine, DataBackground, getOrCreateRingTexture } from "../GenTrack";
import type { TrackLegendProps } from "../GenTrack";
import { Container, Sprite, useApp, useTick } from '@pixi/react';
import type { Sprite as PixiSprite } from 'pixi.js';
import { TextStyle } from 'pixi.js';
import YDetails from "./YDetails";
import { useGenTrackTooltipDispatch } from "ui";
import { PREDICTED_CONSEQUENCE_LOOKUP } from "./helpers";

const VARIANT_TRACK_HEIGHT = 67;
const H_LINE_COLOR = 0xdddddd;
const HOVER_HIGHLIGHT_COLOR = 0x555555;
const STUCK_HIGHLIGHT_COLOR = 0x000000;
const STUCK_HIGHLIGHT_STROKE_PIXELS = 2;
const STUCK_HIGHLIGHT_RADIUS_PIXELS = 7;

// Calculate dynamic yMax based on posterior probabilities, rounded up to sensible intervals
function calculateDynamicYMax(data: any): number {
  if (!data?.locus?.rows) return 1;
  
  const maxPosterior = Math.max(...data.locus.rows.map((r: any) => r.posteriorProbability || 0));
  
  // Round up to nearest value in the allowed set
  const allowedValues = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0];
  for (const value of allowedValues) {
    if (maxPosterior <= value) return value;
  }
  return 1.0;
}

function VariantsAxis({ yMax }: { yMax: number }) {
  const axisRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const scale = scaleLinear()
      .domain([yMax, 0])
      .range([0, VARIANT_TRACK_HEIGHT]);

    const axis = axisLeft(scale)
      .tickValues([0, yMax])
      .tickFormat(d => String(d))
      .tickSizeOuter(0);

    if (!axisRef.current) return;
    const axisSelection = select(axisRef.current as SVGGElement).call(axis);

    axisSelection.selectAll("text")
      .style("font-size", "11px")
      .style("font-family", "'Inter', sans-serif");

    axisSelection.select(".domain")
      .style("stroke", grey[600])
      .style("stroke-width", "0")

    axisSelection.selectAll(".tick line")
      .style("stroke", grey[600])
  }, [yMax]);

  return (
    <svg width={24} height={VARIANT_TRACK_HEIGHT} style={{ overflow: "visible", flexShrink: 0 }}>
      <g ref={axisRef} transform="translate(24, 0)" />
    </svg>
  );
}

function VariantsYInfo({ yMax }: { yMax: number }) {
  return (
    <YDetails
      SubLabel={() => (
        <Box sx={{
          height: "100%",
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 0,
          mr: -3,
        }}>
          <Typography variant="caption" sx={{ textAlign: 'right' }}>
            Variants
          </Typography>
          <Typography variant="caption" sx={{ textAlign: 'right', fontSize: '11px' }}>
            posterior probability
          </Typography>
        </Box>
      )}
      Axis={() => <VariantsAxis yMax={yMax} />}
    />
  );
}

function VariantLegend({ data, isInner }: TrackLegendProps) {
  const [showAll, setShowAll] = useState(false);
  if (!isInner) return null;
  const consequenceIds: string[] = [...new Set(
    (data?.locus?.rows ?? [])
      ?.map((row: any) => row.variant?.mostSevereConsequence?.id)
      .filter((id: string) => id && PREDICTED_CONSEQUENCE_LOOKUP[id as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP])
  )];
  const consequences = consequenceIds
    .map(id => PREDICTED_CONSEQUENCE_LOOKUP[id as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP])
    .sort((a, b) => a.rank - b.rank);

  return (
    <Box sx={{
      p: 0.75,
      bgcolor: "rgba(255, 255, 255, 0.92)",
      border: "1px solid",
      borderColor: "grey.300",
      borderRadius: 1,
    }}>
      <Box sx={{ visibility: "hidden", height: 0, width: "max-content", overflow: "hidden", whiteSpace: "nowrap" }}>
        {consequences.map(({ color, displayTerm }) => (
          <Box key={displayTerm} sx={{ display: "flex", alignItems: "center", gap: 0.75, lineHeight: 1.2 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flex: "0 0 auto" }} />
            <Typography variant="caption">{displayTerm}</Typography>
          </Box>
        ))}
      </Box>
      {consequences.slice(0, 2).map(({ color, displayTerm }) => (
        <Box key={displayTerm} sx={{ display: "flex", alignItems: "center", gap: 0.75, lineHeight: 1.2, whiteSpace: "nowrap" }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flex: "0 0 auto" }} />
          <Typography variant="caption">{displayTerm}</Typography>
        </Box>
      ))}
      <Collapse in={showAll} timeout="auto" unmountOnExit>
        {consequences.slice(2).map(({ color, displayTerm }) => (
          <Box key={displayTerm} sx={{ display: "flex", alignItems: "center", gap: 0.75, lineHeight: 1.2, whiteSpace: "nowrap" }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flex: "0 0 auto" }} />
            <Typography variant="caption">{displayTerm}</Typography>
          </Box>
        ))}
      </Collapse>
      {consequences.length > 2 && (
        <Typography
          component="button"
          variant="caption"
          onClick={() => setShowAll(value => !value)}
          sx={{ display: "block", mt: 0.25, p: 0, border: 0, background: "none", cursor: "pointer", color: "primary.main" }}
        >
          {showAll ? "Show less" : "Show more"}
        </Typography>
      )}
    </Box>
  );
}

type VariantHighlightState = {
  hoveredVariant: { id: string; x: number; y: number } | null;
  refresh: (() => void) | null;
};

function VariantHighlightOverlay({
  scalesRef,
  variantCoordinates,
  highlightStateRef,
}: {
  scalesRef: any;
  variantCoordinates: Map<string, { x: number; y: number }>;
  highlightStateRef: MutableRefObject<VariantHighlightState>;
}) {
  const app = useApp();
  const hoverSpriteRef = useRef<PixiSprite | null>(null);
  const stickySpriteRef = useRef<PixiSprite | null>(null);
  const lastAppearanceRef = useRef<string | null>(null);
  const texture = getOrCreateRingTexture(app, STUCK_HIGHLIGHT_STROKE_PIXELS, STUCK_HIGHLIGHT_RADIUS_PIXELS);

  const syncHighlight = useCallback((renderImmediately: boolean) => {
    const scales = scalesRef.current;
    const hoverSprite = hoverSpriteRef.current;
    const stickySprite = stickySpriteRef.current;
    if (!scales || !hoverSprite || !stickySprite) return;

    const stickyDatumId = scales.stickyDatumId;
    const hoveredVariant = highlightStateRef.current.hoveredVariant;
    const stickyVariant = stickyDatumId ? variantCoordinates.get(stickyDatumId) : null;
    const hoverVariant = hoveredVariant?.id === stickyDatumId ? null : hoveredVariant;
    const appearance = `sticky:${stickyDatumId ?? ""}|hover:${hoverVariant?.id ?? ""}`;

    const updateRing = (sprite: PixiSprite, variant: { x: number; y: number } | null, tint: number) => {
      if (!variant) {
        sprite.alpha = 0;
        return;
      }
      const yScaleInfo = scales.yScales.get("variants");
      sprite.x = variant.x * scales.xScale + scales.xOffset;
      sprite.y = yScaleInfo
        ? variant.y * yScaleInfo.yScale + yScaleInfo.yOffset
        : variant.y;
      sprite.tint = tint;
      sprite.alpha = 0.9;
    };

    updateRing(hoverSprite, hoverVariant, HOVER_HIGHLIGHT_COLOR);
    updateRing(stickySprite, stickyVariant ?? null, STUCK_HIGHLIGHT_COLOR);

    if (renderImmediately || appearance !== lastAppearanceRef.current) {
      app.render();
    }
    lastAppearanceRef.current = appearance;
  }, [app, highlightStateRef, scalesRef, variantCoordinates]);

  useEffect(() => {
    highlightStateRef.current.refresh = () => syncHighlight(true);
    return () => {
      highlightStateRef.current.refresh = null;
    };
  }, [highlightStateRef, syncHighlight]);

  useTick(() => syncHighlight(false));

  return (
    <>
      <Sprite
        ref={hoverSpriteRef}
        texture={texture}
        width={STUCK_HIGHLIGHT_RADIUS_PIXELS * 2}
        height={STUCK_HIGHLIGHT_RADIUS_PIXELS * 2}
        anchor={[0.5, 0.5]}
        tint={HOVER_HIGHLIGHT_COLOR}
        alpha={0}
      />
      <Sprite
        ref={stickySpriteRef}
        texture={texture}
        width={STUCK_HIGHLIGHT_RADIUS_PIXELS * 2}
        height={STUCK_HIGHLIGHT_RADIUS_PIXELS * 2}
        anchor={[0.5, 0.5]}
        tint={STUCK_HIGHLIGHT_COLOR}
        alpha={0}
      />
    </>
  );
}

function VariantMarker({
  scalesRef,
  x,
  y,
  variant,
  tint,
  genTrackTooltipDispatch,
  highlightStateRef,
}: {
  scalesRef: any;
  x: number;
  y: number;
  variant: any;
  tint: number;
  genTrackTooltipDispatch: (action: { type: string; value: any }) => void;
  highlightStateRef: MutableRefObject<VariantHighlightState>;
}) {
  const handlePointerOver = useCallback((e: any) => {
    highlightStateRef.current.hoveredVariant = { id: variant.id, x, y };
    highlightStateRef.current.refresh?.();

    const nativeEvent = e.nativeEvent ?? e.data?.originalEvent;
    const pointerPageY = nativeEvent?.clientY != null
      ? nativeEvent.clientY + window.scrollY
      : undefined;
    const scales = scalesRef.current;
    const yScaleInfo = scales?.yScales.get("variants");
    const markerScreenY = yScaleInfo
      ? y * yScaleInfo.yScale + yScaleInfo.yOffset + (yScaleInfo.containerY ?? 0)
      : e.global.y;
    const canvasPageY = (pointerPageY ?? 0) - e.global.y;
    const markerRadius = 4;
    const boxTopPageY = canvasPageY + markerScreenY - markerRadius;
    const boxBottomPageY = canvasPageY + markerScreenY + markerRadius;
    const hoverXY = { x: e.global.x, y: e.global.y, pointerPageY, boxTopPageY, boxBottomPageY, genomicX: variant.position };
    genTrackTooltipDispatch({ type: "setDatum", value: variant });
    genTrackTooltipDispatch({ type: "setGlobalXY", value: hoverXY });
    genTrackTooltipDispatch({ type: "setActiveCanvas", value: "inner" });
    genTrackTooltipDispatch({ type: "setHover", value: { datum: variant, globalXY: hoverXY } });
  }, [genTrackTooltipDispatch, highlightStateRef, variant, x, y]);

  const handlePointerOut = useCallback(() => {
    if (highlightStateRef.current.hoveredVariant?.id === variant.id) {
      highlightStateRef.current.hoveredVariant = null;
      highlightStateRef.current.refresh?.();
    }
    genTrackTooltipDispatch({ type: "setDatum", value: null });
    genTrackTooltipDispatch({ type: "setGlobalXY", value: null });
    genTrackTooltipDispatch({ type: "setHover", value: null });
  }, [genTrackTooltipDispatch, highlightStateRef, variant.id]);

  return (
    <DataSprite
      shape="circle"
      strokePixels={1.5}
      scalesRef={scalesRef}
      trackId="variants"
      x={x}
      y={y}
      radiusPixels={4}
      tint={tint}
      eventMode="static"
      alpha={0.9}
      pointerover={handlePointerOver}
      pointerout={handlePointerOut}
    />
  );
}

export function getVariantTrack({ data }: { data: any }) {
  const genTrackTooltipDispatch = useGenTrackTooltipDispatch() as unknown as (action: { type: string; value: any }) => void;

  // Calculate dynamic yMax based on data
  const dynamicYMax = calculateDynamicYMax(data);

  return {
    id: `variants`,
    height: VARIANT_TRACK_HEIGHT,
    paddingTop: 20,
    yMin: 0,
    yMax: dynamicYMax,
    YInfo: () => <VariantsYInfo yMax={dynamicYMax} />,
    Legend: VariantLegend,
    legendPosition: "top-right",
    Track: ({ trackId, scalesRef }: { trackId: string; scalesRef: any }) => {
      const highlightStateRef = useRef<VariantHighlightState>({ hoveredVariant: null, refresh: null });
      const variantCoordinates = new Map<string, { x: number; y: number }>(
        (data?.locus?.rows ?? []).map(({ variant, posteriorProbability }: { variant: any; posteriorProbability: number }) => [
          variant.id,
          { x: variant.position, y: dynamicYMax - posteriorProbability },
        ] as [string, { x: number; y: number }]),
      );

      return (
        <Container>
          <DataBackground scalesRef={scalesRef} trackId={trackId} color="#eaf4fb" alpha={1} />
          {/* <DataHLine scalesRef={scalesRef} trackId={trackId} y={1} color={H_LINE_COLOR} /> */}
          {/* <DataHLine scalesRef={scalesRef} trackId={trackId} y={0.5} color={H_LINE_COLOR} /> */}
          {/* <DataHLine scalesRef={scalesRef} trackId={trackId} y={0} color={H_LINE_COLOR} /> */}

          {/* lead variant vertical line — confined to this track's own band so it only
              sits above this track's background and below this track's own sprites;
              the full-canvas segment is drawn separately via innerUnderlayGraphics */}
          {data?.variant && (
            <DataVLine scalesRef={scalesRef} trackId={trackId} x={data.variant.position} confineToTrack />
          )}

          {/* all variants */}
          {[...data?.locus.rows ?? []]
            .sort((a: any, b: any) => {
              const aIsLead = a.variant.position === data.variant.position;
              const bIsLead = b.variant.position === data.variant.position;
              if (aIsLead) return 1;
              if (bIsLead) return -1;
              const rankA = PREDICTED_CONSEQUENCE_LOOKUP[a.variant.mostSevereConsequence?.id as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP]?.rank ?? Infinity;
              const rankB = PREDICTED_CONSEQUENCE_LOOKUP[b.variant.mostSevereConsequence?.id as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP]?.rank ?? Infinity;
              return rankB - rankA;
            })
            .map(({ variant, posteriorProbability }: { variant: any; posteriorProbability: number }) => {
              const consequenceColor = PREDICTED_CONSEQUENCE_LOOKUP[variant.mostSevereConsequence?.id as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP]?.color ?? 0x888888;
              const y = dynamicYMax - posteriorProbability;
              return (
                <VariantMarker
                  key={variant.id}
                  scalesRef={scalesRef}
                  x={variant.position}
                  y={y}
                  variant={variant}
                  tint={consequenceColor}
                  genTrackTooltipDispatch={genTrackTooltipDispatch}
                  highlightStateRef={highlightStateRef}
                />
              );
            })}

          <VariantHighlightOverlay
            scalesRef={scalesRef}
            variantCoordinates={variantCoordinates}
            highlightStateRef={highlightStateRef}
          />

          {/* lead variant label */}
          {data?.variant && (
            <DataText
              scalesRef={scalesRef}
              trackId="variants"
              x={data.variant.position}
              y={dynamicYMax - (data.locus.rows.find((r: any) => r.variant.position === data.variant.position)?.posteriorProbability ?? 0)}
              text="Lead"
              anchor={[0.5, 1.3]}
              style={new TextStyle({
                align: 'center',
                fill: "#000",
                fontSize: 10.5,
                fontWeight: '100',
                wordWrap: false,
              })}
            />
          )}
        </Container>
      );
    }
  };
}
