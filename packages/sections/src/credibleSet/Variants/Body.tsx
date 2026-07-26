import { Chip } from "@mui/material";
import {
  Link,
  SectionItem,
  ScientificNotation,
  DisplayVariantId,
  OtTable,
  useBatchQuery,
  SectionLoader,
  Box,
} from "ui";
import { naLabel, table5HChunkSize } from "@ot/constants";
import { definition } from ".";
import Description from "./Description";
import VARIANTS_QUERY from "./VariantsQuery.gql";
import { mantissaExponentComparator, variantComparator, identifiersOrgLink } from "@ot/utils";

type getColumnsType = {
  leadVariantId: string;
};

function formatVariantConsequenceLabel(label) {
  return label.replace(/_/g, " ");
}

function getColumns({ leadVariantId }: getColumnsType) {
  return [
    {
      id: "variant.id",
      label: "Variant",
      enableHiding: false,
      comparator: variantComparator(d => d?.variant),
      sortable: true,
      filterValue: ({ variant: v }) =>
        `${v?.chromosome}_${v?.position}_${v?.referenceAllele}_${v?.alternateAllele}`,
      renderCell: ({ variant }) => {
        if (!variant) return naLabel;
        const { id: variantId, referenceAllele, alternateAllele } = variant;
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
              <Chip label="lead" variant="outlined" size="small" />
            </Box>
          );
        }
        return displayElement;
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
      sortable: true,
      tooltip: "Beta with respect to the ALT allele",
      renderCell: ({ beta }) => {
        if (typeof beta !== "number") return naLabel;
        return beta.toPrecision(3);
      },
    },
    {
      id: "standardError",
      label: "Standard error",
      numeric: true,
      filterValue: false,
      tooltip:
        "Standard Error: Estimate of the standard deviation of the sampling distribution of the beta",
      renderCell: ({ standardError }) => {
        if (typeof standardError !== "number") return naLabel;
        return standardError.toFixed(3);
      },
    },
    {
      id: "r2Overall",
      label: "LD (r²)",
      filterValue: false,
      numeric: true,
      tooltip: "Linkage disequilibrium with the lead variant",
      renderCell: ({ r2Overall }) => {
        if (typeof r2Overall !== "number") return naLabel;
        return r2Overall.toPrecision(3);
      },
    },
    {
      id: "posteriorProbability",
      label: "Posterior Probability",
      filterValue: false,
      numeric: true,
      tooltip:
        "Posterior inclusion probability that this variant is causal within the fine-mapped credible set",
      comparator: (rowA, rowB) => {
        const aPosterior = rowA?.posteriorProbability;
        const bPosterior = rowB?.posteriorProbability;
        if (aPosterior === bPosterior) {
          if (rowA?.variant.id === leadVariantId) return 1;
          else if (rowB?.variant.id === leadVariantId) return -1;
          return 0;
        }
        return aPosterior - bPosterior;
      },
      sortable: true,
      renderCell: ({ posteriorProbability }) => {
        if (typeof posteriorProbability !== "number") return naLabel;
        return posteriorProbability.toPrecision(3);
      },
    },
    {
      id: "logBF",
      label: "log(BF)",
      numeric: true,
      tooltip:
        "Natural logarithm of the Bayes Factor indicating relative likelihood of the variant being causal",
      filterValue: false,
      sortable: true,
      renderCell: ({ logBF }) => {
        if (typeof logBF !== "number") return naLabel;
        return logBF.toPrecision(3);
      },
    },
    {
      id: "variant.mostSevereConsequence.label",
      label: "Predicted consequence",
      tooltip: "Most severe consequence of the variant. Source: Ensembl VEP",

      renderCell: ({ variant }) => {
        const mostSevereConsequence = variant?.mostSevereConsequence;
        if (!mostSevereConsequence) return naLabel;
        const displayElement = (
          <Link external to={identifiersOrgLink("SO", mostSevereConsequence.id.slice(3))}>
            {formatVariantConsequenceLabel(mostSevereConsequence.label)}
          </Link>
        );
        return displayElement;
      },
      exportValue: ({ variant }) => {
        return variant?.mostSevereConsequence.label;
      },
    },
  ];
}

type BodyProps = {
  id: string;
  leadVariantId: string;
  entity: string;
};

function Body({ id, leadVariantId, entity }: BodyProps) {
  const variables = {
    studyLocusId: id,
    size: table5HChunkSize,
    index: 0,
  };

  const request = useBatchQuery({
    query: VARIANTS_QUERY,
    variables,
    dataPath: "credibleSet.locus",
    size: table5HChunkSize,
  });

  if (request.loading) return <SectionLoader />;

  const columns = getColumns({
    leadVariantId,
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
            showGlobalFilter
            dataDownloader
            dataDownloaderFileStem={`${id}-credibleset`}
            sortBy="posteriorProbability"
            order="desc"
            columns={columns}
            loading={request.loading}
            rows={request.data?.credibleSet.locus.rows}
            query={VARIANTS_QUERY.loc.source.body}
            variables={variables}
          />
        );
      }}
    />
  );
}

export default Body;
