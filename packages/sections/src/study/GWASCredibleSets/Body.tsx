import {
  Link,
  SectionItem,
  ScientificNotation,
  DisplayVariantId,
  Tooltip,
  ClinvarStars,
  L2GScoreIndicator,
  OtTable,
  useBatchQuery,
  Navigate,
  Box,
} from "ui";
import { mantissaExponentComparator, nullishComparator, variantComparator } from "@ot/utils";
import { naLabel, credsetConfidenceMap, table5HChunkSize } from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import GWAS_CREDIBLE_SETS_QUERY from "./GWASCredibleSetsQuery.gql";
import ManhattanPlot from "./ManhattanPlot";
import { ReactElement } from "react";

const columns = [
  {
    id: "studyLocusId",
    label: "Credible set",
    enableHiding: false,
    sticky: true,
    renderCell: ({ studyLocusId }) => <Navigate to={`/credible-set/${studyLocusId}`} />,
  },
  {
    id: "leadVariant",
    label: "Lead variant",
    enableHiding: false,
    comparator: variantComparator(d => d?.variant),
    sortable: true,
    filterValue: ({ variant: v }) =>
      `${v?.chromosome}_${v?.position}_${v?.referenceAllele}_${v?.alternateAllele}`,
    renderCell: ({ variant }) => {
      if (!variant) return naLabel;
      const { id: variantId, referenceAllele, alternateAllele } = variant;
      return (
        <Link asyncTooltip to={`/variant/${variantId}`}>
          <DisplayVariantId
            variantId={variantId}
            referenceAllele={referenceAllele}
            alternateAllele={alternateAllele}
            expand={false}
          />
        </Link>
      );
    },
    exportValue: ({ variant }) => variant?.id,
  },
  {
    id: "pValue",
    label: "P-value",
    numeric: true,
    comparator: (a, b) =>
      mantissaExponentComparator(
        a?.pValueMantissa,
        a?.pValueExponent,
        b?.pValueMantissa,
        b?.pValueExponent
      ),
    sortable: true,
    filterValue: false,
    renderCell: ({ pValueMantissa, pValueExponent }) => {
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return naLabel;
      return <ScientificNotation number={[pValueMantissa, pValueExponent]} dp={2} />;
    },
    exportValue: ({ pValueMantissa, pValueExponent }) => {
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return null;
      return `${pValueMantissa}x10${pValueExponent}`;
    },
  },
  {
    id: "beta",
    label: "Beta",
    filterValue: false,
    numeric: true,
    sortable: true,
    tooltip: "Beta with respect to the ALT allele",
    renderCell: ({ beta }) => {
      if (typeof beta !== "number") return naLabel;
      return beta.toPrecision(3);
    },
  },
  {
    id: "finemappingMethod",
    label: "Fine-mapping method",
  },
  {
    id: "confidence",
    label: "Fine-mapping confidence",
    tooltip: (
      <>
        Fine-mapping confidence based on the suitability of the linkage-disequilibrium information
        and fine-mapping method. See{" "}
        <Link
          external
          to="https://platform-docs.opentargets.org/credible-set#credible-set-confidence"
        >
          here
        </Link>{" "}
        for more details.
      </>
    ),
    sortable: true,
    comparator: nullishComparator(
      (a, b) => a - b,
      row => credsetConfidenceMap?.[row.confidence],
      false
    ),
    renderCell: ({ confidence }) => {
      if (!confidence) return naLabel;
      return (
        <Tooltip title={confidence} style="">
          <ClinvarStars num={credsetConfidenceMap[confidence]} />
        </Tooltip>
      );
    },
    filterValue: ({ confidence }) => credsetConfidenceMap[confidence],
  },
  {
    id: "topL2G",
    label: "Top L2G",
    filterValue: ({ l2GPredictions }) => l2GPredictions?.rows[0]?.target.approvedSymbol,
    tooltip: (
      <>
        Top gene prioritised by our locus-to-gene model. See{" "}
        <Link external to="https://platform-docs.opentargets.org/gentropy/locus-to-gene-l2g">
          our documentation
        </Link>{" "}
        for more information.
      </>
    ),
    renderCell: ({ l2GPredictions }) => {
      const target = l2GPredictions?.rows[0]?.target;
      if (!target) return naLabel;
      return (
        <Link asyncTooltip to={`/target/${target.id}`}>
          {target.approvedSymbol}
        </Link>
      );
    },
    exportValue: ({ l2GPredictions }) => l2GPredictions?.rows[0]?.target.approvedSymbol,
  },
  {
    id: "l2gScore",
    label: "L2G score",
    comparator: nullishComparator(
      (a, b) => a - b,
      row => row?.l2GPredictions?.rows[0]?.score,
      false
    ),
    sortable: true,
    tooltip: (
      <>
        Machine learning prediction linking a gene to a credible set using all features. Score range
        [0,1]. See{" "}
        <Link external to="https://platform-docs.opentargets.org/gentropy/locus-to-gene-l2g">
          our documentation
        </Link>{" "}
        for more information.
      </>
    ),
    renderCell: ({ studyLocusId, l2GPredictions }) => {
      const score = l2GPredictions?.rows[0]?.score;
      const target = l2GPredictions?.rows[0]?.target;
      if (!score) return naLabel;
      return <L2GScoreIndicator score={score} studyLocusId={studyLocusId} targetId={target.id} />;
    },
    exportValue: ({ l2GPredictions }) => l2GPredictions?.rows[0]?.score,
  },
  {
    id: "credibleSetSize",
    label: "Credible set size",
    comparator: (a, b) => a.locus?.count - b.locus?.count,
    sortable: true,
    numeric: true,
    filterValue: false,
    renderCell: ({ locus }) => {
      return typeof locus?.count === "number" ? locus.count.toLocaleString() : naLabel;
    },
    exportValue: ({ locus }) => locus?.count,
  },
];

type BodyProps = {
  id: string;
  entity: string;
};

function Body({ id, entity }: BodyProps): ReactElement {
  const variables = {
    studyId: id,
    size: table5HChunkSize,
    index: 0,
  };

  const request = useBatchQuery({
    query: GWAS_CREDIBLE_SETS_QUERY,
    variables,
    dataPath: "study.credibleSets",
    size: table5HChunkSize,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      loadingMessage="Loading data. This may take some time..."
      renderDescription={() => <Description studyId={request.data?.study.id} />}
      renderBody={() => (
        <>
          <Box my={3} ml={2}>
            <ManhattanPlot loading={request.loading} data={request.data?.study.credibleSets.rows} />
          </Box>
          <OtTable
            dataDownloader
            dataDownloaderFileStem={`${id}-gwas-credible-sets-studies`}
            showGlobalFilter
            sortBy="pValue"
            loading={request.loading}
            columns={columns}
            rows={request.data?.study.credibleSets.rows}
            query={GWAS_CREDIBLE_SETS_QUERY.loc.source.body}
            variables={variables}
          />
        </>
      )}
    />
  );
}

export default Body;
