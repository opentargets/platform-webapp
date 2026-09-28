import { useQuery } from "@apollo/client";
import { Box, Typography } from "@mui/material";
import { GeneVis, SectionItem, usePlatformApi } from "ui";
import { definition } from ".";
import Description from "./Description";
import { getTargetGenomicRegion, toGeneVisModel } from "./helpers";
import REGION_TARGETS_QUERY from "./TargetGenomicRegionRegionTargetsQuery.gql";

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ entity }: BodyProps) {
  const targetRequest = usePlatformApi();
  const target = targetRequest.data?.target;
  const region = getTargetGenomicRegion(target?.canonicalTranscript);
  const regionRequest = useQuery(REGION_TARGETS_QUERY, {
    variables: region?.regionVariables,
    skip: !region?.regionVariables,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={targetRequest}
      showContentLoading
      renderDescription={() => <Description targetSymbol={target?.approvedSymbol} />}
      renderBody={() => {
        if (regionRequest.error) {
          return (
            <Box sx={{ py: 2, px: 1.5 }}>
              <Typography color="text.secondary">Could not download region data</Typography>
            </Box>
          );
        }
        if (target && !region) {
          return (
            <Box sx={{ py: 2, px: 1.5 }}>
              <Typography color="text.secondary">Could not determine genomic region</Typography>
            </Box>
          );
        }
        if (!target || !region || !regionRequest.data?.region) {
          return <Typography component="h2">Loading region data...</Typography>;
        }

        return (
          <Box sx={{ pt: 1 }}>
            <GeneVis
              model={toGeneVisModel(target.id, regionRequest.data.region, region.center)}
              chromosome={region.chromosome}
              xMin={region.start}
              xMax={region.end}
              initialZoom={region.initialZoom}
            />
          </Box>
        );
      }}
    />
  );
}

export default Body;
