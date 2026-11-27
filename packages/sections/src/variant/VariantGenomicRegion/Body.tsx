import { useQuery } from "@apollo/client";
import { Box, Typography } from "@mui/material";
import { chromosomeName } from "@ot/constants";
import { GeneVis, SectionItem, usePlatformApi } from "ui";
import { definition } from ".";
import Description from "./Description";
import REGION_TARGETS_QUERY from "./VariantGenomicRegionRegionTargetsQuery.gql";
import { getVariantGenomicRegion, toGeneVisModel } from "./helpers";

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ id, entity }: BodyProps) {
  const variantRequest = usePlatformApi();
  const apiVariant = variantRequest.data?.variant;
  // the API returns the chromosome as an enum value ("chr1"); the helpers and
  // GeneVis work with plain names ("1"), like target locations
  const variant = apiVariant && {
    ...apiVariant,
    chromosome: chromosomeName(apiVariant.chromosome),
  };
  const region = getVariantGenomicRegion(variant?.chromosome, variant?.position);
  const regionRequest = useQuery(REGION_TARGETS_QUERY, {
    variables: region?.regionVariables,
    skip: !region?.regionVariables,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={variantRequest}
      showContentLoading
      renderDescription={() => (
        <Description
          variantId={id}
          referenceAllele={variant?.referenceAllele}
          alternateAllele={variant?.alternateAllele}
        />
      )}
      renderBody={() => {
        if (regionRequest.error) {
          return <Box sx={{ py: 2, px: 1.5 }}><Typography color="text.secondary">Could not download region data</Typography></Box>;
        }
        if (variant && !region) {
          return <Box sx={{ py: 2, px: 1.5 }}><Typography color="text.secondary">Could not determine genomic region</Typography></Box>;
        }
        if (!variant || !region || !regionRequest.data?.region) {
          return <Typography component="h2">Loading region data...</Typography>;
        }
        if (regionRequest.data.region.targets.count === 0) {
          return <Box sx={{ py: 2, px: 1.5 }}><Typography color="text.secondary">No genes in the region around this variant</Typography></Box>;
        }

        return (
          <Box sx={{ pt: 1 }}>
            <GeneVis
              model={toGeneVisModel(variant, regionRequest.data.region)}
              chromosome={variant.chromosome}
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
