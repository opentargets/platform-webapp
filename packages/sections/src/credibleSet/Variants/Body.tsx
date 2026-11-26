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

type getColumnsType = {
  leadVariantId: string;
};

function formatVariantConsequenceLabel(label: string) {
  return label.replace(/_/g, " ");
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
      id: "pValue",
      label: "P-value",
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
      id: "reportedBeta",
      label: "Beta",
      numeric: true,
      sortField: CredibleSetVariantsSortField.ReportedBeta,
      tooltip: "Beta with respect to the ALT allele, as reported by the source",
      renderCell: ({ reportedBeta }) => {
        if (typeof reportedBeta !== "number") return naLabel;
        return reportedBeta.toPrecision(3);
      },
    },
    {
      id: "reportedStandardError",
      label: "Standard error",
      numeric: true,
      sortField: CredibleSetVariantsSortField.ReportedStandardError,
      tooltip:
        "Standard Error: Estimate of the standard deviation of the sampling distribution of the beta",
      renderCell: ({ reportedStandardError }) => {
        if (typeof reportedStandardError !== "number") return naLabel;
        return reportedStandardError.toFixed(3);
      },
    },
    {
      id: "r2Overall",
      label: "LD (r²)",
      numeric: true,
      sortField: CredibleSetVariantsSortField.R2Overall,
      tooltip: "Linkage disequilibrium with the lead variant",
      renderCell: ({ r2Overall }) => {
        if (typeof r2Overall !== "number") return naLabel;
        return r2Overall.toPrecision(3);
      },
    },
    {
      id: "posteriorProbability",
      label: "Posterior Probability",
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
      id: "logBayesFactor",
      label: "log(BF)",
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
