import { useQuery } from "@apollo/client";
import {
  credsetConfidenceMap,
  naLabel,
  type TargetBodyProps,
  type TargetQtlCredibleSetsQuery,
  type TargetQtlCredibleSetsQueryVariables,
} from "@ot/constants";
import {
  Chip,
  ClinvarStars,
  DisplayVariantId,
  Link,
  Navigate,
  type OtTableColumn,
  OtTableServer,
  ScientificNotation,
  SectionItem,
  Tooltip,
} from "ui";
import { typedDocument } from "../../utils/typedDocument";
import { definition } from ".";
import Description from "./Description";
import QTL_CREDIBLE_SETS_QUERY_DOCUMENT from "./QTLCredibleSetsQuery.gql";

const QTL_CREDIBLE_SETS_QUERY = typedDocument<
  TargetQtlCredibleSetsQuery,
  TargetQtlCredibleSetsQueryVariables
>(QTL_CREDIBLE_SETS_QUERY_DOCUMENT);

type CredibleSetRow = NonNullable<
  TargetQtlCredibleSetsQuery["target"]
>["credibleSets"]["rows"][number];

const confidenceMap: Record<string, number | undefined> = credsetConfidenceMap;

const PAGE_SIZE = 10;

const columns: OtTableColumn<CredibleSetRow>[] = [
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
    id: "study.id",
    label: "Study",
    renderCell: ({ study }) => {
      if (!study) return naLabel;
      return (
        <Link asyncTooltip to={`/study/${study.id}`}>
          {study.id}
        </Link>
      );
    },
  },
  {
    id: "study.studyType",
    label: "Type",
    renderCell: ({ study, isTransQtl }) => {
      const type = study?.studyType;
      if (!type) return naLabel;
      return (
        <>
          {`${type.slice(0, -3)}${type.slice(-3).toUpperCase()}`}{" "}
          {isTransQtl && <Chip label="trans" />}
        </>
      );
    },
    exportValue: ({ study, isTransQtl }) => {
      const type = study?.studyType;
      if (!type) return null;
      return `${type.slice(0, -3)}${type.slice(-3).toUpperCase()}, isTrans:${isTransQtl}`;
    },
  },
  {
    id: "study.condition",
    label: "Condition",
    renderCell: ({ study }) => study?.condition || naLabel,
  },
  {
    id: "pValue",
    label: "P-value",
    numeric: true,
    filterValue: false,
    renderCell: ({ pValueMantissa, pValueExponent }) => {
      if (typeof pValueMantissa !== "number" || typeof pValueExponent !== "number")
        return naLabel;
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
    filterValue: false,
    tooltip: "Beta with respect to the ALT allele",
    renderCell: ({ beta }) => {
      if (typeof beta !== "number") return naLabel;
      return beta.toPrecision(3);
    },
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
    renderCell: ({ confidence }) => {
      if (!confidence) return naLabel;
      return (
        <Tooltip title={confidence} style="">
          <ClinvarStars num={confidenceMap[confidence]} />
        </Tooltip>
      );
    },
    filterValue: false,
  },
  {
    id: "finemappingMethod",
    label: "Fine-mapping method",
  },
  {
    id: "credibleSetSize",
    label: "Credible set size",
    numeric: true,
    filterValue: false,
    renderCell: ({ locus }) =>
      typeof locus?.count === "number" ? locus.count.toLocaleString() : naLabel,
    exportValue: ({ locus }) => locus?.count,
  },
];

type Props = TargetBodyProps;

function Body({ id, entity }: Props) {
  const variables = { ensemblId: id };
  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(QTL_CREDIBLE_SETS_QUERY, {
    variables: { ...variables, index: 0, size: PAGE_SIZE },
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      showContentLoading
      renderDescription={() => (
        <Description targetSymbol={request.data?.target?.approvedSymbol ?? ""} />
      )}
      renderBody={() => (
        <OtTableServer<CredibleSetRow>
          columns={columns}
          query={QTL_CREDIBLE_SETS_QUERY}
          variables={variables}
          dataPath="target.credibleSets"
          pageSize={PAGE_SIZE}
          dataDownloader
          dataDownloaderFileStem={`${id}-qtl-credible-sets-target`}
        />
      )}
    />
  );
}

export default Body;
