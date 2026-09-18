import { useQuery } from "@apollo/client";
import { GeneVis, SectionItem, useBatchQuery } from "ui";
import { Box, Typography } from "@mui/material";
import { definition } from ".";
import Description from "./Description";
import { useEffect } from "react";
import BROWSER_VIEW_QUERY from "./BrowserViewQuery.gql";
import REGION_TARGETS_QUERY from "./RegionTargetsQuery.gql";
import { table5HChunkSize } from "@ot/constants";

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

const MAX_REGION_WIDTH = 5_000_000;
const REGION_PADDING = 1_000_000;
const PAN_ZOOM_PADDING = 250_000;

function Body({ id, entity }: BodyProps) {
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

  const locusRows = data?.locus?.rows ?? [];
  const chromosome = locusRows[0]?.variant?.chromosome;
  const chromosomeLength = chromosomeInfo.find(item => item.chromosome === chromosome)?.length;
  const locusPositions = locusRows
    .map(row => row.variant?.position)
    .filter((position): position is number => Number.isFinite(position));
  const l2GPositions = (data?.l2GPredictions?.rows ?? []).flatMap(row => {
    const genomicLocation = row.target?.genomicLocation;
    if (
      genomicLocation?.chromosome !== chromosome ||
      !Number.isFinite(genomicLocation.start) ||
      !Number.isFinite(genomicLocation.end)
    ) {
      return [];
    }
    return [genomicLocation.start, genomicLocation.end];
  });
  const positions = [...locusPositions, ...l2GPositions];
  const earliestPosition = positions.length > 0 ? Math.min(...positions) : undefined;
  const highestPosition = positions.length > 0 ? Math.max(...positions) : undefined;

  let start: number | undefined;
  let end: number | undefined;
  let initialZoom: [number, number] | undefined;

  if (chromosome && chromosomeLength && earliestPosition !== undefined && highestPosition !== undefined) {
    const regionWidth = Math.min(
      highestPosition - earliestPosition + REGION_PADDING,
      MAX_REGION_WIDTH
    );
    const center = Math.round((earliestPosition + highestPosition) / 2);
    start = Math.floor(center - regionWidth / 2);
    end = Math.ceil(center + regionWidth / 2);

    if (start < 0) {
      end -= start;
      start = 0;
    } else if (end > chromosomeLength) {
      const overflow = end - chromosomeLength;
      end = chromosomeLength;
      start -= overflow;
    }

    const zoomStart = start + PAN_ZOOM_PADDING;
    const zoomEnd = end - PAN_ZOOM_PADDING;
    initialZoom = zoomStart >= zoomEnd || zoomStart > earliestPosition || zoomEnd < highestPosition
      ? [start, end]
      : [zoomStart, zoomEnd];
  }

  const regionVariables = chromosome && start !== undefined && end !== undefined
    ? { chromosome: `chr${chromosome}`, positionStart: start, positionEnd: end }
    : undefined;
  const regionRequest = useQuery(REGION_TARGETS_QUERY, {
    variables: regionVariables,
    skip: !regionVariables,
  });

  useEffect(() => {
    const targets = regionRequest.data?.region?.targets?.rows;
    if (!targets) return;

    const biotypeCounts = targets.reduce((counts, target) => {
      const biotype = target.biotype ?? "unknown";
      counts[biotype] = (counts[biotype] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    // eslint-disable-next-line no-console
    console.info("Browser View region target biotypes", biotypeCounts);
  }, [regionRequest.data]);



  const combinedData = data && regionRequest.data
    ? { ...data, region: regionRequest.data.region }
    : undefined;

	return (
		<SectionItem
			definition={definition}
			entity={entity}
			request={request}
			showContentLoading
			loadingMessage="Loading data. This may take some time..."
			renderDescription={() => <Description />}
      renderBody={() => {
        if (regionRequest.error) {
          return <Box sx={{ py: 2, px: 1.5 }}>
            <Typography color="text.secondary">Could not download region data</Typography>
          </Box>;
        }

        if (data && !regionVariables) {
          return <Box sx={{ py: 2, px: 1.5 }}>
            <Typography color="text.secondary">Could not determine genomic region</Typography>
          </Box>;
        }

        if (!combinedData || !chromosome || start === undefined || end === undefined) {
          return <Typography component="h2">Loading region data...</Typography>;
        }

        return <Box sx={{ pt: 1 }}>
          <GeneVis
              data={combinedData}
              chromosome={chromosome}
              xMin={start}
              xMax={end}
              initialZoom={initialZoom}
              variantColor={() => "grey"}
            />
          </Box>
      }}
		/>
	);
}

export default Body;
