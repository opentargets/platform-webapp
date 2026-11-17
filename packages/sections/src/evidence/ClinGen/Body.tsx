import { useQuery } from "@apollo/client";
import { Link, Tooltip, SectionItem, OtTableServer, Typography } from "ui";

import {
  dataTypesMap,
  defaultRowsPerPageOptions,
  naLabel,
  type EvidenceBodyProps,
} from "@ot/constants";
import Description from "./Description";
import { definition } from ".";

import CLINGEN_QUERY from "./ClingenQuery.gql";

const columns = [
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
    id: "allelicRequirements",
    label: "Allelic requirement",
    renderCell: ({ allelicRequirements }) => {
      if (!allelicRequirements) return naLabel;
      if (allelicRequirements.length === 1) return allelicRequirements[0];

      return (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {allelicRequirements.map(allelicRequirement => (
            <li key={allelicRequirement}>{allelicRequirement}</li>
          ))}
        </ul>
      );
    },
    filterValue: ({ allelicRequirements }) =>
      allelicRequirements ? allelicRequirements.join() : "",
  },
  {
    id: "confidence",
    label: "Classification",
    renderCell: ({ confidence, urls }) => (
      <Tooltip
        title={
          <Typography variant="caption" display="block" align="center">
            As defined by the{" "}
            <Link external to="https://thegencc.org/faq.html#validity-termsdelphi-survey">
              GenCC Guidelines
            </Link>
          </Typography>
        }
        showHelpIcon
      >
        {urls && urls[0]?.url ? (
          <Link external to={urls[0].url}>
            {confidence}
          </Link>
        ) : (
          confidence
        )}
      </Tooltip>
    ),
  },
];

type Props = EvidenceBodyProps;

const PAGE_SIZE = 10;

function Body({ id, label, entity }: Props) {
  const { ensgId: ensemblId, efoId } = id;
  const variables = { ensemblId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(CLINGEN_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      chipText={dataTypesMap.genetic_association}
      request={request}
      renderDescription={() => <Description symbol={label.symbol} diseaseName={label.name} />}
      renderBody={() => (
        <OtTableServer
          query={CLINGEN_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderFileStem={`clingen-${ensemblId}-${efoId}`}
          dataPath="disease.clingenSummary"
          pageSize={PAGE_SIZE}
          pageSizeOptions={defaultRowsPerPageOptions}
          showGlobalFilter={false}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
