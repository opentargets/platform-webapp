import { Box, Skeleton, Divider, Typography, Chip } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLazyQuery } from "@apollo/client";
import { useEffect } from "react";
import { DisplayVariantId, OtGenomicLocation } from "../..";
import { useGenTrackTooltipState } from "../../providers/GenTrackTooltipProvider";
import { useGenTrackState } from "../../providers/GenTrackProvider";
import { TARGET_TOOLTIP_QUERY, VARIANT_TOOLTIP_QUERY } from "../OtAsyncTooltip/utils/asyncTooltipUtil";
import { getEntityIcon, getEntityDescription } from "../OtAsyncTooltip/utils/asyncTooltipUtil";
import { naLabel } from "@ot/constants";
import { GenomicLocationPresentationType } from "@ot/constants";
import HeatmapTable from "../HeatmapTable/HeatmapTable";
import L2G_QUERY from "../../components/HeatmapTable/Locus2GeneQuery.gql";
import TooltipTable from "../TooltipTable";
import TooltipRow from "../TooltipRow";
import ScientificNotation from "../ScientificNotation";

export const TOOLTIP_WIDTH = 400;

function UnifiedTooltip() {
  const { datum } = (useGenTrackTooltipState() ?? {}) as { datum?: any };
  const [getTargetData, targetQuery] = useLazyQuery(TARGET_TOOLTIP_QUERY);
  const [getVariantData, variantQuery] = useLazyQuery(VARIANT_TOOLTIP_QUERY);

  // Determine entity type from datum
  const entityType = datum?.approvedSymbol ? "target" : datum?.chromosome ? "variant" : null;

  // Fetch data when datum changes
  useEffect(() => {
    if (!datum?.id) return;
    
    if (entityType === "target") {
      getTargetData({ variables: { ensgId: datum.id } });
    } else if (entityType === "variant") {
      getVariantData({ variables: { variantId: datum.id } });
    }
  }, [datum?.id, entityType]);

  if (!datum) return null;

  const loading = entityType === "target" ? targetQuery.loading : variantQuery.loading;
  const data = entityType === "target" ? targetQuery.data?.target : variantQuery.data?.variant;

  // Access GenTrack state for L2G predictions
  const genTrackState = useGenTrackState() as unknown as { data?: any } | null | undefined;
  const trackData = genTrackState?.data;
  const studyLocusId = trackData?.studyLocusId;
  const l2GPredictions = trackData?.l2GPredictions;

  // Find L2G prediction for current target gene (if applicable)
  const geneL2G = entityType === "target" && l2GPredictions?.rows?.find(
    (row: { target: { id: string } }) => row.target.id === datum?.id
  );
  // Show L2G heatmap for any gene that has L2G data (regardless of score)
  const hasL2G = !!geneL2G;

  // Find locus statistics for current variant (if applicable)
  const variantLocus = entityType === "variant" && trackData?.locus?.rows?.find(
    (row: { variant: { id: string } }) => row.variant.id === datum?.id
  );
  const leadVariantId = trackData?.variant?.id;
  const isLeadVariant = entityType === "variant" && datum?.id === leadVariantId;

  // Determine tooltip width based on whether we're showing the heatmap
  const tooltipWidth = hasL2G ? 550 : TOOLTIP_WIDTH;

  // Loading state
  if (loading || !data) {
    return (
      <Box sx={{ width: TOOLTIP_WIDTH, p: 1, backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: 1, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <Box>
          <Skeleton />
          <Skeleton />
        </Box>
        <Skeleton />
        <Skeleton />
      </Box>
    );
  }

  // Render rich async tooltip content
  return (
    <Box sx={{
      width: tooltipWidth,
      p: 1,
      backgroundColor: "#fff",
      border: "1px solid #ccc",
      borderRadius: 1,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    }}>
      <Box
        sx={{
          p: 1,
          py: 0,
          fontSize: "0.7rem",
          color: theme => theme.palette.grey[700],
          textDecoration: "underline",
        }}
      >
        {`${entityType}/${data.id}`}
      </Box>
      <Box sx={{ display: "flex", gap: 1, py: 1 }}>
        <Box sx={{ p: 1, color: theme => theme.palette.primary.main }}>
          <FontAwesomeIcon size="2x" icon={getEntityIcon(entityType || "")} />
        </Box>
        <Box sx={{ pt: 0.4, flex: 1 }}>
          <Box
            sx={{
              typography: "subtitle2",
              color: theme => theme.palette.grey[900],
              textTransform: "capitalize",
              fontWeight: "bold",
            }}
          >
            {data.name || data.id || naLabel}
          </Box>
          <Box sx={{ typography: "body2", color: theme => theme.palette.grey[800] }}>
            {getEntityDescription(entityType || "", data as Record<string, unknown>)}
          </Box>
        </Box>
      </Box>
      {entityType === "target" && data.genomicLocation?.chromosome && (
        <Box sx={{ mt: 1, px: 1, typography: "body2" }} component="span">
          <OtGenomicLocation
            type={GenomicLocationPresentationType.PLAIN}
            geneLoc={data.genomicLocation}
          />
        </Box>
      )}
      {hasL2G && l2GPredictions && (
        <Box sx={{ mt: 1 }}>
          <Divider />
          <Box sx={{ pl: 0, pt: 1 }}>
            <Typography
              variant="body2"
              sx={{
                pl: 1, 
                color: theme => theme.palette.grey[900],
                fontSize: 13.1,
                fontWeight: 600,
              }}
            >
              L2G score: {geneL2G.score.toFixed(3) ?? naLabel}
            </Typography>
              <HeatmapTable
                fixedGene={datum?.id}
                loading={false}
                data={l2GPredictions}
                query={L2G_QUERY.loc?.source?.body || L2G_QUERY}
                variables={{ studyLocusId }}
                disabledFilter
                disabledExport
                disabledLegend
                singleRowMode
              />
          </Box>
        </Box>
      )}
      {entityType === "variant" && (
        <Box sx={{ mt: 1 }}>
          <Divider />
          <Box sx={{ pl: 1, pt: 1 }}>
            <Typography
              variant="body2"
              component="div"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: theme => theme.palette.grey[900],
                fontSize: 13.1,
                fontWeight: 600,
              }}
            >
              Credible set statistics for{" "}
              <DisplayVariantId
                variantId={datum?.id}
                referenceAllele={datum?.referenceAllele}
                alternateAllele={datum?.alternateAllele}
                expand={false}
              />
              {isLeadVariant && (
                <Chip
                  label="lead"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 400 }}
                />
              )}
            </Typography>
            <Box sx={{ pl: 0 }}>
              <TooltipTable>
                <TooltipRow label="P-value">
                  {typeof variantLocus?.pValueMantissa === "number" &&
                  typeof variantLocus?.pValueExponent === "number" ? (
                    <ScientificNotation
                      number={[variantLocus.pValueMantissa, variantLocus.pValueExponent]}
                      dp={2}
                    />
                  ) : (
                    naLabel
                  )}
                </TooltipRow>
                <TooltipRow label="Beta">
                  {typeof variantLocus?.beta === "number"
                    ? variantLocus.beta.toPrecision(3)
                    : naLabel}
                </TooltipRow>
                <TooltipRow label="Standard error">
                  {typeof variantLocus?.standardError === "number"
                    ? variantLocus.standardError.toFixed(3)
                    : naLabel}
                </TooltipRow>
                <TooltipRow label="LD (r²)">
                  {typeof variantLocus?.r2Overall === "number"
                    ? variantLocus.r2Overall.toFixed(3)
                    : naLabel}
                </TooltipRow>
                <TooltipRow label="Posterior probability">
                  {typeof variantLocus?.posteriorProbability === "number"
                    ? variantLocus.posteriorProbability.toPrecision(3)
                    : naLabel}
                </TooltipRow>
                <TooltipRow label="log(BF)">
                  {typeof variantLocus?.logBF === "number"
                    ? variantLocus.logBF.toPrecision(3)
                    : naLabel}
                </TooltipRow>
              </TooltipTable>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default UnifiedTooltip;
