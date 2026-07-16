import { useEffect, useRef } from "react";
import { scaleLinear, axisLeft, select } from "d3";
import { Box, Typography, useTheme } from "@mui/material";
import { grey } from "@mui/material/colors";
import { DataSprite, DataText, DataHLine, DataBackground, DataVLine } from "../GenTrack";
import { Container } from '@pixi/react';
import { TextStyle } from 'pixi.js';
import YDetails from "./YDetails";
import { useGenTrackTooltipDispatch } from "ui";

const VARIANT_TRACK_HEIGHT = 67;
const H_LINE_COLOR = 0xdddddd;

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

export function DataVLineOverlay({ position, scalesRef, color }: { position: number; scalesRef: any; color: number }) {
  return <DataVLine scalesRef={scalesRef} x={position} color={color} alpha={0.75} lineWidth={1} />;
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
    Track: ({ trackId, scalesRef }: { trackId: string; scalesRef: any }) => {  
      const theme = useTheme();
      const primaryColor = theme.palette.primary.main;

      return (
        <Container>
          <DataBackground scalesRef={scalesRef} trackId={trackId} color="#e8f0fe" alpha={1} />
          {/* <DataHLine scalesRef={scalesRef} trackId={trackId} y={1} color={H_LINE_COLOR} /> */}
          {/* <DataHLine scalesRef={scalesRef} trackId={trackId} y={0.5} color={H_LINE_COLOR} /> */}
          {/* <DataHLine scalesRef={scalesRef} trackId={trackId} y={0} color={H_LINE_COLOR} /> */}
          
          {/* all variants */}
          {data?.locus.rows.map(({ variant, posteriorProbability }: { variant: any; posteriorProbability: number }) => {
            const isLead = variant.position === data.variant.position;
            return (
              <DataSprite
                key={variant.id}
                shape={isLead ? "circle" : "ring"}
                strokePixels={1.5}
                scalesRef={scalesRef}
                trackId="variants"
                x={variant.position}
                y={dynamicYMax - posteriorProbability}
                radiusPixels={4}
                tint={primaryColor}
                eventMode="static"
                pointerover={(e: any) => {
                  const nativeEvent = e.nativeEvent ?? e.data?.originalEvent;
                  const pointerPageY = nativeEvent?.clientY != null
                    ? nativeEvent.clientY + window.scrollY
                    : undefined;
                  genTrackTooltipDispatch({ type: "setDatum", value: variant });
                  genTrackTooltipDispatch({ type: "setGlobalXY", value: { x: e.global.x, y: e.global.y, pointerPageY } });
                }}
                pointerout={() => {
                  genTrackTooltipDispatch({ type: "setDatum", value: null });
                  genTrackTooltipDispatch({ type: "setGlobalXY", value: null });
                }}
              />
            );
          })}

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
