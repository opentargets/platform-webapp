
import { GenTrackProvider, GenTrackTooltipProvider } from "ui";
import BodyContentInner from "./BodyContentInner";
import { extent } from "d3";

// from: https://www.ncbi.nlm.nih.gov/grc/human/data
// (first tab: "Chromosome lengths")
// !!! AND SHOULD MOVE TO OT-CONSTANTS - ALSO USED IN MANHATTTAN PLOT
const chromosomeInfo = [
  { chromosome: "1", length: 248956422 },
  { chromosome: "2", length: 242193529 },
  { chromosome: "3", length: 198295559 },
  { chromosome: "4", length: 190214555 },
  { chromosome: "5", length: 181538259 },
  { chromosome: "6", length: 170805979 },
  { chromosome: "7", length: 159345973 },
  { chromosome: "8", length: 145138636 },
  { chromosome: "9", length: 138394717 },
  { chromosome: "10", length: 133797422 },
  { chromosome: "11", length: 135086622 },
  { chromosome: "12", length: 133275309 },
  { chromosome: "13", length: 114364328 },
  { chromosome: "14", length: 107043718 },
  { chromosome: "15", length: 101991189 },
  { chromosome: "16", length: 90338345 },
  { chromosome: "17", length: 83257441 },
  { chromosome: "18", length: 80373285 },
  { chromosome: "19", length: 58617616 },
  { chromosome: "20", length: 64444167 },
  { chromosome: "21", length: 46709983 },
  { chromosome: "22", length: 50818468 },
  { chromosome: "X", length: 156040895 },
  { chromosome: "Y", length: 57227415 },
];

function BodyContent({ data }) {

  // !! COMPUTING MIN AND MAX INDEPENDENTLY HERE IS INEFFICIENT WHEN LOTS OF DATA SINCE COULD
  // AFTER E.G. GROUPED COLOCS BY POSOTOTION OR SUMMED ENHANCERS
  // - ALSO: SHOULD WE BE IDENTIFYING AND IGNORING OUTLIERS?
  const xExtremes = []
  const variantChromosome = data.locus.rows[0].variant.chromosome;
  xExtremes.push(  // variants
    extent(data.locus.rows.map(({ variant }) => variant.position))
  );
  xExtremes.push(  // genes (L2G)
    data.l2GPredictions.rows.map(({ target: { genomicLocation }}) => {
      return [genomicLocation.start, genomicLocation.end];
    })
  );
  xExtremes.push(  // enhancers (E2G)
    data.variant.enhancerToGenes.rows.map(({ start, end }) => [start, end])
  );
  xExtremes.push(  // molQTL coloc
    data.molqtlcolocalisation.rows.map(row => row.otherStudyLocus.variant.position)
  );
  xExtremes.push(  // GWAS coloc
    data.colocalisation.rows.map(row => row.otherStudyLocus.variant.position)
  );
  let [xMin, xMax] = extent(xExtremes.flat(Infinity));
  const range = xMax - xMin;
  xMin = Math.max(xMin - range * 0.015, 0);
  xMax = Math.min(
    xMax + range * 0.015,
    chromosomeInfo.find(({ chromosome }) => chromosome === variantChromosome).length
  );

  return (
    <GenTrackProvider initialState={{ data, xMin, xMax }} >
      <GenTrackTooltipProvider >
        <BodyContentInner />
      </GenTrackTooltipProvider>
    </GenTrackProvider>
  );
}

export default BodyContent;