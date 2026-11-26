import { useQuery } from "@apollo/client";
import { SectionItem, TableDrawer, OtTableServer, type OtTableColumn, Link } from "ui";

import {
  dataTypesMap,
  naLabel,
  type EvidenceBodyProps,
  type EvidenceCrispr,
  type EvidenceCrisprSort,
  EvidenceCrisprSortField,
  type EvidenceCrisprSearch,
  EvidenceCrisprSearchField,
  SortDirection,
} from "@ot/constants";
import Description from "./Description";
import { definition } from ".";

import { typedDocument } from "../../utils/typedDocument";
import CRISPR_QUERY_DOCUMENT from "./CrisprQuery.gql";

type CrisprRow = Pick<
  EvidenceCrispr,
  "diseaseId" | "diseaseName" | "diseaseCellLines" | "diseaseFromSource" | "resourceScore" | "literature"
>;

type QueryData = {
  disease?: {
    id: string;
    evidenceViews: { crispr: { count: number; rows: CrisprRow[] } };
  } | null;
};

type QueryVariables = {
  ensemblId: string;
  efoId: string;
  index: number;
  size: number;
  sort: EvidenceCrisprSort[];
  search?: EvidenceCrisprSearch;
};

const CRISPR_QUERY = typedDocument<QueryData, QueryVariables>(CRISPR_QUERY_DOCUMENT);
const PAGE_SIZE = 10;
// the view's only sort key is the evidence score, which is the priority score / 100
const DEFAULT_SORT = {
  id: "resourceScore",
  field: EvidenceCrisprSortField.Score,
  desc: true,
};

const columns: OtTableColumn<CrisprRow>[] = [
  {
    id: "diseaseName",
    label: "Disease/phenotype",
    enableHiding: false,
    // Attach the CRISPR search fields to the first column.
    searchFields: [EvidenceCrisprSearchField.DiseaseName, EvidenceCrisprSearchField.DiseaseFromSource],
    renderCell: ({ diseaseId, diseaseName }) => (
      <Link asyncTooltip to={`/disease/${diseaseId}`}>
        {diseaseName}
      </Link>
    ),
  },
  {
    id: "diseaseFromSource",
    label: "Reported disease/phenotype",
    enableHiding: false,
    renderCell: ({ diseaseCellLines, diseaseFromSource }) => {
      if (diseaseCellLines.length === 0) return naLabel;

      const cellLines = diseaseCellLines.map(line => ({
        name: line.name ?? "",
        url: `https://cellmodelpassports.sanger.ac.uk/passports/${line.id}`,
        group: "Cancer Cell Lines",
      }));

      return (
        <TableDrawer
          entries={cellLines}
          message={`${diseaseCellLines.length} ${diseaseFromSource} cell lines`}
        />
      );
    },
    exportValue: ({ diseaseFromSource }) => diseaseFromSource ?? "",
  },
  {
    id: "resourceScore",
    label: "Priority score",
    sortField: DEFAULT_SORT.field,
    renderCell: ({ resourceScore }) => resourceScore?.toFixed(3) ?? naLabel,
  },
];

function Body({ id, label, entity }: EvidenceBodyProps) {
  const { ensgId, efoId } = id;

  const variables = { ensemblId: ensgId, efoId };

  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(CRISPR_QUERY, {
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
      chipText={dataTypesMap.affected_pathway}
      request={request}
      entity={entity}
      renderDescription={() => <Description symbol={label.symbol} name={label.name} />}
      renderBody={() => {
        return (
          <OtTableServer<CrisprRow>
            query={CRISPR_QUERY}
            columns={columns}
            dataDownloader
            dataDownloaderFileStem={`crispr-evidence-${ensgId}-${efoId}`}
            dataPath="disease.evidenceViews.crispr"
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
