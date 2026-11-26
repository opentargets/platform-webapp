import _ from "lodash";
import { useQuery } from "@apollo/client";
import {
  Tooltip,
  SectionItem,
  TooltipStyledLabel,
  OtTableServer,
  type OtTableColumn,
  PublicationsDrawer,
  Link,
} from "ui";
import Description from "./Description";
import {
  dataTypesMap,
  defaultRowsPerPageOptions,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceCrisprScreen,
  type EvidenceCrisprScreenSort,
  EvidenceCrisprScreenSortField,
  type EvidenceCrisprScreenSearch,
  EvidenceCrisprScreenSearchField,
  SortDirection,
} from "@ot/constants";
import { definition } from ".";

import { typedDocument } from "../../utils/typedDocument";
import CRISPR_SCREEN_QUERY_DOCUMENT from "./CrisprScreenQuery.gql";

type CrisprScreenRow = Pick<
  EvidenceCrisprScreen,
  | "studyId"
  | "projectId"
  | "crisprScreenLibrary"
  | "studyOverview"
  | "cellType"
  | "literature"
  | "diseaseFromSource"
  | "diseaseFromSourceMappedId"
  | "contrast"
  | "resourceScore"
  | "statisticalTestTail"
  | "phenotypicConsequenceScore"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { crisprScreen: { count: number; rows: CrisprScreenRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  sort: EvidenceCrisprScreenSort[];
  search?: EvidenceCrisprScreenSearch;
};

const CRISPR_SCREEN_QUERY = typedDocument<QueryData, QueryVariables>(
  CRISPR_SCREEN_QUERY_DOCUMENT
);
const PAGE_SIZE = 10;
// production sorted this table by significance, ascending
const DEFAULT_SORT = {
  id: "resourceScore",
  field: EvidenceCrisprScreenSortField.Significance,
  desc: false,
};

// This will hold more sources in future releases
const sources: Record<string, { name: string; url: string } | undefined> = {
  crispr_brain: {
    name: "CRISPRBrain",
    url: "https://crisprbrain.org/",
  },
};

// format the diseaseFromSource field: remove the "essential genes" info
// this might be sorted at data level at some point
const parseDiseaseName = (d?: string | null) =>
  (d ?? "").toLowerCase().replace("essential genes / ", "");

const getColumns = (label: EvidenceBodyProps["label"]): OtTableColumn<CrisprScreenRow>[] => [
  {
    id: "diseaseFromSourceMappedId",
    label: "Reported disease",
    // Attach the CRISPR screen search fields to the first column.
    searchFields: [
      EvidenceCrisprScreenSearchField.DiseaseFromSource,
      EvidenceCrisprScreenSearchField.StudyId,
      EvidenceCrisprScreenSearchField.Contrast,
      EvidenceCrisprScreenSearchField.StudyOverview,
      EvidenceCrisprScreenSearchField.CellType,
      EvidenceCrisprScreenSearchField.Source,
    ],
    renderCell: row => {
      const disease = parseDiseaseName(row.diseaseFromSource);
      return (
        <Link asyncTooltip to={`/disease/${row.diseaseFromSourceMappedId}`}>
          {_.capitalize(disease)}
        </Link>
      );
    },
  },
  {
    id: "studyId",
    label: "Study Identifier",
    enableHiding: false,
    renderCell: row => (
      <Link external to={`https://crisprbrain.org/simple-screen/?screen=${row.studyId}`}>
        {row.studyId}
      </Link>
    ),
  },
  {
    id: "contrast",
    label: "Contrast / Study overview",
    renderCell: row => {
      // trim the last '.' - this could also be addressed at data level perhaps?
      const overview = row.studyOverview?.endsWith(".")
        ? row.studyOverview.slice(0, -1)
        : row.studyOverview;
      if (row.contrast && overview) {
        return (
          <Tooltip
            showHelpIcon
            title={
              <TooltipStyledLabel
                label={"SCREEN LIBRARY"}
                description={row.crisprScreenLibrary ?? ""}
                newline={false}
              />
            }
          >
            <span>
              {row.contrast} / {overview}
            </span>
          </Tooltip>
        );
      }
      if (row.contrast) return <span>{row.contrast}</span>;
      if (overview) return <span>{overview}</span>;
      return naLabel;
    },
  },
  {
    id: "cellType",
    label: "Cell type",
    renderCell: row => row.cellType,
    width: "12%",
  },
  {
    id: "phenotypicConsequenceScore",
    label: "log2 fold change",
    renderCell: row =>
      row.phenotypicConsequenceScore
        ? parseFloat(row.phenotypicConsequenceScore.toFixed(6))
        : naLabel,
    width: "9%",
  },
  {
    id: "resourceScore",
    label: "Significance",
    sortField: DEFAULT_SORT.field,
    renderCell: row => {
      if (row.resourceScore && row.statisticalTestTail) {
        return (
          <Tooltip
            showHelpIcon
            title={
              <TooltipStyledLabel
                label={"STATISTICAL TEST TAIL"}
                description={row.statisticalTestTail}
                newline={false}
              />
            }
          >
            <span>{parseFloat(row.resourceScore.toFixed(6))}</span>
          </Tooltip>
        );
      }
      return row.resourceScore ? parseFloat(row.resourceScore.toFixed(6)) : naLabel;
    },
    width: "9%",
  },
  {
    id: "projectId",
    label: "Source",
    renderCell: row => {
      const source = row.projectId ? sources[row.projectId] : undefined;
      if (!source) return row.projectId ?? naLabel;
      return (
        <Link external to={source.url}>
          {source.name}
        </Link>
      );
    },
    width: "9%",
  },
  {
    id: "literature",
    label: "Publication",
    renderCell: ({ literature }) => {
      if (literature.length === 0) return naLabel;
      return (
        <PublicationsDrawer
          entries={[{ name: literature[0] }]}
          symbol={label.symbol}
          name={label.name}
        />
      );
    },
    width: "9%",
  },
];

const exportColumns: OtTableColumn<CrisprScreenRow>[] = [
  {
    id: "disease",
    label: "disease",
    exportValue: (row: CrisprScreenRow) => parseDiseaseName(row.diseaseFromSource),
  },
  {
    id: "diseaseId",
    label: "disease id",
    exportValue: (row: CrisprScreenRow) => row.diseaseFromSourceMappedId,
  },
  {
    id: "studyId",
    label: "study identifier",
    exportValue: (row: CrisprScreenRow) => row.studyId,
  },
  {
    id: "contrast",
    label: "contrast",
    exportValue: (row: CrisprScreenRow) => row.contrast,
  },
  {
    id: "studyOverview",
    label: "study overview",
    exportValue: (row: CrisprScreenRow) => row.studyOverview,
  },
  {
    id: "cellType",
    label: "cell type",
    exportValue: (row: CrisprScreenRow) => row.cellType,
  },
  {
    id: "phenotypicConsequenceScore",
    label: "log2 fold change",
    exportValue: (row: CrisprScreenRow) => row.phenotypicConsequenceScore,
  },
  {
    id: "resourceScore",
    label: "significance",
    exportValue: (row: CrisprScreenRow) => row.resourceScore,
  },
  {
    id: "statisticalTestTail",
    label: "statistical test tail",
    exportValue: (row: CrisprScreenRow) => row.statisticalTestTail,
  },
  {
    id: "projectId",
    label: "source",
    exportValue: (row: CrisprScreenRow) => row.projectId,
  },
  {
    id: "literature",
    label: "publication",
    exportValue: (row: CrisprScreenRow) => row.literature.join(", "),
  },
];

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId, efoId } = id;
  const variables = { ensemblId: ensgId, efoId };
  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(CRISPR_SCREEN_QUERY, {
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

  const columns = getColumns(label);

  return (
    <SectionItem
      definition={definition}
      chipText={dataTypesMap.affected_pathway}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => {
        return (
          <OtTableServer<CrisprScreenRow>
            query={CRISPR_SCREEN_QUERY}
            columns={columns}
            dataDownloader
            dataDownloaderColumns={exportColumns}
            dataDownloaderFileStem={`${ensgId}-${efoId}-crisprscreen`}
            dataPath="disease.evidenceViews.crisprScreen"
            pageSize={PAGE_SIZE}
            pageSizeOptions={defaultRowsPerPageOptions}
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
