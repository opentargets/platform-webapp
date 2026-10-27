import { useState } from "react";
import {
  Link,
  SectionItem,
  ScientificNotation,
  DisplayVariantId,
  OtTableOffsetPagination,
  Navigate,
  Tooltip,
  ClinvarStars,
} from "ui";
import { naLabel, credsetConfidenceMap } from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import QTL_CREDIBLE_SETS_QUERY from "./QTLCredibleSetsQuery.gql";
import { mantissaExponentComparator, nullishComparator, variantComparator } from "@ot/utils";

const columns = [
  {
    id: "studyLocusId",
    label: "Credible set",
    sticky: true,
    renderCell: ({ studyLocusId }) => <Navigate to={`/credible-set/${studyLocusId}`} />,
  },
  {
    id: "leadVariant",
    label: "Lead variant",
    comparator: variantComparator(d => d?.variant),
    sortable: true,
    filterValue: ({ variant: v }) =>
      `${v?.chromosome}_${v?.position}_${v?.referenceAllele}_${v?.alternateAllele}`,
    renderCell: ({ variant }) => {
      if (!variant) return naLabel;
      const { variantId, referenceAllele, alternateAllele } = variant;
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
    exportValue: ({ variant }) => variant?.variantId,
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
    numeric: true,
    sortable: true,
    filterValue: false,
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

function Body({ id, entity }: BodyProps) {
  const variables = { studyId: id };
  const [request, setRequest] = useState<any>({ loading: true, data: null, error: null });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description studyId={request.data?.study.id} />}
      renderBody={() => (
        <OtTableOffsetPagination
          dataDownloader
          dataDownloaderFileStem={`${id}-qtl-credible-sets-studies`}
          entity="study"
          sectionName="credibleSets"
          setInitialRequestData={setRequest}
          columns={columns}
          query={QTL_CREDIBLE_SETS_QUERY}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
