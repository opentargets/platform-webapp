import { useQuery } from "@apollo/client";
import {
  Link,
  SectionItem,
  ScientificNotation,
  DisplayVariantId,
  OtTableServer,
  type OtTableColumn,
  Box,
  Chip,
} from "ui";
import {
  naLabel,
  SortDirection,
  type CredibleSetVariant,
  type CredibleSetVariantsSearch,
  CredibleSetVariantsSearchField,
  type CredibleSetVariantsSort,
  CredibleSetVariantsSortField,
} from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import VARIANTS_QUERY_DOCUMENT from "./VariantsQuery.gql";
import { typedDocument } from "../../utils/typedDocument";
import { identifiersOrgLink } from "@ot/utils";

type VariantRow = Pick<
  CredibleSetVariant,
  | "variantId"
  | "referenceAllele"
  | "alternateAllele"
  | "mostSevereConsequenceId"
  | "mostSevereConsequenceLabel"
  | "pValueMantissa"
  | "pValueExponent"
  | "reportedBeta"
  | "reportedStandardError"
  | "r2Overall"
  | "posteriorProbability"
  | "logBayesFactor"
  | "sampleSize"
  | "effectAlleleFrequency"
  | "conditionalBeta"
  | "conditionalStandardError"
  | "rescaledAbsBeta"
  | "rescaledStandardError"
  | "rescaledDirection"
>;

type QueryData = {
  credibleSet?: {
    credibleSetId: string;
    locusView: { count: number; rows: VariantRow[] };
  } | null;
};

type QueryVariables = {
  credibleSetId: string;
  index: number;
  size: number;
  sort: CredibleSetVariantsSort[];
  search?: CredibleSetVariantsSearch;
};

const VARIANTS_QUERY = typedDocument<QueryData, QueryVariables>(VARIANTS_QUERY_DOCUMENT);
const PAGE_SIZE = 10;
const DEFAULT_SORT = {
  id: "posteriorProbability",
  field: CredibleSetVariantsSortField.PosteriorProbability,
  desc: true,
};

const REPORTED_GROUP = "Reported statistics";
const FINE_MAPPING_GROUP = "Fine-mapping";

type getColumnsType = {
  leadVariantId: string;
};

function formatVariantConsequenceLabel(label: string) {
  return label.replace(/_/g, " ");
}

function formatEffect(beta?: number | null, standardError?: number | null) {
  if (typeof beta !== "number") return null;
  if (typeof standardError !== "number") return beta.toPrecision(3);
  return `${beta.toPrecision(3)} [${standardError.toFixed(3)}]`;
}

function getRescaledBeta({ rescaledAbsBeta, rescaledDirection }: VariantRow) {
  if (typeof rescaledAbsBeta !== "number") return null;
  return rescaledDirection === -1 ? -rescaledAbsBeta : rescaledAbsBeta;
}

