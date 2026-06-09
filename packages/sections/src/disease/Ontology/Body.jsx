import { SectionItem, useReportSectionContext } from "ui";

import Description from "./Description";
import ONTOLOGY_QUERY from "./OntologyQuery.gql";

import { useQuery } from "@apollo/client";
import { definition } from ".";
import OntologySubgraph from "./OntologySubgraph";

function Body({ id: efoId, label, entity }) {
  const reportContext = useReportSectionContext();
  efoId = reportContext?.entityId || efoId;
  label = reportContext?.entityLabel || label;
  
  const request = useQuery(ONTOLOGY_QUERY, {
    variables: { efoId },
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      showContentLoading={true}
      renderDescription={() => <Description name={label} />}
      renderBody={() =>
        <OntologySubgraph
          name={label}
          data={request.data?.disease}
        />
      }
      chipText={label}
    />
  );
}

export default Body;
