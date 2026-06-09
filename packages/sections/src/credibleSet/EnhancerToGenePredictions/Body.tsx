import { useQuery } from "@apollo/client";
import { Link, SectionItem, OtTable, Tooltip, useReportQueryVariables } from "ui";
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
    renderCell: ({ target }: { target: Target }) => (
      <Link asyncTooltip to={`/target/${target.id}`}>
        {target.approvedSymbol}
      </Link>
    ),
    exportValue: ({ target }: { target: Target }) => target?.approvedSymbol,
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
      biosample?.biosampleName || biosample?.biosampleId || "",
    exportValue: ({ biosample }: { biosample: Biosample }) =>
      biosample?.biosampleName || biosample?.biosampleId || "",
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
    renderCell: ({ distanceToTss }: { distanceToTss: number }) => distanceToTss.toLocaleString(),
    exportValue: ({ distanceToTss }: { distanceToTss: number }) => distanceToTss?.toString(),
    filterValue: ({ distanceToTss }: { distanceToTss: number }) => distanceToTss.toLocaleString(),
    comparator: (a: any, b: any) => a.distanceToTss - b.distanceToTss,
  },
  {
    id: "size",
    label: "Interval size (bp)",
    numeric: true,
    sortable: true,
    renderCell: ({ start, end }: { start: number; end: number }) => `${(end - start + 1).toLocaleString()}`,
    exportValue: ({ start, end }: { start: number; end: number }) => `${(end - start + 1).toString()}`,
    filterValue: ({ start, end }: { start: number; end: number }) => `${(end - start + 1).toLocaleString()}`,
    comparator: (a: any, b: any) => (a.end - a.start + 1) - (b.end - b.start + 1),
  },
  {
    id: "start_end",
    label: "Interval range",
    numeric: true,
    exportValue: ({ chromosome, start, end }: {
      chromosome: string;
      start: number;
      end: number;
    }) => `${chromosome}:${start.toString()}-${end.toString()}`,
    renderCell: ({ chromosome, start, end }: {
      chromosome: string;
      start: number;
      end: number;
    }) => `${chromosome}:${start.toLocaleString()}-${end.toLocaleString()}`,
    filterValue:  ({ chromosome, start, end }: {
      chromosome: string;
      start: number;
      end: number;
    }) => `${chromosome}:${start.toLocaleString()}-${end.toLocaleString()}`,
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
    filterValue: ({ score }: { score: number }) => score?.toFixed(3) ?? "",
    renderCell: ({ score }: { score: number }) => score.toFixed(3),
    exportValue: ({ score }: { score: number }) => score.toString(),
    comparator: (a: any, b: any) => a.score - b.score,
  },
];

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ id, entity }: BodyProps) {
  const savedVariables = useReportQueryVariables();
  const variables = savedVariables || {
    studyLocusId: id,
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
          variantId={request.data?.credibleSet?.variant?.id || ""}
          referenceAllele={request.data?.credibleSet?.variant?.referenceAllele || ""}
          alternateAllele={request.data?.credibleSet?.variant?.alternateAllele || ""}
        />
      )}
      renderBody={() => (
        <OtTable
          dataDownloader
          dataDownloaderFileStem={`${id}-enhancer-to-gene-predictions`}
          showGlobalFilter
          columns={columns}
          loading={request.loading}
          rows={request.data?.credibleSet?.variant?.enhancerToGenes?.rows || []}
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
