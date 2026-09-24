import { useQuery } from "@apollo/client";
import { GeneVis, SectionItem, useBatchQuery } from "ui";
import { Box, Typography } from "@mui/material";
import { definition } from ".";
import Description from "./Description";
import { useEffect } from "react";
import BROWSER_VIEW_QUERY from "./BrowserViewQuery.gql";
import REGION_TARGETS_QUERY from "./RegionTargetsQuery.gql";
import { table5HChunkSize, chromosomeInfo } from "@ot/constants";

type BodyProps = {
	id: string;
	entity: string;
};

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
            />
          </Box>
      }}
		/>
	);
}

export default Body;
