import { GenTrackProvider, GenTrackTooltipProvider } from "ui";
import GeneVisInner from "./GeneVisInner";

function GeneVis({
  data,
  chromosome,
  xMin,
  xMax,
  initialZoom,
}: {
  data: any;
  chromosome: any;
  xMin: any;
  xMax: any;
  initialZoom?: [number, number];
}) {

  return (
    <GenTrackProvider initialState={{ data, xMin, xMax, chromosome }} >
      <GenTrackTooltipProvider >
        <GeneVisInner
          chromosome={chromosome}
          initialZoom={initialZoom}
        />
      </GenTrackTooltipProvider>
    </GenTrackProvider>
  );

}

export default GeneVis;
