import { useTheme } from "@mui/material";
import { DataSprite, DataVLine } from "../GenTrack";
import { Container } from '@pixi/react';
import { useGenTrackTooltipDispatch } from "ui";

const VARIANT_MINIMAP_TRACK_HEIGHT = 20;

export function getVariantMinimapTrack({ data }: { data: any }) {
  const genTrackTooltipDispatch = useGenTrackTooltipDispatch() as unknown as (action: { type: string; value: any }) => void;

  return {
    id: `variants`,
    height: VARIANT_MINIMAP_TRACK_HEIGHT,
    // paddingTop: 14,
    Track: ({ trackId, scalesRef }: { trackId: string; scalesRef: any }) => {
      const theme = useTheme();
      const primaryColor = theme.palette.primary.main;

      const primaryHex = parseInt(primaryColor.replace('#', ''), 16);

      return (
        <Container>
          {data?.variant && (
            <DataVLine scalesRef={scalesRef} trackId={trackId} x={data.variant.position} color={primaryHex} alpha={1} lineWidth={2} />
          )}
          {/* all variants at fixed y=50 */}
          {data?.locus.rows.map(({ variant }: { variant: any }) => {
            const isLead = variant.position === data.variant.position;
            return (
              <DataSprite
                key={variant.id}
                shape={isLead ? "circle" : "ring"}
                strokePixels={1.5}
                scalesRef={scalesRef}
                trackId={trackId}
                x={variant.position}
                y={50}
                radiusPixels={4}
                tint={primaryColor}
                eventMode="static"
                pointerover={(e: any) => {
                  genTrackTooltipDispatch({ type: "setDatum", value: variant });
                  genTrackTooltipDispatch({ type: "setGlobalXY", value: { x: e.global.x, y: e.global.y } });
                }}
                pointerout={() => {
                  genTrackTooltipDispatch({ type: "setDatum", value: null });
                  genTrackTooltipDispatch({ type: "setGlobalXY", value: null });
                }}
              />
            );
          })}
        </Container>
      );
    }
  };
}
