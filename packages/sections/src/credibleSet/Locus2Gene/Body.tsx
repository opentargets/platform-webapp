import { ReactNode } from "react";
import { SectionItem, HeatmapTable, useReportQueryVariables } from "ui";
import { useQuery } from "@apollo/client";
import { definition } from ".";
import LOCUS2GENE_QUERY from "./Locus2GeneQuery.gql";
import Description from "./Description";

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ id, entity }: BodyProps): ReactNode {
  // When rendering from a saved report, use the saved variables
  // When rendering normally, construct variables from id prop
  const savedVariables = useReportQueryVariables();
  const variables = savedVariables || { studyLocusId: id };

  const request = useQuery(LOCUS2GENE_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description />}
      renderBody={() => (
        <HeatmapTable
          loading={request.loading}
          data={request.data?.credibleSet?.l2GPredictions}
          query={LOCUS2GENE_QUERY.loc.source.body}
          variables={variables}
        />
      )}
    />
  );
}
export default Body;
