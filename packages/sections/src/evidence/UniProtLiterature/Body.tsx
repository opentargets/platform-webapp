import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";
import { Link, SectionItem, Tooltip, PublicationsDrawer, OtTable } from "ui";

import { definition } from ".";
import Description from "./Description";
import { epmcUrl, identifiersOrgLink, sentenceCase } from "@ot/utils";
import { dataTypesMap, sectionsBaseSizeQuery, EvidenceBodyProps} from "@ot/constants";
import UNIPROT_LITERATURE_QUERY from "./UniprotLiteratureQuery.gql";

const getcolumns = label => [
  {
    id: "disease.name",
    label: "Disease/phenotype",
    enableHiding: false,
    renderCell: ({ disease, diseaseFromSource }) => (
      <Tooltip
        title={
          <>
            <Typography variant="subtitle2" display="block" align="center">
              Reported disease or phenotype:
            </Typography>
            <Typography variant="caption" display="block" align="center">
              {diseaseFromSource}
            </Typography>
          </>
        }
        showHelpIcon
      >
        <Link asyncTooltip to={`/disease/${disease.id}`}>
          {disease.name}
        </Link>
      </Tooltip>
    ),
  },
  {
    id: "targetFromSourceId",
    label: "Reported protein",
    enableHiding: false,
    renderCell: ({ targetFromSourceId }) => (
      <Link external to={identifiersOrgLink("uniprot", targetFromSourceId)}>
        {targetFromSourceId}
      </Link>
    ),
  },
  {
    id: "confidence",
    label: "Confidence",
    renderCell: ({ confidence }) => <>{sentenceCase(confidence)}</>,
  },
  {
    id: "literature",
    label: "Literature",
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

      return (
        <PublicationsDrawer entries={literatureList} symbol={label.symbol} name={label.name} />
      );
    },
  },
];

type Props = EvidenceBodyProps;
  entity: string;
  label: { symbol: string; name: string };
};

function Body({ id, label, entity }: Props) {
  const { ensgId, efoId } = id;

  const variables = {
    ensemblId: ensgId,
    efoId,
    size: sectionsBaseSizeQuery,
  };

  const request = useQuery(UNIPROT_LITERATURE_QUERY, {
    variables,
  });

  const columns = getcolumns(label);

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.genetic_association}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} diseaseName={label.name} />}
      renderBody={() => {
        return (
          <OtTable
            columns={columns}
            rows={request.data?.disease.uniprotLiteratureSummary.rows}
            dataDownloader
            dataDownloaderFileStem={`UniProtLiterature-${ensgId}-${efoId}`}
            showGlobalFilter
            query={UNIPROT_LITERATURE_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
