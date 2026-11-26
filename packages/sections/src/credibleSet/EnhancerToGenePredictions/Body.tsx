import { useQuery } from "@apollo/client";
import { Link, SectionItem, OtTableServer, type OtTableColumn, Tooltip } from "ui";
import {
  type EnhancerToGene,
  type EnhancerToGeneSearch,
  EnhancerToGeneSearchField,
  type EnhancerToGeneSort,
  EnhancerToGeneSortField,
  naLabel,
  SortDirection,
} from "@ot/constants";
import { definition } from ".";

import Description from "./Description";
import ENHANCER_TO_GENE_PREDICTIONS_QUERY_DOCUMENT from "./EnhancerToGenePredictionsQuery.gql";
import { typedDocument } from "../../utils/typedDocument";

interface Target {
  id: string;
  approvedSymbol: string;
  approvedName: string;
}

interface Biosample {
  biosampleId: string;
  biosampleName: string;
}

type E2GRow = Omit<EnhancerToGene, "target" | "biosample" | "qualityControls"> & {
  target?: Target | null;
  biosample?: Biosample | null;
};

type QueryData = {
  credibleSet?: {
    credibleSetId: string;
    leadVariant?: {
      variantId: string;
      referenceAllele: string;
      alternateAllele: string;
      enhancerToGene: { count: number; rows: E2GRow[] };
    } | null;
  } | null;
};

type QueryVariables = {
  credibleSetId: string;
  index: number;
  size: number;
  sort: EnhancerToGeneSort[];
  search?: EnhancerToGeneSearch;
};

const ENHANCER_TO_GENE_PREDICTIONS_QUERY = typedDocument<QueryData, QueryVariables>(
  ENHANCER_TO_GENE_PREDICTIONS_QUERY_DOCUMENT
);
const PAGE_SIZE = 10;
const DEFAULT_SORT = {
  id: "score",
  field: EnhancerToGeneSortField.Score,
  desc: true,
};

const columns: OtTableColumn<E2GRow>[] = [
  {
    id: "target",
    label: "Gene",
    enableHiding: false,
    sticky: true,
    // For now, attach all search fields to the first column.
    searchFields: Object.values(EnhancerToGeneSearchField),
    renderCell: ({ target }) => {
      if (!target) return naLabel;
      return (
        <Link asyncTooltip to={`/target/${target.id}`}>
          {target.approvedSymbol}
        </Link>
      );
    },
    exportValue: ({ target }) => target?.approvedSymbol,
  },
  {
    id: "biosample",
    label: "Affected tissue/cell",
    enableHiding: false,
    renderCell: ({ biosample, biosampleFromSourceId }) => {
      const label = biosample?.biosampleName || biosample?.biosampleId;
      if (!label) return naLabel;
      return (
        <Tooltip title={biosampleFromSourceId || ""}>
          {biosample?.biosampleId ? (
            <Link external to={`https://www.ebi.ac.uk/ols4/search?q=${biosample.biosampleId}`}>
              {label}
            </Link>
          ) : (
            label
          )}
        </Tooltip>
      );
    },
    exportValue: ({ biosample }) => biosample?.biosampleName || biosample?.biosampleId || "",
  },
  {
    id: "intervalType",
    label: "Interval type",
    sortField: EnhancerToGeneSortField.IntervalType,
    renderCell: ({ intervalType }) => {
      if (!intervalType) return naLabel;
      return intervalType;
    },
  },
  {
    id: "studyId",
    label: "Study",
    renderCell: ({ studyId }) => {
      if (!studyId) return naLabel;
      return (
        <Link external to={`https://www.encodeproject.org/experiments/${studyId}/`}>
          {studyId}
        </Link>
      );
    },
  },
  {
    id: "distanceToTss",
    label: "Distance from start site (bp)",
    numeric: true,
    sortField: EnhancerToGeneSortField.DistanceToTss,
    renderCell: ({ distanceToTss }) => distanceToTss.toLocaleString(),
    exportValue: ({ distanceToTss }) => distanceToTss?.toString(),
  },
  {
    id: "size",
    label: "Interval size (bp)",
    numeric: true,
    sortField: EnhancerToGeneSortField.IntervalSize,
    renderCell: ({ start, end }) => `${(end - start + 1).toLocaleString()}`,
    exportValue: ({ start, end }) => `${(end - start + 1).toString()}`,
  },
  {
    id: "start_end",
    label: "Interval range",
    numeric: true,
    exportValue: ({ chromosome, start, end }) =>
      `${chromosome}:${start.toString()}-${end.toString()}`,
    renderCell: ({ chromosome, start, end }) =>
      `${chromosome}:${start.toLocaleString()}-${end.toLocaleString()}`,
  },
  {
    id: "score",
    label: "Score",
    numeric: true,
    sortField: DEFAULT_SORT.field,
    tooltip: (
      <>
        This score (0-1) from E2G reflects the confidence that this genomic region regulates its
        target gene, obtained by integrating epigenomic and 3D chromatin data
      </>
    ),
    renderCell: ({ score }) => score.toFixed(3),
    exportValue: ({ score }) => score.toString(),
  },
];

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ id, entity }: BodyProps) {
  const variables = { credibleSetId: id };
  const request = useQuery(ENHANCER_TO_GENE_PREDICTIONS_QUERY, {
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
      entity={entity}
      request={request}
      renderDescription={() => (
        <Description
          variantId={request.data?.credibleSet?.leadVariant?.variantId || ""}
          referenceAllele={request.data?.credibleSet?.leadVariant?.referenceAllele || ""}
          alternateAllele={request.data?.credibleSet?.leadVariant?.alternateAllele || ""}
        />
      )}
      renderBody={() => (
        <OtTableServer<E2GRow>
          dataDownloader
          dataDownloaderFileStem={`${id}-enhancer-to-gene-predictions`}
          dataPath="credibleSet.leadVariant.enhancerToGene"
          pageSize={PAGE_SIZE}
          sortBy={DEFAULT_SORT.id}
          order={DEFAULT_SORT.desc ? "desc" : "asc"}
          columns={columns}
          query={ENHANCER_TO_GENE_PREDICTIONS_QUERY}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
