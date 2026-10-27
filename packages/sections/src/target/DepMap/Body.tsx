import { useQuery } from "@apollo/client";
import type { TargetBodyProps, TargetDepMapQuery, TargetDepMapQueryVariables } from "@ot/constants";
import { SectionItem } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import DEPMAP_QUERY_DOCUMENT from "./Depmap.gql";
import DepmapPlot from "./DepmapPlot";
import Description from "./Description";

// the plot needs every tissue, so the query asks for one large page
const DEPMAP_QUERY = typedDocument<TargetDepMapQuery, TargetDepMapQueryVariables>(
  DEPMAP_QUERY_DOCUMENT
);

type Props = TargetBodyProps;

function Section({ id, label: symbol, entity }: Props) {
  const variables = { ensemblId: id };
  const request = useQuery(DEPMAP_QUERY, { variables });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      showContentLoading={true}
      renderBody={() => (
        <DepmapPlot
          data={request.data?.target?.depMapEssentiality?.rows}
          variables={variables}
          query={DEPMAP_QUERY_DOCUMENT.loc?.source.body}
        />
      )}
    />
  );
}

export default Section;
