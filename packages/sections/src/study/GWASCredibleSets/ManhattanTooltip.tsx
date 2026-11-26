import { useQuery } from "@apollo/client";
import {
  type CredibleSet,
  credsetConfidenceLabels,
  fineMappingMethodLabels,
  type L2Gprediction,
  naLabel,
  type Target,
  type Variant,
} from "@ot/constants";
import {
  Box,
  ClinvarStars,
  DisplayVariantId,
  Link,
  Navigate,
  ScientificNotation,
  Skeleton,
  Tooltip,
  TooltipRow,
  TooltipTable,
  Typography,
} from "ui";
import { typedDocument } from "../../utils/typedDocument";
import GWAS_CREDIBLE_SETS_TOOLTIP_QUERY_DOCUMENT from "./GWASCredibleSetsTooltipQuery.gql";

type TooltipCredibleSet = Pick<
  CredibleSet,
  | "credibleSetId"
  | "leadPValueMantissa"
  | "leadPValueExponent"
  | "leadBeta"
  | "fineMappingMethod"
  | "confidence"
  | "locusSize"
> & {
  leadVariant?: Pick<Variant, "variantId" | "referenceAllele" | "alternateAllele"> | null;
  l2GPredictions: {
    rows: (Pick<L2Gprediction, "score"> & {
      target?: Pick<Target, "id" | "approvedSymbol"> | null;
    })[];
  };
};

const GWAS_CREDIBLE_SETS_TOOLTIP_QUERY = typedDocument<
  { credibleSet?: TooltipCredibleSet | null },
  { credibleSetId: string }
>(GWAS_CREDIBLE_SETS_TOOLTIP_QUERY_DOCUMENT);

const TOOLTIP_ROWS = [
  "Credible set",
  "Lead variant",
  "P-value",
  "Beta",
  "Fine-mapping",
  "L2G",
  "Credible set size",
];

function ManhattanTooltip({ credibleSetId }: { credibleSetId: string }) {
  const { data, loading, error } = useQuery(GWAS_CREDIBLE_SETS_TOOLTIP_QUERY, {
    variables: { credibleSetId },
    fetchPolicy: "cache-first",
  });
  const credibleSet = data?.credibleSet;
  const topL2G = credibleSet?.l2GPredictions.rows[0];

  return (
    <Box
      sx={{
        width: 360,
        background: "#fffc",
        borderColor: "#ddd",
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "0.2rem",
        padding: "0.25em 0.5rem",
      }}
    >
      {loading ? (
        TOOLTIP_ROWS.map((label) => <Skeleton key={label} height={26} />)
      ) : error ? (
        <Typography variant="body2" color="error">
          Unable to load credible set details.
        </Typography>
      ) : !credibleSet ? (
        <Typography variant="body2">No credible set details available.</Typography>
      ) : (
        <TooltipTable>
          <TooltipRow label="Credible set">
            <Box display="flex">
              <Navigate to={`/credible-set/${credibleSet.credibleSetId}`} />
            </Box>
          </TooltipRow>
          <TooltipRow label="Lead variant">
            {credibleSet.leadVariant ? (
              <Link asyncTooltip to={`/variant/${credibleSet.leadVariant.variantId}`}>
                <DisplayVariantId
                  variantId={credibleSet.leadVariant.variantId}
                  referenceAllele={credibleSet.leadVariant.referenceAllele}
                  alternateAllele={credibleSet.leadVariant.alternateAllele}
                  expand={false}
                />
              </Link>
            ) : (
              naLabel
            )}
          </TooltipRow>
          <TooltipRow label="P-value">
            {credibleSet.leadPValueMantissa != null && credibleSet.leadPValueExponent != null ? (
              <ScientificNotation
                number={[credibleSet.leadPValueMantissa, credibleSet.leadPValueExponent]}
                dp={2}
              />
            ) : (
              naLabel
            )}
          </TooltipRow>
          <TooltipRow label="Beta">{credibleSet.leadBeta?.toPrecision(3) ?? naLabel}</TooltipRow>
          <TooltipRow label="Fine-mapping">
            <Box display="flex" flexDirection="column" gap={0.25}>
              <Box display="flex" gap={0.5}>
                Method:{" "}
                {fineMappingMethodLabels[credibleSet.fineMappingMethod] ??
                  credibleSet.fineMappingMethod}
              </Box>
              <Box display="flex" gap={0.5}>
                Confidence:{" "}
                {credibleSet.confidence ? (
                  <Tooltip title={credsetConfidenceLabels[credibleSet.confidence]} style="">
                    <ClinvarStars num={credibleSet.confidence} />
                  </Tooltip>
                ) : (
                  naLabel
                )}
              </Box>
            </Box>
          </TooltipRow>
          <TooltipRow label="L2G">
            <Box display="flex" flexDirection="column" gap={0.25}>
              <Box display="flex" gap={0.5}>
                Top:{" "}
                {topL2G?.target ? (
                  <Link asyncTooltip to={`/target/${topL2G.target.id}`}>
                    {topL2G.target.approvedSymbol}
                  </Link>
                ) : (
                  naLabel
                )}
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                Score: {topL2G?.score.toFixed(3) ?? naLabel}
              </Box>
            </Box>
          </TooltipRow>
          <TooltipRow label="Credible set size">
            {credibleSet.locusSize.toLocaleString()}
          </TooltipRow>
        </TooltipTable>
      )}
    </Box>
  );
}

export default ManhattanTooltip;
