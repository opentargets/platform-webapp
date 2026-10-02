import { useQuery } from "@apollo/client";
import { Link, SectionItem, OtTable, Tooltip, useReportSectionContext } from "ui";
import { naLabel } from "@ot/constants";
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
  biosampleFromSource?: string;
}

const columns = [
  {
    id: "target",
    label: "Gene",
    enableHiding: false,
    sticky: true,
    renderCell: ({ target }: { target: Target }) => {
      if (!target) return naLabel;
      return (
        <Link asyncTooltip to={`/target/${target.id}`}>
          {target.approvedSymbol}
        </Link>
      );
    },
    filterValue: ({ target }: { target: Target }) =>
      target?.approvedSymbol || "",
  },
  {
    id: "biosample",
    label: "Affected tissue/cell",
    enableHiding: false,
    renderCell: ({ biosample, biosampleFromSourceId }: { biosample: Biosample; biosampleFromSourceId?: string }) => {
      if (!biosample) return naLabel;
      return (
        <Tooltip title={biosampleFromSourceId || ""}>
        <Link
          external
          to={`https://www.ebi.ac.uk/ols4/search?q=${biosample.biosampleId}`}
        >
          {biosample.biosampleName || biosample.biosampleId}
        </Link>
        </Tooltip>
      );
    },
    filterValue: ({ biosample }: { biosample: Biosample }) =>
      biosample?.biosampleFromSource || biosample?.biosampleId || "",
  },
  {
    id: "intervalType",
    label: "Interval type",
    sortable: true,
    renderCell: ({ intervalType }: { intervalType: string }) => {
      if (!intervalType) return naLabel;
      return intervalType;
    },
    filterValue: ({ intervalType }: { intervalType: string }) =>
      intervalType || "",
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
    filterValue: ({ studyId }: { studyId: string }) => studyId || "",
  },
  {
    id: "distanceToTss",
    label: "Distance from start site (bp)",
    numeric: true,
    sortable: true,
    renderCell: ({ distanceToTss }: { distanceToTss: number }) => {
      if (distanceToTss === null || distanceToTss === undefined) return naLabel;
      return `${distanceToTss.toLocaleString()}`;
    },
    filterValue: ({ distanceToTss }: { distanceToTss: number }) =>
      distanceToTss?.toString() || "",
    exportValue: ({ distanceToTss }: { distanceToTss: number }) =>
      distanceToTss?.toString() || "",
    comparator: (a: any, b: any) => {
      const distanceA = a.distanceToTss;
      const distanceB = b.distanceToTss;

      // Handle null/undefined values - put them at the end
      if (distanceA === null || distanceA === undefined) return 1;
      if (distanceB === null || distanceB === undefined) return -1;

      // Numeric comparison
      return distanceA - distanceB;
    },
  },
  {
    id: "size",
    label: "Interval size (bp)",
    numeric: true,
    sortable: true,
    renderCell: ({ start, end }: { start: number; end: number }) => {
      if (
        start === null ||
        start === undefined ||
        end === null ||
        end === undefined
      )
        return naLabel;
      return `${(end - start + 1).toLocaleString()}`;
    },
    filterValue: ({ start, end }: { start: number; end: number }) =>
      start !== undefined && end !== undefined && start !== null && end !== null
        ? `${(end - start + 1).toLocaleString()}`
        : "",
    exportValue: ({ start, end }: { start: number; end: number }) => {
      if (
        start === null ||
        start === undefined ||
        end === null ||
        end === undefined
      )
        return naLabel;
      return `${(end - start + 1).toLocaleString()}`;
    },
    comparator: (a: any, b: any) => {
      const sizeA =
        a.start !== null &&
        a.start !== undefined &&
        a.end !== null &&
        a.end !== undefined
          ? a.end - a.start + 1
          : null;
      const sizeB =
        b.start !== null &&
        b.start !== undefined &&
        b.end !== null &&
        b.end !== undefined
          ? b.end - b.start + 1
          : null;

      // Handle null/undefined values - put them at the end
      if (sizeA === null) return 1;
      if (sizeB === null) return -1;

      // Numeric comparison
      return sizeA - sizeB;
    },
  },
  {
    id: "start_end",
    label: "Interval range",
    numeric: true,
    exportValue: ({ start, end }: { start: number; end: number }) =>
      start !== undefined && end !== undefined && start !== null && end !== null
        ? `${start}-${end}`
        : "",
    renderCell: ({
      chromosome,
      start,
      end,
    }: {
      chromosome: string;
      start: number;
      end: number;
    }) => {
      if (
        chromosome === null ||
        chromosome === undefined ||
        start === null ||
        start === undefined ||
        end === null ||
        end === undefined
      )
        return naLabel;
      return `${chromosome}:${start.toLocaleString()}-${end.toLocaleString()}`;
    },
    filterValue: ({
      chromosome,
      start,
      end,
    }: {
      chromosome: string;
      start: number;
      end: number;
    }) =>
      chromosome !== undefined &&
      start !== undefined &&
      end !== undefined &&
      chromosome !== null &&
      start !== null &&
      end !== null
        ? `${chromosome}:${start.toLocaleString()}-${end.toLocaleString()}`
        : "",
  },
  {
    id: "score",
    label: "Score",
    numeric: true,
    sortable: true,
    tooltip: (
      <>
        This score (0-1) from E2G reflects the confidence that this genomic
        region regulates its target gene, obtained by integrating epigenomic and
        3D chromatin data
      </>
    ),
    filterValue: ({ score }: { score: number }) => score?.toString() || "",
    comparator: (a: any, b: any) => {
      const scoreA = a.score;
      const scoreB = b.score;

      // Handle null/undefined values - put them at the end
      if (scoreA === null || scoreA === undefined) return 1;
      if (scoreB === null || scoreB === undefined) return -1;

      // Numeric comparison
      return scoreA - scoreB;
    },
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

function Body({ id, entity }: BodyProps) {
  const reportContext = useReportSectionContext();
  id = reportContext?.entityId || id;
  
  const variables = {
    variantId: id,
  };

  const request = useQuery(ENHANCER_TO_GENE_PREDICTIONS_QUERY, {
    variables,
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
        <OtTable
          dataDownloader
          dataDownloaderFileStem={`${id}-enhancer-to-gene-predictions`}
          showGlobalFilter
          columns={columns}
          loading={request.loading}
          rows={request.data?.variant?.enhancerToGenes?.rows || []}
          query={ENHANCER_TO_GENE_PREDICTIONS_QUERY.loc?.source?.body}
          variables={variables}
          tableDataLoading={request.loading}
          verticalHeaders={false}
          order="desc"
          sortBy="score"
          defaultSortObj={{ id: "score", desc: true }}
          showColumnVisibilityControl={true}
          showPagination={true}
          pageSize={10}
        />
      )}
    />
  );
}

export default Body;
