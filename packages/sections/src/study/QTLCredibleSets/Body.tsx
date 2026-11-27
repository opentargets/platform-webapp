import { useQuery } from "@apollo/client";
import {
  credsetConfidenceLabels,
  fineMappingMethodLabels,
  naLabel,
  SortDirection,
  type StudyCredibleSet,
  type StudyCredibleSetsSearch,
  StudyCredibleSetsSearchField,
  type StudyCredibleSetsSort,
  StudyCredibleSetsSortField,
} from "@ot/constants";
import type { ReactElement } from "react";
import {
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

type StudyRow = Pick<
  StudyCredibleSet,
  | "credibleSetId"
  | "leadVariantId"
  | "leadReferenceAllele"
  | "leadAlternateAllele"
  | "pValueMantissa"
  | "pValueExponent"
  | "beta"
  | "locusSize"
  | "fineMappingMethod"
  | "confidence"
>;

type QueryData = {
  study?: {
    id: string;
    credibleSetsView: { count: number; rows: StudyRow[] };
  } | null;
};

type QueryVariables = {
  studyId: string;
  index: number;
  size: number;
  sort: StudyCredibleSetsSort[];
  search?: StudyCredibleSetsSearch;
};

const QTL_CREDIBLE_SETS_QUERY = typedDocument<QueryData, QueryVariables>(
  QTL_CREDIBLE_SETS_QUERY_DOCUMENT
);

const PAGE_SIZE = 10;
const DEFAULT_SORT = {
  id: "pValue",
  field: StudyCredibleSetsSortField.PValue,
};

const columns: OtTableColumn<StudyRow>[] = [
  {
    id: "credibleSetId",
    label: "Credible set",
    sticky: true,
    renderCell: ({ credibleSetId }) => <Navigate to={`/credible-set/${credibleSetId}`} />,
  },
  {
    id: "leadVariant",
    label: "Lead variant",
    sortField: StudyCredibleSetsSortField.LeadVariant,
    searchFields: [StudyCredibleSetsSearchField.LeadVariantId],
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
    sortField: StudyCredibleSetsSortField.Beta,
    tooltip: "Beta with respect to the ALT allele",
    renderCell: ({ beta }) => {
      if (typeof beta !== "number") return naLabel;
      return beta.toPrecision(3);
    },
  },
  {
    id: "fineMappingMethod",
    label: "Fine-mapping method",
    renderCell: ({ fineMappingMethod }) =>
      fineMappingMethodLabels[fineMappingMethod] ?? fineMappingMethod ?? naLabel,
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
    sortField: StudyCredibleSetsSortField.Confidence,
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
    id: "credibleSetSize",
    label: "Credible set size",
    sortField: StudyCredibleSetsSortField.LocusSize,
    numeric: true,
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

function Body({ id, entity }: BodyProps): ReactElement {
  const variables = { studyId: id };
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
      renderDescription={() => <Description studyId={id} />}
      renderBody={() => (
        <OtTableServer<StudyRow>
          dataDownloader
          dataDownloaderFileStem={`${id}-qtl-credible-sets-studies`}
          dataPath="study.credibleSetsView"
          pageSize={PAGE_SIZE}
          sortBy={DEFAULT_SORT.id}
          order="asc"
          globalFilterPlaceholderText="Search lead variant ID"
          columns={columns}
          query={QTL_CREDIBLE_SETS_QUERY}
          variables={variables}
        />
      )}
    />
  );
}

export default Body;
