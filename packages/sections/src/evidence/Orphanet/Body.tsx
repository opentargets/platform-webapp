import { useQuery } from "@apollo/client";
import { Typography } from "@mui/material";
import {
  Link,
  Tooltip,
  SectionItem,
  PublicationsDrawer,
  DirectionOfEffectIcon,
  DirectionOfEffectTooltip,
  OtTable,
} from "ui";

import { definition } from ".";
import { dataTypesMap, naLabel, sectionsBaseSizeQuery } from "@ot/constants";
import { epmcUrl, sentenceCase } from "@ot/utils";
import Description from "./Description";

import ORPHANET_QUERY from "./OrphanetQuery.gql";

const getColumns = label => [
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
    filterValue: ({ disease, diseaseFromSource }) =>
      `${disease.name} ${disease.id} ${diseaseFromSource}`,
  },
  {
    id: "targetFromSourceId",
    label: "Reported protein",
    renderCell: ({ targetFromSource, targetFromSourceId }) => (
      <Link to={`/target/${targetFromSourceId}`}>{targetFromSource}</Link>
    ),
    filterValue: ({ targetFromSource, targetFromSourceId }) =>
      `${targetFromSource} ${targetFromSourceId}`,
  },
  {
    id: "variantFunctionalConsequence",
    label: "Functional consequence",
    enableHiding: false,
    renderCell: ({ variantFunctionalConsequence }) =>
      variantFunctionalConsequence ? (
        <Link
          external
          to={`http://www.sequenceontology.org/browser/current_svn/term/${variantFunctionalConsequence.id}`}
        >
          {sentenceCase(variantFunctionalConsequence.label)}
        </Link>
      ) : (
        naLabel
      ),
    filterValue: ({ variantFunctionalConsequence }) =>
      sentenceCase(variantFunctionalConsequence?.label),
  },
  {
    id: "directionOfVariantEffect",
    label: (
      <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#orphanet"></DirectionOfEffectTooltip>
    ),
    renderCell: ({ directionOnTarget, directionOnTrait }) => {
      return (
        <DirectionOfEffectIcon variantEffect={directionOnTarget} directionOnTrait={directionOnTrait} />
      );
    },
  },
  {
    id: "alleleOrigins",
    label: "Allele origin",
    renderCell: ({ alleleOrigins }) => alleleOrigins.join("; "),
    filterValue: ({ alleleOrigins }) => alleleOrigins.join("; "),
  },
  {
    id: "confidence",
    label: "Confidence",
    renderCell: ({ confidence }) => confidence,
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

const exportColumns = [
  {
    label: "Disease",
    exportValue: row => row.disease.name,
  },
  {
    label: "Disease ID",
    exportValue: row => row.disease.id,
  },
  {
    label: "Disease from source",
    exportValue: row => row.diseaseFromSource,
  },
  {
    label: "Target from source",
    exportValue: row => row.targetFromSource,
  },
  {
    label: "Target from source ID",
    exportValue: row => row.targetFromSourceId,
  },
  {
    label: "Allele origins",
    exportValue: row => row.alleleOrigins.join("; "),
  },
  {
    label: "Functional consequence",
    exportValue: row => sentenceCase(row.variantFunctionalConsequence.label),
  },
  {
    label: "Functional consequence ID",
    exportValue: row => row.variantFunctionalConsequence.id,
  },
  {
    label: "Confidence",
    exportValue: row => row.confidence,
  },
  {
    label: "Publication IDs",
    exportValue: row => row.literature.join(", "),
  },
];

type Props = {
  id: { ensgId: string; efoId: string };
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

  const request = useQuery(ORPHANET_QUERY, {
    variables,
  });

  const columns = getColumns(label);

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
            rows={request.data?.disease.orphanetSummary.rows}
            dataDownloader
            dataDownloaderFileStem={`orphanet-${ensgId}-${efoId}`}
            dataDownloaderColumns={exportColumns}
            showGlobalFilter
            query={ORPHANET_QUERY.loc.source.body}
            variables={variables}
            loading={request.loading}
          />
        );
      }}
    />
  );
}

export default Body;
