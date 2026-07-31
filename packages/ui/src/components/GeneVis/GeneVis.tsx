import { GenTrackProvider, GenTrackTooltipProvider } from "ui";
import GeneVisInner from "./GeneVisInner";

function GeneVis({
  data,
  chromosome,
  xMin,
  xMax,
  initialZoom,
  geneAxisLabel = "Genes",
  variantAxisLabel = "Varants",
  geneLabel = (gene => gene.approvedSymbol),
  variantColor,
  fixedTracks = true,
  zoomableTracks = true,
}: {
  data: any;
  chromosome: any;
  xMin: any;
  xMax: any;
  initialZoom?: [number, number];
  geneAxisLabel?: string;
  variantAxisLabel?: string;
  geneLabel?: (gene: any) => any;
  variantColor?: any;
  fixedTracks?: boolean;
  zoomableTracks?: boolean;
}) {

  return (
    <GenTrackProvider initialState={{ data, xMin, xMax, chromosome }} >
      <GenTrackTooltipProvider >
        <GeneVisInner
          chromosome={chromosome}
          initialZoom={initialZoom}
          geneAxisLabel={geneAxisLabel}
          variantAxisLabel={variantAxisLabel}
          geneLabel={geneLabel}
          variantColor={variantColor}
          fixedTracks={fixedTracks}
          zoomableTracks={zoomableTracks}
        />
      </GenTrackTooltipProvider>
    </GenTrackProvider>
  );

}

export default GeneVis;