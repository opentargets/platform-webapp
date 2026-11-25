import { useQuery } from "@apollo/client";
import {
  Link,
  SectionItem,
  Tooltip,
  TableDrawer,
  MouseModelAllelicComposition,
  DirectionOfEffectIcon,
  DirectionOfEffectTooltip,
  OtTableServer,
  Typography,
} from "ui";

import { definition } from ".";
import Description from "./Description";
import INTOGEN_QUERY from "./sectionQuery.gql";

import { sentenceCase } from "@ot/utils";
import { dataTypesMap, naLabel, type EvidenceBodyProps} from "@ot/constants";

const columns = [
  {
    id: "disease",
    label: "Disease/phenotype",
    renderCell: ({ disease, diseaseFromSource }) => (
      <Tooltip
        title={
          <>
            <Typography variant="subtitle2" display="block" align="center">
              Reported disease or phenotype:
            </Typography>
            <Typography variant="caption" display="block" align="center">
              {sentenceCase(diseaseFromSource)}
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
    filterValue: ({ disease, diseaseFromSource }) => [disease.name, diseaseFromSource].join(),
  },
  {
    id: "diseaseModelAssociatedHumanPhenotypes",
    label: "Human phenotypes",
    renderCell: ({ diseaseModelAssociatedHumanPhenotypes: humanPhenotypes }) => {
      const entries = humanPhenotypes
        ? humanPhenotypes.map(entry => ({
            name: entry.label,
            group: "Human phenotypes",
          }))
        : [];
      return (
        <TableDrawer
          entries={entries}
          showSingle={false}
          message={`${humanPhenotypes ? humanPhenotypes.length : 0} phenotype${
            humanPhenotypes === null || humanPhenotypes.length !== 1 ? "s" : ""
          }`}
        />
      );
    },
    filterValue: ({ diseaseModelAssociatedHumanPhenotypes = [] }) =>
      diseaseModelAssociatedHumanPhenotypes?.map(dmahp => dmahp.label).join(),
  },
  {
    id: "diseaseModelAssociatedModelPhenotypes",
    label: "Mouse phenotypes",

    renderCell: ({ diseaseModelAssociatedModelPhenotypes: mousePhenotypes }) => (
      <TableDrawer
        entries={mousePhenotypes.map(entry => ({
          name: entry.label,
          group: "Mouse phenotypes",
        }))}
        showSingle={false}
        message={`${mousePhenotypes.length} phenotype${mousePhenotypes.length !== 1 ? "s" : ""}`}
      />
    ),
    filterValue: ({ diseaseModelAssociatedModelPhenotypes = [] }) =>
      diseaseModelAssociatedModelPhenotypes.map(dmamp => dmamp.label).join(),
  },
  {
    id: "directionOfVariantEffect",
    label: (
      <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#impc"></DirectionOfEffectTooltip>
    ),
    renderCell: ({ directionOnTarget, directionOnTrait }) => {
      return (
        <DirectionOfEffectIcon variantEffect={directionOnTarget} directionOnTrait={directionOnTrait} />
      );
    },
  },
  {
    id: "literature",
    label: "Mouse model allelic composition",
    enableHiding: false,
    renderCell: ({
      biologicalModelAllelicComposition,
      biologicalModelGeneticBackground,
      biologicalModelId,
    }) => {
      if (
        biologicalModelAllelicComposition &&
        biologicalModelGeneticBackground &&
        biologicalModelId
      ) {
        return (
          <Link external to={`https://identifiers.org/${biologicalModelId}`}>
            <MouseModelAllelicComposition
              allelicComposition={biologicalModelAllelicComposition}
              geneticBackground={biologicalModelGeneticBackground}
            />
          </Link>
        );
      }
      if (biologicalModelAllelicComposition && biologicalModelGeneticBackground) {
        return (
          <MouseModelAllelicComposition
            allelicComposition={biologicalModelAllelicComposition}
            geneticBackground={biologicalModelGeneticBackground}
          />
        );
      }

      return naLabel;
    },
  },
];

const exportColumns = [
  {
    label: "diseaseId",
    exportValue: row => row.disease.id,
  },
  {
    label: "diseaseName",
    exportValue: row => row.disease.name,
  },
  {
    label: "diseaseModelAssociatedHumanPhenotypes",
    exportValue: row => row.diseaseModelAssociatedHumanPhenotypes,
  },
  {
    label: "diseaseModelAssociatedModelPhenotypes",
    exportValue: row => row.diseaseModelAssociatedModelPhenotypes,
  },
  {
    label: "literature",
    exportValue: row => row.biologicalModelId,
  },
];

type Props = EvidenceBodyProps;

const PAGE_SIZE = 10;

function Body({ id, label, entity }: Props) {
  const { ensgId: ensemblId, efoId } = id;
  const variables = { ensemblId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(INTOGEN_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.animal_model}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => (
        <OtTableServer
          query={INTOGEN_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderColumns={exportColumns}
          dataDownloaderFileStem="impc-evidence"
          dataPath="disease.impc"
          pageSize={PAGE_SIZE}
          showGlobalFilter={false}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
