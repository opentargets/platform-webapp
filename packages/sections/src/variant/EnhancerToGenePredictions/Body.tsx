import { useQuery } from "@apollo/client";
import { Link, SectionItem, OtTableServer, Tooltip } from "ui";
import {
  EnhancerToGeneSearchField,
  EnhancerToGeneSortField,
  naLabel,
  SortDirection,
} from "@ot/constants";
import { definition } from ".";

import Description from "./Description";
import ENHANCER_TO_GENE_PREDICTIONS_QUERY from "./EnhancerToGenePredictionsQuery.gql";

interface Target {
  id: string;
  approvedSymbol: string;
  approvedName: string;
}

interface Biosample {
  biosampleId: string;
  biosampleName: string;
}

const DEFAULT_SORT = {
  id: "score",
  field: EnhancerToGeneSortField.Score,
  desc: true,
};

const columns = [
  {
    id: "target",
    label: "Gene",
    enableHiding: false,
    sticky: true,
    // For now, attach all search fields to the first column.
    searchFields: Object.values(EnhancerToGeneSearchField),
    renderCell: ({ target }: { target?: Target | null }) => {
      if (!target) return naLabel;
      return (
        <Link asyncTooltip to={`/target/${target.id}`}>
          {target.approvedSymbol}
        </Link>
      );
    },
    exportValue: ({ target }: { target?: Target | null }) => target?.approvedSymbol ?? "",
  },
  {
    id: "biosample",
    label: "Affected tissue/cell",
    enableHiding: false,
    renderCell: ({ biosample, biosampleFromSourceId }: {
      biosample?: Biosample | null;
      biosampleFromSourceId?: string | null;
    }) => {
      const label = biosample?.biosampleName || biosample?.biosampleId;
      if (!label) return naLabel;
      return (
        <Tooltip title={biosampleFromSourceId || ""}>
          {biosample?.biosampleId ? (
            <Link external to={`https://www.ebi.ac.uk/ols4/search?q=${biosample.biosampleId}`}>
              {label}
            </Link>
          ) : label}
        </Tooltip>
      );
    },
    exportValue: ({ biosample }: {
      biosample?: Biosample | null;
    }) => biosample?.biosampleName || biosample?.biosampleId || "",
  },
  {
    id: "intervalType",
    label: "Interval type",
    sortField: EnhancerToGeneSortField.IntervalType,
    renderCell: ({ intervalType }: { intervalType: string }) => {
      if (!intervalType) return naLabel;
      return intervalType;
    },
  },
  {
    id: "studyId",
    label: "Study",
    renderCell: ({ studyId }: { studyId: string }) => {
      if (!studyId) return naLabel;
      return (
        <Link
          external
          to={`https://www.encodeproject.org/experiments/${studyId}/`}
        >
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
    renderCell: ({ distanceToTss }: { distanceToTss: number }) => {
      if (distanceToTss === null || distanceToTss === undefined) return naLabel;
      return `${distanceToTss.toLocaleString()}`;
    },
    exportValue: ({ distanceToTss }: { distanceToTss: number }) =>
      distanceToTss ?? "",
  },
  {
    id: "size",
    label: "Interval size (bp)",
    numeric: true,
    sortField: EnhancerToGeneSortField.IntervalSize,
    renderCell: ({ start, end }: { start: number; end: number }) => {
      if (start == null || end == null) return naLabel;
      return `${(end - start + 1).toLocaleString()}`;
    },
    exportValue: ({ start, end }: { start: number; end: number }) =>
      start == null || end == null ? "" : end - start + 1,
  },
  {
    id: "start_end",
    label: "Interval range",
    numeric: true,
    exportValue: ({ chromosome, start, end }: { chromosome: string; start: number; end: number }) =>
      chromosome == null || start == null || end == null ? "" : `${chromosome}:${start}-${end}`,
    renderCell: ({
      chromosome,
      start,
      end,
    }: {
      chromosome: string;
      start: number;
      end: number;
    }) => {
      if (chromosome == null || start == null || end == null) return naLabel;
      return `${chromosome}:${start.toLocaleString()}-${end.toLocaleString()}`;
    },
  },
  {
    id: "score",
    label: "Score",
    numeric: true,
    sortField: DEFAULT_SORT.field,
    tooltip: (
      <>
        This score (0-1) from E2G reflects the confidence that this genomic
        region regulates its target gene, obtained by integrating epigenomic and
        3D chromatin data
      </>
    ),
    renderCell: ({ score }: { score: number }) => {
      if (score === null || score === undefined) return naLabel;
      return score.toFixed(3);
    },
  },
];

type BodyProps = {
  id: string;
  entity: string;
};

const PAGE_SIZE = 10;

function Body({ id, entity }: BodyProps) {
  const variables = { variantId: id };
  const request = useQuery(ENHANCER_TO_GENE_PREDICTIONS_QUERY, {
    variables: {
      ...variables,
      index: 0,
      size: PAGE_SIZE,
      sort: [{ key: DEFAULT_SORT.field, direction: SortDirection.Descending }],
    },
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => (
        <Description
          variantId={id}
          referenceAllele={request.data?.variant?.referenceAllele || ""}
          alternateAllele={request.data?.variant?.alternateAllele || ""}
        />
      )}
      renderBody={() => (
        <OtTableServer
          dataDownloader
          dataDownloaderFileStem={`${id}-enhancer-to-gene-predictions`}
          dataPath="variant.enhancerToGene"
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
