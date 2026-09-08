import { DataSprite, DataVLine } from "../GenTrack";
import { Container } from '@pixi/react';
import { useGenTrackTooltipDispatch } from "ui";
import { PREDICTED_CONSEQUENCE_LOOKUP } from "./helpers";

const VARIANT_MINIMAP_TRACK_HEIGHT = 20;

export function getVariantMinimapTrack({ data }: { data: any }) {
  const genTrackTooltipDispatch = useGenTrackTooltipDispatch() as unknown as (action: { type: string; value: any }) => void;

  return {
    id: `variants`,
    height: VARIANT_MINIMAP_TRACK_HEIGHT,
    // paddingTop: 14,
    Track: ({ trackId, scalesRef }: { trackId: string; scalesRef: any }) => {

      return (
        <Container>
          {data?.variant && (
            <DataVLine scalesRef={scalesRef} trackId={trackId} x={data.variant.position} color={0x444444} lineWidth={2} />
          )}
          {/* all variants at fixed y=50 */}
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
            .map(({ variant }: { variant: any }) => {
              const consequenceColor = PREDICTED_CONSEQUENCE_LOOKUP[variant.mostSevereConsequence?.id as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP]?.color ?? 0x888888
              return (
                <DataSprite
                  key={variant.id}
                  shape="circle"
                  strokePixels={1.5}
                  scalesRef={scalesRef}
                  trackId={trackId}
                  x={variant.position}
                  y={50}
                  radiusPixels={4}
                  tint={consequenceColor}
                  eventMode="static"
                  alpha={0.9}
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
