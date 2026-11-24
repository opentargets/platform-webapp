import { useQuery } from "@apollo/client";
import { credsetConfidenceMap, naLabel } from "@ot/constants";
import { Fragment } from "react";
import {
  Box,
  Chip,
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
import GWAS_CREDIBLE_SETS_TOOLTIP_QUERY from "./GWASCredibleSetsTooltipQuery.gql";

function PheWasTooltip({ studyLocusId, variantId }: { studyLocusId: string; variantId: string }) {
  const { data, loading, error } = useQuery(GWAS_CREDIBLE_SETS_TOOLTIP_QUERY, {
    variables: { studyLocusId, variantId },
    fetchPolicy: "cache-first",
  });
  const credibleSet = data?.credibleSet;
  const valueMaxWidth = "200px";
  const displayId = credibleSet?.variant ? (
    <DisplayVariantId
      variantId={credibleSet.variant.variantId}
      referenceAllele={credibleSet.variant.referenceAllele}
      alternateAllele={credibleSet.variant.alternateAllele}
      expand={false}
    />
  ) : (
    naLabel
  );
  const topL2G = credibleSet?.l2GPredictions?.rows?.[0];

  return (
    <Box
      sx={{
        background: "#fffc",
        borderColor: "#ddd",
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "0.2rem",
        padding: "0.25em 0.5rem",
      }}
    >
      {loading ? (
        <>
          {Array.from({ length: 11 }, (_, index) => (
            <Skeleton key={`tooltip-row-${index}`} height={26} />
          ))}
        </>
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
              <Navigate to={`/credible-set/${credibleSet.studyLocusId}`} />
            </Box>
          </TooltipRow>
          <TooltipRow label="Lead variant">
            {credibleSet.variant ? (
              credibleSet.variant.variantId === variantId ? (
                <Box display="flex" alignItems="center" gap={0.5}>
                  {displayId}
                  <Chip label="self" variant="outlined" size="small" />
                </Box>
              ) : (
                <Link asyncTooltip to={`/variant/${credibleSet.variant.variantId}`}>
                  {displayId}
                </Link>
              )
            ) : (
              naLabel
            )}
          </TooltipRow>
          <TooltipRow label="Reported trait" valueWidth={valueMaxWidth} truncateValue>
            {credibleSet.study?.traitFromSource ?? naLabel}
          </TooltipRow>
          <TooltipRow label="Disease/phenotype" valueWidth={valueMaxWidth} truncateValue>
            {credibleSet.study?.diseases?.length > 0
              ? credibleSet.study.diseases.map((disease, index) => (
                  <Fragment key={disease.id}>
                    {index > 0 && ", "}
                    <Link asyncTooltip to={`/disease/${disease.id}`}>
                      {disease.name}
                    </Link>
                  </Fragment>
                ))
              : naLabel}
          </TooltipRow>
          <TooltipRow label="Study">
            {credibleSet.study ? (
              <Link asyncTooltip to={`/study/${credibleSet.study.id}`}>
                {credibleSet.study.id}
              </Link>
            ) : (
              naLabel
            )}
          </TooltipRow>
          <TooltipRow label="P-value">
            {typeof credibleSet.pValueMantissa === "number" &&
            typeof credibleSet.pValueExponent === "number" ? (
              <ScientificNotation
                number={[credibleSet.pValueMantissa, credibleSet.pValueExponent]}
                dp={2}
              />
            ) : (
              naLabel
            )}
          </TooltipRow>
          <TooltipRow label="Beta">{credibleSet.beta?.toPrecision(3) ?? naLabel}</TooltipRow>
          <TooltipRow label="Posterior probability">
            {credibleSet.locus?.rows?.[0]?.posteriorProbability?.toPrecision(3) ?? naLabel}
          </TooltipRow>
          <TooltipRow label="Fine-mapping">
            <Box display="flex" flexDirection="column" gap={0.25}>
              <Box display="flex" gap={0.5}>
                Method: {credibleSet.finemappingMethod ?? naLabel}
              </Box>
              <Box display="flex" gap={0.5}>
                Confidence:{" "}
                {credibleSet.confidence ? (
                  <Tooltip title={credibleSet.confidence} style="">
                    <ClinvarStars num={credsetConfidenceMap[credibleSet.confidence]} />
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
                Score: {topL2G?.score?.toFixed(3) ?? naLabel}
              </Box>
            </Box>
          </TooltipRow>
          <TooltipRow label="Credible set size">{credibleSet.locusSize?.count ?? naLabel}</TooltipRow>
        </TooltipTable>
      )}
    </Box>
  );
}

export default PheWasTooltip;
