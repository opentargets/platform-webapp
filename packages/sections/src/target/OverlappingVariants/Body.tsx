import { SectionItem, useBatchQuery, Box } from "ui";
import Description from "./Description";
import { definition } from ".";
import OVERLAPPING_VARIANTS_QUERY from "./OverlappingVariantsQuery.gql";
import { StateProvider } from "./Context";
import Viewer from "./Viewer";
import Filters from "./Filters";
import Table from "./Table";
import { table5HChunkSize } from "@ot/constants";

export interface OverlappingVariantsWidgetProps {
  id: string;
  label: string;
  entity: string;
}

function OverlappingVariantsWidget({
  id: ensemblId,
  label: symbol,
  entity,
}: OverlappingVariantsWidgetProps) {
  const variables = { ensemblId, size: table5HChunkSize, index: 0 };

  const request = useBatchQuery({
    query: OVERLAPPING_VARIANTS_QUERY,
    variables,
    dataPath: "target.proteinCodingCoordinates",
    size: table5HChunkSize,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => {
        if (!request?.data?.target) return <></>;
        return (
          <StateProvider
            data={request.data.target}
            query={OVERLAPPING_VARIANTS_QUERY.loc.source.body}
            variables={variables}
          >
            <Filters />
            <Box display="flex" gap={2} my={3}>
              <Box width="60%">
                <Table />
              </Box>
              <Box width="40%">
                <Viewer />
              </Box>
            </Box>
          </StateProvider>
        );
      }}
    />
  );
}

export default OverlappingVariantsWidget;
