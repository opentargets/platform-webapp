import { Box, Chip, Divider, Typography } from "@mui/material";
import {
  DisplayVariantId,
  HeatmapTable,
  Link,
  ScientificNotation,
  TooltipRow,
  TooltipTable,
  type GeneVisTooltipDetailProps,
  type GeneVisTooltipEntityType,
} from "ui";
import { naLabel } from "@ot/constants";
import { identifiersOrgLink } from "@ot/utils";
import L2G_QUERY from "../Locus2Gene/Locus2GeneQuery.gql";

const tooltipPositionProps = { tooltipZIndex: 10000, tooltipOffset: -5 };

function BrowserViewTooltipDetail({ datum, entityType, entity, context, emphasis }: GeneVisTooltipDetailProps) {
  const data = context as any;
  const geneL2G = entityType === "target" && data?.l2GPredictions?.rows?.find(
    (row: { target: { id: string } }) => row.target.id === datum.id
  );
  const variantLocus = entityType === "variant" && data?.locus?.rows?.find(
    (row: { variant: { id: string } }) => row.variant.id === datum.id
  );

  if (geneL2G && data?.l2GPredictions) {
    return (
      <>
        <Divider />
        <Box sx={{ p: 1 }}>
          <Box sx={{ pl: 0, pt: 0.5 }}>
            <Typography variant="body2" sx={{ pl: 1, color: theme => theme.palette.grey[900], fontSize: 13.1, fontWeight: 600 }}>
              L2G score: {geneL2G.score.toFixed(3) ?? naLabel}
            </Typography>
            <Box sx={{ pointerEvents: "none" }}>
              <HeatmapTable
                fixedGene={datum.id}
                loading={false}
                data={data.l2GPredictions}
                query={L2G_QUERY.loc?.source?.body || L2G_QUERY}
                variables={{ studyLocusId: data.studyLocusId }}
                disabledFilter
                disabledExport
                disabledLegend
                singleRowMode
              />
            </Box>
          </Box>
        </Box>
      </>
    );
  }

  if (!variantLocus) return null;

  const isEmphasised = emphasis?.variantId === datum.id;
  return (
    <>
      <Divider />
      <Box sx={{ pt: 1.5, pb: 0.5, px: 2 }}>
        <Typography variant="body2" component="div" sx={{ display: "flex", alignItems: "center", gap: 0.5, color: theme => theme.palette.grey[900], fontSize: 13.1, fontWeight: 600 }}>
          Credible set statistics for{" "}
          <DisplayVariantId variantId={datum.id} referenceAllele={datum.referenceAllele} alternateAllele={datum.alternateAllele} expand={false} />
          {isEmphasised && emphasis?.label && <Chip label={emphasis.label.toLowerCase()} variant="outlined" size="small" sx={{ fontWeight: 400 }} />}
        </Typography>
        <Box sx={{ pl: 0 }}>
          <TooltipTable>
            <TooltipRow label="P-value">
              {typeof variantLocus.pValueMantissa === "number" && typeof variantLocus.pValueExponent === "number"
                ? <ScientificNotation number={[variantLocus.pValueMantissa, variantLocus.pValueExponent]} dp={2} />
                : naLabel}
            </TooltipRow>
            <TooltipRow label="Beta" tooltip="Beta with respect to the ALT allele" {...tooltipPositionProps}>
              {typeof variantLocus.beta === "number" ? variantLocus.beta.toPrecision(3) : naLabel}
            </TooltipRow>
            <TooltipRow label="Standard error" tooltip="Standard Error: Estimate of the standard deviation of the sampling distribution of the beta" {...tooltipPositionProps}>
              {typeof variantLocus.standardError === "number" ? variantLocus.standardError.toFixed(3) : naLabel}
            </TooltipRow>
            <TooltipRow label="LD (r²)" tooltip="Linkage disequilibrium with the lead variant" {...tooltipPositionProps}>
              {typeof variantLocus.r2Overall === "number" ? variantLocus.r2Overall.toFixed(3) : naLabel}
            </TooltipRow>
            <TooltipRow label="Posterior probability" tooltip="Posterior inclusion probability that this variant is causal within the fine-mapped credible set" {...tooltipPositionProps}>
              {typeof variantLocus.posteriorProbability === "number" ? variantLocus.posteriorProbability.toPrecision(3) : naLabel}
            </TooltipRow>
            <TooltipRow label="log(BF)" tooltip="Natural logarithm of the Bayes Factor indicating relative likelihood of the variant being causal" {...tooltipPositionProps}>
              {typeof variantLocus.logBF === "number" ? variantLocus.logBF.toPrecision(3) : naLabel}
            </TooltipRow>
            <TooltipRow label="Predicted consequence" tooltip="Most severe consequence of the variant. Source: Ensembl VEP" {...tooltipPositionProps}>
              {entity?.mostSevereConsequence ? (
                <Link external to={identifiersOrgLink("SO", entity.mostSevereConsequence.id.slice(3))}>
                  {entity.mostSevereConsequence.label.replace(/_/g, " ")}
                </Link>
              ) : naLabel}
            </TooltipRow>
          </TooltipTable>
        </Box>
      </Box>
    </>
  );
}

export function getBrowserViewTooltipWidth({ datum, entityType, context }: {
  datum: any;
  entityType: GeneVisTooltipEntityType;
  context?: unknown;
}) {
  const data = context as any;
  const hasL2G = entityType === "target" && data?.l2GPredictions?.rows?.some(
    (row: { target: { id: string } }) => row.target.id === datum.id
  );
  return hasL2G ? 550 : undefined;
}

export default BrowserViewTooltipDetail;
