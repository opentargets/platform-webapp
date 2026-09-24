import { useQuery } from "@apollo/client";
import { GeneVis, SectionItem, useBatchQuery } from "ui";
import { Box, Typography } from "@mui/material";
import { definition } from ".";
import Description from "./Description";
import { useEffect } from "react";
import BROWSER_VIEW_QUERY from "./BrowserViewQuery.gql";
import REGION_TARGETS_QUERY from "./RegionTargetsQuery.gql";
import { table5HChunkSize } from "@ot/constants";
import { getBrowserViewRegion } from "./helpers";

type BodyProps = {
	id: string;
	entity: string;
};

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
  const { start, end, initialZoom, regionVariables } = getBrowserViewRegion({
    chromosome,
    locusRows,
    l2gRows: data?.l2GPredictions?.rows ?? [],
  });
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

        return (
          <Box sx={{ pt: 1 }}>
            <GeneVis
              data={combinedData}
              chromosome={chromosome}
              xMin={start}
              xMax={end}
              initialZoom={initialZoom}
            />
          </Box>
        );
      }}
		/>
	);
}

export default Body;
