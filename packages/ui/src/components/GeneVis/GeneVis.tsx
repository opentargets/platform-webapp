import { GenTrackProvider, GenTrackTooltipProvider } from "ui";
import GeneVisInner from "./GeneVisInner";

function GeneVis({
  data,
  chromosome,
  xMin,
  xMax,
  geneAxisLabel = "Genes",
  variantAxisLabel = "Varants",
  geneLabel = (gene => gene.approvedSymbol),
  variantColor,
  fixedTracks = true,
  zoomableTracks = true,
}) {

  return (
    <GenTrackProvider initialState={{ data, xMin, xMax, chromosome }} >
      <GenTrackTooltipProvider >
        <GeneVisInner
          chromosome={chromosome}
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