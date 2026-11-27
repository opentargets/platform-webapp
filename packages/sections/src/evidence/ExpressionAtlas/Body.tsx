import { useQuery } from "@apollo/client";
import {
  SectionItem,
  Tooltip,
  Link,
  ScientificNotation,
  OtTableServer,
  type OtTableColumn,
  Typography,
} from "ui";

import Description from "./Description";
import { sentenceCase } from "@ot/utils";
import { typedDocument } from "../../utils/typedDocument";
import EXPRESSION_ATLAS_QUERY_DOCUMENT from "./ExpressionAtlasQuery.gql";
import { definition } from ".";
import {
  dataTypesMap,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceExpressionAtlas,
  type EvidenceExpressionAtlasSort,
  EvidenceExpressionAtlasSortField,
  type EvidenceExpressionAtlasSearch,
  EvidenceExpressionAtlasSearchField,
  SortDirection,
} from "@ot/constants";

type ExpressionAtlasRow = Pick<
  EvidenceExpressionAtlas,
  | "diseaseId"
  | "diseaseName"
  | "diseaseFromSource"
  | "contrast"
  | "confidence"
  | "studyOverview"
  | "log2FoldChangeValue"
  | "resourceScore"
  | "log2FoldChangePercentileRank"
  | "studyId"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { expressionAtlas: { count: number; rows: ExpressionAtlasRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  sort: EvidenceExpressionAtlasSort[];
  search?: EvidenceExpressionAtlasSearch;
};

const EXPRESSION_ATLAS_QUERY = typedDocument<QueryData, QueryVariables>(
  EXPRESSION_ATLAS_QUERY_DOCUMENT
);
const PAGE_SIZE = 10;
// production sorted this table by p-value, ascending
const DEFAULT_SORT = {
  id: "resourceScore",
  field: EvidenceExpressionAtlasSortField.PValue,
  desc: false,
};

const columns: OtTableColumn<ExpressionAtlasRow>[] = [
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    // Attach the Expression Atlas search fields to the first column.
    searchFields: [
      EvidenceExpressionAtlasSearchField.DiseaseName,
      EvidenceExpressionAtlasSearchField.StudyId,
      EvidenceExpressionAtlasSearchField.Contrast,
      EvidenceExpressionAtlasSearchField.Confidence,
    ],
    renderCell: ({ diseaseId, diseaseName, diseaseFromSource }) => (
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
        <Link asyncTooltip to={`/disease/${diseaseId}`}>
          {diseaseName}
        </Link>
      </Tooltip>
    ),
  },
  {
    id: "studyId",
    label: "Experiment ID",
    enableHiding: false,
    renderCell: ({ studyId }) =>
      studyId ? (
        <Link external to={`http://www.ebi.ac.uk/gxa/experiments/${studyId}`}>
          {studyId}
        </Link>
      ) : (
        naLabel
      ),
  },
  {
    id: "contrast",
    label: "Experiment details",
    renderCell: ({ contrast, studyOverview }) => (
      <Tooltip title={studyOverview} showHelpIcon>
        <span>{contrast}</span>
      </Tooltip>
    ),
  },
  {
    id: "confidence",
    label: "Experiment confidence",
    renderCell: ({ confidence }) => (
      <Tooltip
        title={
          <Typography variant="caption" display="block" align="center">
            As defined by the{" "}
            <Link external to="https://www.ebi.ac.uk/gxa/FAQ.html">
              Expression Atlas Guideline
            </Link>
          </Typography>
        }
        showHelpIcon
      >
        {sentenceCase(confidence ?? "")}
      </Tooltip>
    ),
  },
  {
    id: "log2FoldChangeValue",
    label: (
      <>
        Log<sub>2</sub> fold change
      </>
    ),
    numeric: true,
    sortField: EvidenceExpressionAtlasSortField.Log2FoldChange,
  },
  {
    id: "log2FoldChangePercentileRank",
    label: "Percentile",
    numeric: true,
    sortField: EvidenceExpressionAtlasSortField.Percentile,
  },
  {
    id: "resourceScore",
    label: (
      <>
        <i>p</i>-value
      </>
    ),
    sortField: DEFAULT_SORT.field,
    renderCell: ({ resourceScore }) =>
      resourceScore != null ? <ScientificNotation number={resourceScore} /> : naLabel,
    numeric: true,
  },
];

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId, efoId } = id;
  const variables = { ensemblId: ensgId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(EXPRESSION_ATLAS_QUERY, {
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

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.rna_expression}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => {
        return (
          <OtTableServer<ExpressionAtlasRow>
            query={EXPRESSION_ATLAS_QUERY}
            columns={columns}
            dataDownloader
            dataDownloaderFileStem={`expression-atlas-${ensgId}-${efoId}`}
            dataPath="disease.evidenceViews.expressionAtlas"
            pageSize={PAGE_SIZE}
            sortBy={DEFAULT_SORT.id}
            order={DEFAULT_SORT.desc ? "desc" : "asc"}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
