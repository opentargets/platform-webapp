import { DataSprite, DataVLine } from "../GenTrack";
import { Container } from '@pixi/react';
import { useGenTrackTooltipDispatch } from "ui";
import { PREDICTED_CONSEQUENCE_LOOKUP } from "@ot/constants";
import type { GeneVisVariant } from "./model";

const VARIANT_MINIMAP_TRACK_HEIGHT = 20;

export function getVariantMinimapTrack({
  variants = [],
  referencePosition,
  emphasisVariantId,
}: {
  variants?: GeneVisVariant[];
  referencePosition?: number;
  emphasisVariantId?: string;
}) {
  const genTrackTooltipDispatch = useGenTrackTooltipDispatch() as unknown as (action: { type: string; value: any }) => void;

  return {
    id: `variants`,
    height: VARIANT_MINIMAP_TRACK_HEIGHT,
    // paddingTop: 14,
    Track: ({ trackId, scalesRef }: { trackId: string; scalesRef: any }) => {

      return (
        <Container>
          {referencePosition !== undefined && (
            <DataVLine scalesRef={scalesRef} trackId={trackId} x={referencePosition} color={0x444444} lineWidth={2} />
          )}
          {/* all variants at fixed y=50 */}
          {[...variants]
            .sort((a: any, b: any) => {
              const aIsEmphasised = a.id === emphasisVariantId;
              const bIsEmphasised = b.id === emphasisVariantId;
              if (aIsEmphasised) return 1;
              if (bIsEmphasised) return -1;
              const rankA = PREDICTED_CONSEQUENCE_LOOKUP[a.mostSevereConsequence?.id as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP]?.rank ?? Infinity;
              const rankB = PREDICTED_CONSEQUENCE_LOOKUP[b.mostSevereConsequence?.id as keyof typeof PREDICTED_CONSEQUENCE_LOOKUP]?.rank ?? Infinity;
              return rankB - rankA;
            })
            .map((variant: any) => {
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
                    genTrackTooltipDispatch({ type: "setOtherData", value: { entityType: "variant" } });
                    genTrackTooltipDispatch({ type: "setGlobalXY", value: { x: e.global.x, y: e.global.y } });
                  }}
                  pointerout={() => {
                    genTrackTooltipDispatch({ type: "setDatum", value: null });
                    genTrackTooltipDispatch({ type: "setOtherData", value: null });
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