function getColumns({ leadVariantId }: getColumnsType): OtTableColumn<VariantRow>[] {
  return [
    {
      id: "variantId",
      label: "Variant",
      enableHiding: false,
      sortField: CredibleSetVariantsSortField.Variant,
      // For now, attach all search fields to the first column.
      searchFields: Object.values(CredibleSetVariantsSearchField),
      renderCell: ({ variantId, referenceAllele, alternateAllele }) => {
        const displayElement = (
          <Link asyncTooltip to={`/variant/${variantId}`}>
            <DisplayVariantId
              variantId={variantId}
              referenceAllele={referenceAllele}
              alternateAllele={alternateAllele}
              expand={false}
            />
          </Link>
        );
        if (variantId === leadVariantId) {
          return (
            <Box display="flex" alignItems="center" gap={0.5}>
              {displayElement}
              <Chip label="lead" />
            </Box>
          );
        }
        return displayElement;
      },
      exportValue: ({ variantId }) => variantId,
    },
    {
      id: "sampleSize",
      label: "Sample size",
      group: REPORTED_GROUP,
      numeric: true,
      sortField: CredibleSetVariantsSortField.SampleSize,
      tooltip: "Sample size for this variant",
      renderCell: ({ sampleSize }) => {
        if (typeof sampleSize !== "number") return naLabel;
        return sampleSize.toLocaleString();
      },
    },
    {
      id: "effectAlleleFrequency",
      label: "EAF",
      group: REPORTED_GROUP,
      numeric: true,
      sortField: CredibleSetVariantsSortField.EffectAlleleFrequency,
      tooltip: "Effect allele frequency of this variant",
      renderCell: ({ effectAlleleFrequency }) => {
        if (typeof effectAlleleFrequency !== "number") return naLabel;
        return effectAlleleFrequency.toPrecision(3);
      },
    },
    {
      id: "reportedBeta",
      label: "Effect",
      exportLabel: "Univariate effect",
      group: REPORTED_GROUP,
      numeric: true,
      sortField: CredibleSetVariantsSortField.ReportedBeta,
      tooltip:
        "Beta with respect to the ALT allele, as reported by the source, followed by its standard error in brackets. Not comparable across studies",
      renderCell: ({ reportedBeta, reportedStandardError }) =>
        formatEffect(reportedBeta, reportedStandardError) ?? naLabel,
      exportValue: ({ reportedBeta, reportedStandardError }) =>
        formatEffect(reportedBeta, reportedStandardError),
    },
    {
      id: "pValue",
      label: "P-value",
      group: REPORTED_GROUP,
      numeric: true,
      sortField: CredibleSetVariantsSortField.PValue,
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
      id: "conditionalBeta",
      label: "Effect",
      exportLabel: "Conditional effect",
      group: FINE_MAPPING_GROUP,
      numeric: true,
      sortField: CredibleSetVariantsSortField.ConditionalBeta,
      tooltip:
        "Effect of this variant from fine-mapping, conditional on the other signals in the locus, followed by its standard error in brackets",
      renderCell: ({ conditionalBeta, conditionalStandardError }) =>
        formatEffect(conditionalBeta, conditionalStandardError) ?? naLabel,
      exportValue: ({ conditionalBeta, conditionalStandardError }) =>
        formatEffect(conditionalBeta, conditionalStandardError),
    },
    {
      id: "rescaledBeta",
      label: "Rescaled effect",
      group: FINE_MAPPING_GROUP,
      numeric: true,
      sortField: CredibleSetVariantsSortField.RescaledAbsBeta,
      tooltip:
        "Effect rescaled to be comparable across studies (signed by its direction), followed by its standard error in brackets. Sorted by absolute size",
      renderCell: row => formatEffect(getRescaledBeta(row), row.rescaledStandardError) ?? naLabel,
      exportValue: row => formatEffect(getRescaledBeta(row), row.rescaledStandardError),
    },
    {
      id: "r2Overall",
      label: "LD (r²)",
      group: FINE_MAPPING_GROUP,
      numeric: true,
      sortField: CredibleSetVariantsSortField.R2Overall,
      tooltip: "Linkage disequilibrium with the lead variant",
      renderCell: ({ r2Overall }) => {
        if (typeof r2Overall !== "number") return naLabel;
        return r2Overall.toPrecision(3);
      },
    },
    {
      id: "logBayesFactor",
      label: "log(BF)",
      group: FINE_MAPPING_GROUP,
      numeric: true,
      tooltip:
        "Natural logarithm of the Bayes Factor indicating relative likelihood of the variant being causal",
      sortField: CredibleSetVariantsSortField.LogBayesFactor,
      renderCell: ({ logBayesFactor }) => {
        if (typeof logBayesFactor !== "number") return naLabel;
        return logBayesFactor.toPrecision(3);
      },
    },
    {
      id: "posteriorProbability",
      label: "PIP",
      exportLabel: "Posterior inclusion probability",
      group: FINE_MAPPING_GROUP,
      numeric: true,
      tooltip:
        "Posterior inclusion probability that this variant is causal within the fine-mapped credible set",
      sortField: DEFAULT_SORT.field,
      renderCell: ({ posteriorProbability }) => {
        if (typeof posteriorProbability !== "number") return naLabel;
        return posteriorProbability.toPrecision(3);
      },
    },
    {
      id: "mostSevereConsequenceLabel",
      label: "Predicted consequence",
      tooltip: "Most severe consequence of the variant. Source: Ensembl VEP",
      renderCell: ({ mostSevereConsequenceId, mostSevereConsequenceLabel }) => {
        if (!mostSevereConsequenceLabel) return naLabel;
        const label = formatVariantConsequenceLabel(mostSevereConsequenceLabel);
        if (!mostSevereConsequenceId) return label;
        return (
          <Link external to={identifiersOrgLink("SO", mostSevereConsequenceId.slice(3))}>
            {label}
          </Link>
        );
      },
      exportValue: ({ mostSevereConsequenceLabel }) => mostSevereConsequenceLabel,
    },
  ];
}

type BodyProps = {
  id: string;
  leadVariantId: string;
  entity: string;
};

function Body({ id, leadVariantId, entity }: BodyProps) {
  const variables = { credibleSetId: id };
  const request = useQuery(VARIANTS_QUERY, {
    variables: {
      ...variables,
      index: 0,
      size: PAGE_SIZE,
      sort: [
        {
          key: DEFAULT_SORT.field,
          direction: DEFAULT_SORT.desc ? SortDirection.Descending : SortDirection.Ascending,
        },
      ],
    },
  });

  const columns = getColumns({
    leadVariantId,
  });

  return (
    <SectionItem
      definition={definition}
      entity={entity}
      request={request}
      renderDescription={() => <Description />}
      renderBody={() => {
        return (
          <OtTableServer<VariantRow>
            dataDownloader
            dataDownloaderFileStem={`${id}-credibleset`}
            dataPath="credibleSet.locusView"
            pageSize={PAGE_SIZE}
            sortBy={DEFAULT_SORT.id}
            order={DEFAULT_SORT.desc ? "desc" : "asc"}
            globalFilterPlaceholderText="Search variant ID or consequence…"
            columns={columns}
            query={VARIANTS_QUERY}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
