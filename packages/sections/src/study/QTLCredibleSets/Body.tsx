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
import { naLabel, credsetConfidenceLabels, fineMappingMethodLabels } from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import QTL_CREDIBLE_SETS_QUERY from "./QTLCredibleSetsQuery.gql";
import { mantissaExponentComparator, nullishComparator, variantComparator } from "@ot/utils";

const columns = [
  {
    id: "credibleSetId",
    label: "Credible set",
    sticky: true,
    renderCell: ({ credibleSetId }) => <Navigate to={`/credible-set/${credibleSetId}`} />,
  },
  {
    id: "leadVariant",
    label: "Lead variant",
    comparator: variantComparator(d => d?.leadVariant),
    sortable: true,
    filterValue: ({ leadVariant: v }) =>
      `${v?.chromosome}_${v?.position}_${v?.referenceAllele}_${v?.alternateAllele}`,
    renderCell: ({ leadVariant: variant }) => {
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
    exportValue: ({ leadVariant: variant }) => variant?.variantId,
  },
  {
    id: "pValue",
    label: "P-value",
    numeric: true,
    comparator: (a, b) =>
      mantissaExponentComparator(
        a?.leadPValueMantissa,
        a?.leadPValueExponent,
        b?.leadPValueMantissa,
        b?.leadPValueExponent
      ),
    sortable: true,
    filterValue: false,
    renderCell: ({ leadPValueMantissa: pValueMantissa, leadPValueExponent: pValueExponent }) => {
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return naLabel;
      return <ScientificNotation number={[pValueMantissa, pValueExponent]} dp={2} />;
    },
    exportValue: ({ leadPValueMantissa: pValueMantissa, leadPValueExponent: pValueExponent }) => {
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number") return null;
      return `${pValueMantissa}x10${pValueExponent}`;
    },
  },
  {
    id: "leadBeta",
    label: "Beta",
    numeric: true,
    sortable: true,
    filterValue: false,
    tooltip: "Beta with respect to the ALT allele",
    renderCell: ({ leadBeta: beta }) => {
      if (typeof beta !== "number") return naLabel;
      return beta.toPrecision(3);
    },
  },
  {
    id: "fineMappingMethod",
    label: "Fine-mapping method",
    renderCell: ({ fineMappingMethod }) =>
      fineMappingMethodLabels[fineMappingMethod] ?? fineMappingMethod ?? naLabel,
    filterValue: ({ fineMappingMethod }) =>
      fineMappingMethodLabels[fineMappingMethod] ?? fineMappingMethod,
    exportValue: ({ fineMappingMethod }) =>
      fineMappingMethodLabels[fineMappingMethod] ?? fineMappingMethod,
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
      row => row.confidence,
      false
    ),
    renderCell: ({ confidence }) => {
      if (!confidence) return naLabel;
      return (
        <Tooltip title={credsetConfidenceLabels[confidence]} style="">
          <ClinvarStars num={confidence} />
        </Tooltip>
      );
    },
    filterValue: ({ confidence }) => confidence,
  },
  {
    id: "credibleSetSize",
    label: "Credible set size",
    comparator: (a, b) => a.locusSize - b.locusSize,
    sortable: true,
    numeric: true,
    filterValue: false,
    renderCell: ({ locusSize }) => {
      return typeof locusSize === "number" ? locusSize.toLocaleString() : naLabel;
    },
    exportValue: ({ locusSize }) => locusSize,
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
