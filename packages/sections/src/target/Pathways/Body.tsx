import { useQuery } from "@apollo/client";
import { faMapMarker } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  defaultRowsPerPageOptions,
  type TargetBodyProps,
  type TargetPathwaysQuery,
  type TargetPathwaysQueryVariables,
} from "@ot/constants";
import { identifiersOrgLink } from "@ot/utils";
import { Link, OtTable, type OtTableColumn, SectionItem } from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import PATHWAYS_QUERY_DOCUMENT from "./Pathways.gql";

const PATHWAYS_QUERY = typedDocument<TargetPathwaysQuery, TargetPathwaysQueryVariables>(
  PATHWAYS_QUERY_DOCUMENT
);

type PathwayRow = NonNullable<TargetPathwaysQuery["target"]>["pathways"][number];

function getColumns(symbol: string): OtTableColumn<PathwayRow>[] {
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

type Props = TargetBodyProps;

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
          rows={request.data?.target?.pathways ?? []}
          rowsPerPageOptions={defaultRowsPerPageOptions}
          query={PATHWAYS_QUERY_DOCUMENT.loc?.source.body}
          variables={variables}
          loading={request.loading}
        />
      )}
    />
  );
}

export default Body;
