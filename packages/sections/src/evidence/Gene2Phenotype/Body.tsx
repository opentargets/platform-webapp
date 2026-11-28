import { useQuery } from "@apollo/client";
import { v1 } from "uuid";
import {
  SectionItem,
  Tooltip,
  Link,
  PublicationsDrawer,
  DirectionOfEffectIcon,
  DirectionOfEffectTooltip,
  OtTableServer,
  type OtTableColumn,
  List,
  ListItem,
  Typography,
} from "ui";

import {
  dataTypesMap,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceGene2Phenotype,
  type EvidenceGene2PhenotypeSort,
  EvidenceGene2PhenotypeSortField,
  SortDirection,
  type EvidenceGene2PhenotypeSearch,
  EvidenceGene2PhenotypeSearchField,
} from "@ot/constants";
import Description from "./Description";
import { epmcUrl, sentenceCase } from "@ot/utils";
import { typedDocument } from "../../utils/typedDocument";
import OPEN_TARGETS_GENETICS_QUERY_DOCUMENT from "./sectionQuery.gql";
import { definition } from ".";

type Gene2PhenotypeRow = Pick<
  EvidenceGene2Phenotype,
  | "score"
  | "diseaseId"
  | "diseaseName"
  | "diseaseFromSource"
  | "allelicRequirements"
  | "confidence"
  | "studyId"
  | "targetFromSourceId"
  | "variantFunctionalConsequenceId"
  | "variantFunctionalConsequenceLabel"
  | "literature"
  | "directionOnTarget"
  | "directionOnTrait"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { gene2Phenotype: { count: number; rows: Gene2PhenotypeRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  sort: EvidenceGene2PhenotypeSort[];
  search?: EvidenceGene2PhenotypeSearch;
};

const OPEN_TARGETS_GENETICS_QUERY = typedDocument<QueryData, QueryVariables>(
  OPEN_TARGETS_GENETICS_QUERY_DOCUMENT
);
const PAGE_SIZE = 10;
// the view's only sort key is the evidence score
const DEFAULT_SORT = {
  id: "score",
  field: EvidenceGene2PhenotypeSortField.Score,
  desc: true,
};

const g2pUrl = (targetFromSourceId?: string | null, diseaseFromSource?: string | null) =>
  `https://www.ebi.ac.uk/gene2phenotype/search?query=${targetFromSourceId}-related%20${diseaseFromSource}`;

const getColumns = (label: EvidenceBodyProps["label"]): OtTableColumn<Gene2PhenotypeRow>[] => [
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    enableHiding: false,
    // Attach the Gene2Phenotype search fields to the first column.
    searchFields: [
      EvidenceGene2PhenotypeSearchField.DiseaseName,
      EvidenceGene2PhenotypeSearchField.DiseaseFromSource,
      EvidenceGene2PhenotypeSearchField.VariantFunctionalConsequenceLabel,
      EvidenceGene2PhenotypeSearchField.AllelicRequirements,
      EvidenceGene2PhenotypeSearchField.StudyId,
      EvidenceGene2PhenotypeSearchField.Confidence,
    ],
    renderCell: ({ diseaseId, diseaseName, diseaseFromSource }) => (
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
        <Link asyncTooltip to={`/disease/${diseaseId}`}>
          {diseaseName}
        </Link>
      </Tooltip>
    ),
  },
  {
    id: "variantFunctionalConsequence",
    label: "Functional consequence",
    renderCell: ({ variantFunctionalConsequenceId, variantFunctionalConsequenceLabel }) =>
      variantFunctionalConsequenceId ? (
        <Link
          external
          // the view returns "SO_0001583", the browser expects "SO:0001583"
          to={`http://www.sequenceontology.org/browser/current_svn/term/${variantFunctionalConsequenceId.replace("_", ":")}`}
        >
          {sentenceCase(variantFunctionalConsequenceLabel)}
        </Link>
      ) : (
        naLabel
      ),
    exportValue: ({ variantFunctionalConsequenceLabel }) =>
      sentenceCase(variantFunctionalConsequenceLabel),
  },
  {
    id: "directionOfVariantEffect",
    label: (
      <DirectionOfEffectTooltip docsUrl="https://platform-docs.opentargets.org/evidence#gene2phenotype"></DirectionOfEffectTooltip>
    ),
    renderCell: ({ directionOnTarget, directionOnTrait }) => {
      return (
        <DirectionOfEffectIcon variantEffect={directionOnTarget ?? ""} directionOnTrait={directionOnTrait ?? ""} />
      );
    },
    exportLabel: "Direction of effect",
    exportValue: ({ directionOnTarget, directionOnTrait }) =>
      [directionOnTarget, directionOnTrait].filter(Boolean).join(", "),
  },
  {
    id: "allelicRequirements",
    label: "Allelic requirement",
    renderCell: ({ allelicRequirements }) => {
      if (allelicRequirements.length > 1) {
        return (
          <List>
            {allelicRequirements.map(item => (
              <ListItem key={v1()}>{item}</ListItem>
            ))}
          </List>
        );
      }
      if (allelicRequirements.length === 1) {
        return sentenceCase(allelicRequirements[0]);
      }

      return naLabel;
    },
    exportValue: ({ allelicRequirements }) => allelicRequirements.join(", "),
  },
  {
    id: "studyId",
    label: "Panel",
    enableHiding: false,
    renderCell: ({ studyId, targetFromSourceId, diseaseFromSource }) => (
      <Link external to={g2pUrl(targetFromSourceId, diseaseFromSource)}>
        {studyId}
      </Link>
    ),
  },
  {
    id: "confidence",
    label: "Confidence category",
    renderCell: ({ confidence }) =>
      confidence ? (
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
          {sentenceCase(confidence)}
        </Tooltip>
      ) : (
        naLabel
      ),
  },
  {
    id: "score",
    label: "Score",
    tooltip: "Evidence score, from 0 to 1",
    numeric: true,
    sortField: DEFAULT_SORT.field,
    renderCell: ({ score }) => score.toFixed(2),
  },
  {
    id: "literature",
    label: "Literature",
    renderCell: ({ literature }) => {
      const entries = literature.map(id => ({
        name: id,
        url: epmcUrl(id),
        group: "literature",
      }));
      return <PublicationsDrawer entries={entries} symbol={label.symbol} name={label.name} />;
    },
    exportValue: ({ literature }) => literature.join(", "),
  },
];

function Body({ id: { ensgId, efoId }, label: { symbol, name }, entity }: EvidenceBodyProps) {
  const variables = { ensemblId: ensgId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(OPEN_TARGETS_GENETICS_QUERY, {
    variables: {
      ...variables,
      index: 0,
      size: PAGE_SIZE,
      sort: [
        {
          key: DEFAULT_SORT.field,
          direction: DEFAULT_SORT.desc ? SortDirection.Descending : SortDirection.Ascending,
        },
      ],
    },
  });

  const columns = getColumns({ symbol, name });

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.genetic_association}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={symbol} name={name} />}
      renderBody={() => (
        <OtTableServer<Gene2PhenotypeRow>
          query={OPEN_TARGETS_GENETICS_QUERY}
          columns={columns}
          dataDownloader
          dataDownloaderFileStem={`${ensgId}-${efoId}-gene2phenotype`}
          dataPath="disease.evidenceViews.gene2Phenotype"
          pageSize={PAGE_SIZE}
          sortBy={DEFAULT_SORT.id}
          order={DEFAULT_SORT.desc ? "desc" : "asc"}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
