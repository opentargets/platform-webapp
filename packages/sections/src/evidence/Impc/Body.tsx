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
  type OtTableColumn,
  Typography,
} from "ui";

import { definition } from ".";
import Description from "./Description";
import { typedDocument } from "../../utils/typedDocument";
import IMPC_QUERY_DOCUMENT from "./sectionQuery.gql";

import { sentenceCase } from "@ot/utils";
import { dataTypesMap, naLabel, type EvidenceBodyProps, type EvidenceImpc } from "@ot/constants";

type ImpcRow = Pick<
  EvidenceImpc,
  | "diseaseId"
  | "diseaseName"
  | "directionOnTarget"
  | "directionOnTrait"
  | "diseaseFromSource"
  | "biologicalModelGeneticBackground"
  | "biologicalModelAllelicComposition"
  | "biologicalModelId"
  | "diseaseModelAssociatedModelPhenotypes"
  | "diseaseModelAssociatedHumanPhenotypes"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { impc: { count: number; rows: ImpcRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
};

const IMPC_QUERY = typedDocument<QueryData, QueryVariables>(IMPC_QUERY_DOCUMENT);
const PAGE_SIZE = 10;

const phenotypesMessage = (count: number) => `${count} phenotype${count !== 1 ? "s" : ""}`;

const columns: OtTableColumn<ImpcRow>[] = [
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    renderCell: ({ diseaseId, diseaseName, diseaseFromSource }) => (
      <Tooltip
        title={
          <>
            <Typography variant="subtitle2" display="block" align="center">
              Reported disease or phenotype:
            </Typography>
            <Typography variant="caption" display="block" align="center">
              {sentenceCase(diseaseFromSource ?? "")}
            </Typography>
          </>
        }
        showHelpIcon
      >
        <Link asyncTooltip to={`/disease/${diseaseId}`}>
          {diseaseName}
        </Link>
      </Tooltip>
    ),
  },
  {
    id: "diseaseModelAssociatedHumanPhenotypes",
    label: "Human phenotypes",
    renderCell: ({ diseaseModelAssociatedHumanPhenotypes: humanPhenotypes }) => (
      <TableDrawer
        entries={humanPhenotypes.map(entry => ({
          name: entry.label,
          group: "Human phenotypes",
        }))}
        showSingle={false}
        message={phenotypesMessage(humanPhenotypes.length)}
      />
    ),
    exportValue: ({ diseaseModelAssociatedHumanPhenotypes }) =>
      diseaseModelAssociatedHumanPhenotypes.map(phenotype => phenotype.label).join(", "),
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
        message={phenotypesMessage(mousePhenotypes.length)}
      />
    ),
    exportValue: ({ diseaseModelAssociatedModelPhenotypes }) =>
      diseaseModelAssociatedModelPhenotypes.map(phenotype => phenotype.label).join(", "),
  },
  {
    id: "directionOfVariantEffect",
    label: (
      <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#impc"></DirectionOfEffectTooltip>
    ),
    renderCell: ({ directionOnTarget, directionOnTrait }) => {
      return (
        <DirectionOfEffectIcon
          variantEffect={directionOnTarget ?? ""}
          directionOnTrait={directionOnTrait ?? ""}
        />
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

const exportColumns: OtTableColumn<ImpcRow>[] = [
  {
    id: "diseaseId",
    label: "diseaseId",
    exportValue: (row: ImpcRow) => row.diseaseId,
  },
  {
    id: "diseaseName",
    label: "diseaseName",
    exportValue: (row: ImpcRow) => row.diseaseName,
  },
  {
    id: "diseaseModelAssociatedHumanPhenotypes",
    label: "diseaseModelAssociatedHumanPhenotypes",
    exportValue: (row: ImpcRow) =>
      row.diseaseModelAssociatedHumanPhenotypes.map(phenotype => phenotype.label).join(", "),
  },
  {
    id: "diseaseModelAssociatedModelPhenotypes",
    label: "diseaseModelAssociatedModelPhenotypes",
    exportValue: (row: ImpcRow) =>
      row.diseaseModelAssociatedModelPhenotypes.map(phenotype => phenotype.label).join(", "),
  },
  {
    id: "literature",
    label: "literature",
    exportValue: (row: ImpcRow) => row.biologicalModelId,
  },
];

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId: ensemblId, efoId } = id;
  const variables = { ensemblId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(IMPC_QUERY, {
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
        <OtTableServer<ImpcRow>
          query={IMPC_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderColumns={exportColumns}
          dataDownloaderFileStem="impc-evidence"
          dataPath="disease.evidenceViews.impc"
          pageSize={PAGE_SIZE}
          // no search on the IMPC view: a browser search would fetch every row
          showGlobalFilter={false}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
