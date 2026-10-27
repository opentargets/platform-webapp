import { useQuery } from "@apollo/client";
import type {
  TargetBodyProps,
  TargetSubcellularLocationQuery,
  TargetSubcellularLocationQueryVariables,
} from "@ot/constants";
import { SectionItem } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import SUBCELLULAR_LOCATION_QUERY_DOCUMENT from "./SubcellularLocation.gql";
import SubcellularViz from "./SubcellularViz";

const SUBCELLULAR_LOCATION_QUERY = typedDocument<
  TargetSubcellularLocationQuery,
  TargetSubcellularLocationQueryVariables
>(SUBCELLULAR_LOCATION_QUERY_DOCUMENT);

type Props = TargetBodyProps;

function Body({ id: ensemblId, label: symbol, entity }: Props) {
  const request = useQuery(SUBCELLULAR_LOCATION_QUERY, {
    variables: { ensemblId },
  });

  return (
    <SectionItem
      entity={entity}
      definition={definition}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      showContentLoading={true}
      renderBody={() =>
        request.data?.target ? (
          <SubcellularViz key={request.data.target.id} data={request.data.target} />
        ) : null
      }
    />
  );
}

export default Body;
