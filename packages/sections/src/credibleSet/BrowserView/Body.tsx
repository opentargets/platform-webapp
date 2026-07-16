import { useQuery } from "@apollo/client";
import { GeneVis, SectionItem, useBatchQuery } from "ui";
import { Box } from "@mui/material";
import { definition } from ".";
import Description from "./Description";
import { useEffect, useState } from "react";
import BROWSER_VIEW_QUERY from "./BrowserViewQuery.gql";
import {table5HChunkSize } from "@ot/constants";
import { extent } from "d3";

type BodyProps = {
	id: string;
	entity: string;
};

// !! SHOULD PROBABLY MOVE OT OT-CONSTANTS
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

const REGION_WIDTH = 2_000_000;

function Body({ id, entity }: BodyProps) {
  const [combinedData, setCombinedData] = useState<any[] | null>(null);

  // trivial request to satisfy SectionItem; not used for rendering yet
  const variables = {
    studyLocusId: id,
    size: table5HChunkSize,
    index: 0,
  };

  const request = useBatchQuery({
    query: BROWSER_VIEW_QUERY,
    variables,
    dataPath: "credibleSet.locus",
    size: table5HChunkSize,
  });

  const data = request.data?.credibleSet;

  // get region: chromosome, start, end
  const xExtremes = [];
  let chromosome, start, end;
  
  if (data) {
    chromosome = data.locus.rows[0].variant.chromosome;
    xExtremes.push(  // variants
      extent(data.locus.rows.map(({ variant }) => variant.position))
    );
    xExtremes.push(  // genes (L2G)
      data.l2GPredictions.rows.map(({ target: { genomicLocation }}) => {
        return [genomicLocation.start, genomicLocation.end];
      })
    );
    [start, end] = extent(xExtremes.flat(Infinity));
    const center = Math.round((start + end) / 2);
    start = center - REGION_WIDTH / 2;
    end = center + REGION_WIDTH / 2;
    if (start < 0) {
      end -= start; 
      start = 0;
    } else {
      const chromosomeLength = chromosomeInfo.find(obj => obj.chromosome === chromosome).length;
      if (end > chromosomeLength) {
        end = chromosomeLength;
        start -= end - chromosomeLength;
      }
    }
  }

  // !! LOAD LOCAL CHROMOSOME DATA AND MERGE TARGETS DATA INTO THE API DATA !! 
  useEffect(() => {
    if (!chromosome || start === undefined || end === undefined) return;

    let cancelled = false;

    const load = async () => {
      try {
        const mod = await import(`./genesByChromosome/chr${chromosome}.json`);
        const arr = (mod as any).default ?? mod;

        // filter to those within (or overlapping) start-to-end
        let filtered = Array.isArray(arr)
          ? arr.filter((item: any) => {
              const gs = Number(item.start);
              const ge = Number(item.end);
              return Number.isFinite(gs) && Number.isFinite(ge) && ge >= start && gs <= end;
            })
          : [];

        // // !! FILTER ON BIOTYPE HERE FOR NOW !!
        // filtered = filtered.filter(o => (
        //   // o.biotype.includes("protein_coding")
        //   // !o.biotype.includes("pseudogene") && 
        //   // !o.biotype.includes("RNA")
        //   // true
        // ));
        
        // rewrite data into format returned by API
        if (!cancelled) {
          const formatted = filtered.map(o => ({
            target: {
              id: o.id,
              approvedSymbol: o.name,
              biotype: o.biotype,
              canonicalExons: o.exons,
              genomicLocation: {
                start: o.start,
                end: o.end,
                strand: o.strand,
                chromosome: chromosome,
              }
            }
          }));

          // group targets
          const groupedTargets = Object.groupBy(formatted, obj => {
            const biotype = obj.target.biotype.toLowerCase();
            if (biotype === "protein_coding") return "protein_coding";
            else if (biotype === "processed_transcript") return "processed_transcript";
            else if (biotype.includes("pseudogene")) return "pseudogene";
            else if (biotype.includes("rna")) return "rna";
            else return "other";
          });

          setCombinedData({ ...data, region: { targets: formatted, groupedTargets } });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to load chromosome data", e);
        // if (!cancelled) setCombinedData([] as any);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [chromosome, start, end]);

  // !! CURRENTLY MUST HAVE combinedData FOR FIRST RENDER OF GENEVIS !!
  if (!combinedData) return null;

	return (
		<SectionItem
			definition={definition}
			entity={entity}
			request={request}
			showContentLoading
			loadingMessage="Loading data. This may take some time..."
			renderDescription={() => <Description />}
      renderBody={() => (data && chromosome && start !== undefined && end !== undefined)
        ? <Box sx={{ pt: 1 }}>
          <GeneVis
              data={combinedData}
              chromosome={chromosome}
              xMin={start}
              xMax={end}
              geneLabel={target => `${target.genomicLocation.strand === -1 ? "← " : ""}${
                target.approvedSymbol ?? target.id}${
                target.genomicLocation.strand === 1 ? " →" : ""}`
              }
              variantColor={() => "grey"}
            />
          </Box>
        : <h2>Loading...</h2>
      }
		/>
	);
}

export default Body;
