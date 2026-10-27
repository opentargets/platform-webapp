import { type ApolloError, useQuery } from "@apollo/client";
import type {
  DiseaseBodyProps,
  OntologyAncestorsQuery,
  OntologyAncestorsQueryVariables,
  OntologyQuery,
  OntologyQueryVariables,
} from "@ot/constants";
import { SectionItem } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import ONTOLOGY_ANCESTORS_QUERY_DOCUMENT from "./OntologyAncestorsQuery.gql";
import ONTOLOGY_QUERY_DOCUMENT from "./OntologyQuery.gql";
import OntologySubgraph, { type OntologyGraphData } from "./OntologySubgraph";

const ONTOLOGY_QUERY = typedDocument<OntologyQuery, OntologyQueryVariables>(
  ONTOLOGY_QUERY_DOCUMENT
);
const ONTOLOGY_ANCESTORS_QUERY = typedDocument<
  OntologyAncestorsQuery,
  OntologyAncestorsQueryVariables
>(ONTOLOGY_ANCESTORS_QUERY_DOCUMENT);

type Props = DiseaseBodyProps;

type OntologyRequest = {
  loading: boolean;
  error?: ApolloError;
  data?: { disease: OntologyGraphData };
};

function Body({ id: efoId, label, entity }: Props) {
  const request = useQuery(ONTOLOGY_QUERY, {
    variables: { efoId },
  });

  // the API only returns ancestor ids on the disease; resolve them in a second
  // request to get their names and parents for the subgraph
  const disease = request.data?.disease ?? null;
  const ancestorIds = disease?.ancestors ?? [];
  const ancestorsRequest = useQuery(ONTOLOGY_ANCESTORS_QUERY, {
    variables: { ids: ancestorIds, size: Math.max(ancestorIds.length, 1) },
    skip: ancestorIds.length === 0,
  });

  const combinedRequest: OntologyRequest = {
    loading: request.loading || ancestorsRequest.loading,
    error: request.error ?? ancestorsRequest.error,
    data:
      disease && !ancestorsRequest.loading
        ? {
            disease: {
              ...disease,
              resolvedAncestors: ancestorsRequest.data?.diseases.rows ?? [],
            },
          }
        : undefined,
  };

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={combinedRequest}
      showContentLoading={true}
      renderDescription={() => <Description name={label} />}
      renderBody={() =>
        combinedRequest.data ? (
          <OntologySubgraph name={label} data={combinedRequest.data.disease} />
        ) : null
      }
      chipText={label}
    />
  );
}

export default Body;
