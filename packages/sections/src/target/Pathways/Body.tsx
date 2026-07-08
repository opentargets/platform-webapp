import { useQuery } from "@apollo/client";
import { SectionItem, Link, OtTable } from "ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapMarker } from "@fortawesome/free-solid-svg-icons";

import { definition } from ".";
import Description from "./Description";
import PATHWAYS_QUERY from "./Pathways.gql";

import { identifiersOrgLink } from "@ot/utils";
import { defaultRowsPerPageOptions } from "@ot/constants";

function getColumns(symbol) {
  return [
    {
      id: "pathway",
      label: "Pathway",
      enableHiding: false,
      renderCell: ({ pathwayId, pathway }) => (
        <Link external to={identifiersOrgLink("reactome", pathwayId)}>
          {pathway}
        </Link>
      ),
    },
    {
      id: "topLevelTerm",
      label: "Top-level parent pathway",
    },
    {
      id: "pathwayId",
      label: "View target and pathway",
      renderCell: ({ pathwayId }) => (
        <Link external to={`https://reactome.org/PathwayBrowser/#/${pathwayId}&FLG=${symbol}`}>
          <FontAwesomeIcon icon={faMapMarker} /> Reactome pathway browser
        </Link>
      ),
    },
  ];
}

type Props = {
  id: string;
  entity: string;
  label: string;
};

function Body({ id: ensemblId, label: symbol, entity }: Props) {
  const variables = { ensemblId };
  const request = useQuery(PATHWAYS_QUERY, {
    variables,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description symbol={symbol} />}
      renderBody={() => (
        <OtTable
          showGlobalFilter
          dataDownloader
          dataDownloaderFileStem={`${ensemblId}-pathway-${entity}`}
          columns={getColumns(symbol)}
          rows={request.data?.target.pathways}
          rowsPerPageOptions={defaultRowsPerPageOptions}
          query={PATHWAYS_QUERY.loc.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
