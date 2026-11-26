import { useQuery } from "@apollo/client";
import {
  credsetConfidenceLabels,
  fineMappingMethodLabels,
  naLabel,
  SortDirection,
  type TargetBodyProps,
  TargetCredibleSetsSearchField,
  TargetCredibleSetsSortField,
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

const PAGE_SIZE = 10;
const DEFAULT_SORT = {
  id: "pValue",
  field: TargetCredibleSetsSortField.PValue,
};

const columns: OtTableColumn<CredibleSetRow>[] = [
  {
    id: "credibleSetId",
    label: "Credible set",
    enableHiding: false,
    sticky: true,
    // For now, attach all search fields to the first column. The tissue/cell has no
    // column, so it is not searched.
    searchFields: Object.values(TargetCredibleSetsSearchField).filter(
      (field) => field !== TargetCredibleSetsSearchField.BiosampleName
    ),
    renderCell: ({ credibleSetId }) => <Navigate to={`/credible-set/${credibleSetId}`} />,
  },
  {
    id: "leadVariant",
    label: "Lead variant",
    enableHiding: false,
    sortField: TargetCredibleSetsSortField.LeadVariant,
    renderCell: ({ leadVariantId, leadReferenceAllele, leadAlternateAllele }) => {
      if (!leadVariantId) return naLabel;
      return (
        <Link asyncTooltip to={`/variant/${leadVariantId}`}>
          <DisplayVariantId
            variantId={leadVariantId}
            referenceAllele={leadReferenceAllele}
            alternateAllele={leadAlternateAllele}
            expand={false}
          />
        </Link>
      );
    },
    exportValue: ({ leadVariantId }) => leadVariantId,
  },
  {
    id: "studyId",
    label: "Study",
    sortField: TargetCredibleSetsSortField.Study,
    renderCell: ({ studyId }) => {
      if (!studyId) return naLabel;
      return (
        <Link asyncTooltip to={`/study/${studyId}`}>
          {studyId}
        </Link>
      );
    },
  },
  {
    id: "studyType",
    label: "Type",
    sortField: TargetCredibleSetsSortField.StudyType,
    renderCell: ({ studyType, isTransQtl }) => {
      if (!studyType) return naLabel;
      return (
        <>
          {`${studyType.slice(0, -3)}${studyType.slice(-3).toUpperCase()}`}{" "}
          {isTransQtl && <Chip label="trans" />}
        </>
      );
    },
    exportValue: ({ studyType, isTransQtl }) => {
      if (!studyType) return null;
      return `${studyType.slice(0, -3)}${studyType.slice(-3).toUpperCase()}, isTrans:${isTransQtl}`;
    },
  },
  {
    id: "condition",
    label: "Condition",
    sortField: TargetCredibleSetsSortField.Condition,
    renderCell: ({ condition }) => condition || naLabel,
  },
  {
    id: "pValue",
    label: "P-value",
    numeric: true,
    sortField: DEFAULT_SORT.field,
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
    sortField: TargetCredibleSetsSortField.Beta,
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
    sortField: TargetCredibleSetsSortField.Confidence,
    renderCell: ({ confidence }) => {
      if (!confidence) return naLabel;
      return (
        <Tooltip title={credsetConfidenceLabels[confidence]} style="">
          <ClinvarStars num={confidence} />
        </Tooltip>
      );
    },
  },
  {
    id: "fineMappingMethod",
    label: "Fine-mapping method",
    sortField: TargetCredibleSetsSortField.FineMappingMethod,
    renderCell: ({ fineMappingMethod }) =>
      fineMappingMethodLabels[fineMappingMethod] ?? fineMappingMethod,
    exportValue: ({ fineMappingMethod }) =>
      fineMappingMethodLabels[fineMappingMethod] ?? fineMappingMethod,
  },
  {
    id: "credibleSetSize",
    label: "Credible set size",
    numeric: true,
    sortField: TargetCredibleSetsSortField.LocusSize,
    renderCell: ({ locusSize }) =>
      typeof locusSize === "number" ? locusSize.toLocaleString() : naLabel,
    exportValue: ({ locusSize }) => locusSize,
  },
];

type Props = TargetBodyProps;

function Body({ id, entity }: Props) {
  const variables = { ensemblId: id };
  // first page only: drives the section loading/error state, the table fetches
  // the same page from the Apollo cache and then paginates on its own
  const request = useQuery(QTL_CREDIBLE_SETS_QUERY, {
    variables: {
      ...variables,
      index: 0,
      size: PAGE_SIZE,
      sort: [{ key: DEFAULT_SORT.field, direction: SortDirection.Ascending }],
    },
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
          sortBy={DEFAULT_SORT.id}
          order="asc"
          dataDownloader
          dataDownloaderFileStem={`${id}-qtl-credible-sets-target`}
        />
      )}
    />
  );
}

export default Body;
