import { GenTrackProvider, GenTrackTooltipProvider } from "ui";
import GeneVisInner from "./GeneVisInner";
import type { GeneVisModel, GeneVisTooltipOptions } from "./model";

function GeneVis({
  model,
  chromosome,
  xMin,
  xMax,
  initialZoom,
  tooltip,
}: {
  model: GeneVisModel;
  chromosome: any;
  xMin: any;
  xMax: any;
  initialZoom?: [number, number];
  tooltip?: GeneVisTooltipOptions;
}) {
  return (
    <GenTrackProvider initialState={{ data: model, xMin, xMax, chromosome }} >
      <GenTrackTooltipProvider >
        <GeneVisInner initialZoom={initialZoom} tooltip={tooltip} />
      </GenTrackTooltipProvider>
    </GenTrackProvider>
  );

}

export default GeneVis;
