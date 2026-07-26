import {
  Link,
  SectionItem,
  DisplayVariantId,
  ScientificNotation,
  OtTable,
  Tooltip,
  useBatchQuery,
  Navigate,
  MuiChip as Chip,
} from "ui";
import { naLabel, table5HChunkSize } from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import MOLQTL_COLOC_QUERY from "./MolQTLColocQuery.gql";
import { mantissaExponentComparator, variantComparator } from "@ot/utils";

const columns = [
  {
    id: "otherStudyLocus.studyLocusId",
    label: "Credible set",
    sticky: true,
    renderCell: ({ otherStudyLocus }) => {
      if (!otherStudyLocus?.variant) return naLabel;
      return <Navigate to={`/credible-set/${otherStudyLocus.studyLocusId}`} />;
    },
  },
  {
    id: "otherStudyLocus.study.id",
    label: "Study",
    renderCell: ({ otherStudyLocus }) => {
      const studyId = otherStudyLocus?.study?.id;
      if (!studyId) return naLabel;
      return (
        <Link asyncTooltip to={`../study/${studyId}`}>
          {studyId}
        </Link>
      );
    },
  },
  {
    id: "otherStudyLocus.study.studyType",
    label: "Type",
    renderCell: ({ otherStudyLocus }) => {
      const studyType = otherStudyLocus?.study?.studyType;
      if (!studyType) return naLabel;
      return (
        <>
          {studyType}{" "}
          {otherStudyLocus.isTransQtl && <Chip label="trans" variant="outlined" size="small" />}
        </>
      );
    },
    exportValue: ({ otherStudyLocus }) => {
      const studyType = otherStudyLocus?.study?.studyType;
      if (!studyType) return naLabel;
      return `${studyType}, isTrans:${otherStudyLocus.isTrans}`;
    },
  },
  {
    id: "otherStudyLocus.study.target.approvedSymbol",
    label: "Affected gene",
    renderCell: ({ otherStudyLocus }) => {
      const target = otherStudyLocus?.study?.target;
      if (!target) return naLabel;
      return (
        <Link asyncTooltip to={`/target/${target.id}`}>
          {target.approvedSymbol}
        </Link>
      );
    },
  },

  {
    id: "otherStudyLocus.study.biosample.biosampleName",
    label: "Affected tissue/cell",
    renderCell: ({ otherStudyLocus }) => {
      const biosample = otherStudyLocus?.study?.biosample;
      if (!biosample) return naLabel;
      return (
        <Link
          external
          to={`https://www.ebi.ac.uk/ols4/search?q=${biosample.biosampleId}`}
        >
          {biosample.biosampleName}
        </Link>
      );
    },
  },
  {
    id: "otherStudyLocus.study.condition",
    label: "Condition",
    renderCell: ({ otherStudyLocus }) => otherStudyLocus?.study?.condition || naLabel,
  },
  {
    id: "otherStudyLocus.variant.id",
    label: "Lead Variant",
    comparator: variantComparator(d => d?.otherStudyLocus?.variant),
    sortable: true,
    filterValue: ({ otherStudyLocus }) => {
      const v = otherStudyLocus?.variant;
      return `${v?.chromosome}_${v?.position}_${v?.referenceAllele}_${v?.alternateAllele}`;
    },
    renderCell: ({ otherStudyLocus }) => {
      if (!otherStudyLocus?.variant) return naLabel;
      const { id: variantId, referenceAllele, alternateAllele } = otherStudyLocus.variant;
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
    exportValue: ({ otherStudyLocus }) => otherStudyLocus?.variant?.id,
  },
  {
    id: "pValue",
    label: "P-Value",
    numeric: true,
    comparator: ({ otherStudyLocus: a }, { otherStudyLocus: b }) =>
      mantissaExponentComparator(
        a?.pValueMantissa,
        a?.pValueExponent,
        b?.pValueMantissa,
        b?.pValueExponent
      ),
    sortable: true,
    filterValue: false,
    renderCell: ({ otherStudyLocus }) => {
      const { pValueMantissa, pValueExponent } = otherStudyLocus ?? {};
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return naLabel;
      return <ScientificNotation number={[pValueMantissa, pValueExponent]} dp={2} />;
    },
    exportValue: ({ otherStudyLocus }) => {
      const { pValueMantissa, pValueExponent } = otherStudyLocus ?? {};
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return null;
      return `${pValueMantissa}x10${pValueExponent}`;
    },
  },
  {
    id: "numberColocalisingVariants",
    label: "Colocalising Variants (n)",
    filterValue: false,
    numeric: true,
    comparator: (a, b) => a?.numberColocalisingVariants - b?.numberColocalisingVariants,
    sortable: true,
    renderCell: ({ numberColocalisingVariants }) => {
      return typeof numberColocalisingVariants === "number"
        ? numberColocalisingVariants.toLocaleString()
        : naLabel;
    },
  },
  {
    id: "betaRatioSignAverage",
    label: "Directionality",
    tooltip: "Effect directionality based on the ratio of betas between the two credible sets",
    renderCell: ({ betaRatioSignAverage }) => {
      if (betaRatioSignAverage == null) return naLabel;
      let category = "Inconclusive";
      if (betaRatioSignAverage <= -0.99) category = "Opposite";
      else if (betaRatioSignAverage >= 0.99) category = "Same";
      const displayValue =
        Math.abs(betaRatioSignAverage) === 1
          ? betaRatioSignAverage
          : betaRatioSignAverage.toFixed(2);
      return <Tooltip title={`Beta ratio sign average: ${displayValue}`}>{category}</Tooltip>;
    },
    filterValue: ({ betaRatioSignAverage }) => {
      if (betaRatioSignAverage == null) return null;
      if (betaRatioSignAverage <= -0.99) return "Opposite";
      else if (betaRatioSignAverage >= 0.99) return "Same";
      return "Inconclusive";
    },
    sortable: false,
    exportValue: ({ betaRatioSignAverage }) => {
      if (betaRatioSignAverage == null) return null;
      if (betaRatioSignAverage <= -0.99) return "Opposite";
      else if (betaRatioSignAverage >= 0.99) return "Same";
      return "Inconclusive";
    },
  },
  {
    id: "h3",
    label: "H3",
    tooltip: (
      <>
        Posterior probability that the signals <b>do not</b> colocalise
      </>
    ),
    filterValue: false,
    numeric: true,
    comparator: (a, b) => a?.h3 - b?.h3,
    sortable: true,
    renderCell: ({ h3 }) => {
      if (typeof h3 !== "number") return naLabel;
      return h3.toFixed(3);
    },
  },
  {
    id: "h4",
    label: "H4",
    tooltip: "Posterior probability that the signals colocalise",
    filterValue: false,
    numeric: true,
    comparator: (a, b) => a?.h4 - b?.h4,
    sortable: true,
    renderCell: ({ h4 }) => {
      if (typeof h4 !== "number") return naLabel;
      return h4.toFixed(3);
    },
  },
  {
    id: "clpp",
    label: "CLPP",
    tooltip:
      "The sum of the products of the fine-mapping posterior probabilities for overlapping variants between two study loci",
    filterValue: false,
    numeric: true,
    comparator: (a, b) => a?.clpp - b?.clpp,
    sortable: true,
    renderCell: ({ clpp }) => {
      if (typeof clpp !== "number") return naLabel;
      return clpp.toFixed(3);
    },
  },
];

type BodyProps = {
  studyLocusId: string;
  entity: string;
};

function Body({ id, entity }: BodyProps) {
  const variables = {
    studyLocusId: id,
    size: table5HChunkSize,
    index: 0,
  };

  const request = useBatchQuery({
    query: MOLQTL_COLOC_QUERY,
    variables,
    dataPath: "credibleSet.molqtlcolocalisation",
    size: table5HChunkSize,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      showContentLoading
      loadingMessage="Loading data. This may take some time..."
      renderDescription={() => <Description />}
      renderBody={() => {
        return (
          <OtTable
            dataDownloader
            showGlobalFilter
            dataDownloaderFileStem={`${id}-credibleSets`}
            sortBy="h4"
            order="desc"
            columns={columns}
            loading={request.loading}
            rows={request.data?.credibleSet.molqtlcolocalisation.rows}
            query={MOLQTL_COLOC_QUERY.loc.source.body}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
