import { useQuery } from "@apollo/client";
import { Link, SectionItem, Tooltip, PublicationsDrawer, OtTable, Typography } from "ui";
import { definition } from ".";
import Description from "./Description";
import { epmcUrl } from "@ot/utils";
import { naLabel } from "@ot/constants";
import UNIPROT_VARIANTS_QUERY from "./UniProtVariantsQuery.gql";
import { useCallback } from "react";

const columns = [
  {
    id: "diseases",
    label: "Disease/phenotype",
    enableHiding: false,
    renderCell: ({ disease, diseaseFromSource }) => {
      if (!disease) return naLabel;
      const displayElement = (
        <Link asyncTooltip to={`/disease/${disease.id}`}>
          {disease.name}
        </Link>
      );
      if (diseaseFromSource) {
        return (
          <Tooltip
            title={
              <>
                <Typography variant="subtitle2" display="block" align="center">
                  Reported disease or phenotype
                </Typography>
                <Typography variant="caption" display="block" align="center">
                  {diseaseFromSource}
                </Typography>
              </>
            }
            showHelpIcon
          >
            {displayElement}
          </Tooltip>
        );
      }
      return displayElement;
    },
    exportValue: ({ disease }) => disease?.name,
    filterValue: ({ disease }) => disease?.name,
  },
  {
    id: "confidence",
    label: "Confidence",
  },
  {
    id: "literature",
    label: "Literature",
    enableHiding: false,
    renderCell: ({ literature }) => {
      const literatureList =
        literature?.reduce((acc, id) => {
          if (id !== "NA") {
            acc.push({
              name: id,
              url: epmcUrl(id),
              group: "literature",
            });
          }
          return acc;
        }, []) || [];
      return <PublicationsDrawer entries={literatureList} />;
    },
    filterValue: false,
  },
];

type BodyProps = {
  id: string;
  entity: string;
};

export function Body({ id, entity }: BodyProps) {
  const variables = {
    variantId: id,
  };

  const request = useQuery(UNIPROT_VARIANTS_QUERY, {
    variables,
  });

  const getTargetFromSourceId = useCallback(() => {
    if (request.data?.variant.uniProtEvidences.rows.length > 0)
      return request.data?.variant.uniProtEvidences.rows[0].targetFromSourceId;
    return null;
  }, [request]);

  return (
    <SectionItem
      definition={definition}
      request={request}
      entity={entity}
      renderDescription={() => (
        <Description
          variantId={request.data?.variant.id}
          referenceAllele={request.data?.variant.referenceAllele}
          alternateAllele={request.data?.variant.alternateAllele}
          targetFromSourceId={getTargetFromSourceId()}
        />
      )}
      renderBody={() => {
        return (
          <OtTable
            dataDownloader
            dataDownloaderFileStem={`${id}-uniprot-variants`}
            showGlobalFilter
            columns={columns}
            loading={request.loading}
            rows={request.data?.variant.uniProtEvidences.rows}
            query={UNIPROT_VARIANTS_QUERY.loc.source.body}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
