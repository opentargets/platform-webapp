import { Box, Skeleton } from "@mui/material";
import { styled } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLazyQuery } from "@apollo/client";
import { useEffect } from "react";
import { GenomicLocation, Link } from "../..";
import { useGenTrackTooltipState } from "../../providers/GenTrackTooltipProvider";
import { TARGET_TOOLTIP_QUERY, VARIANT_TOOLTIP_QUERY } from "../OtAsyncTooltip/utils/asyncTooltipUtil";
import { getEntityIcon, getEntityDescription } from "../OtAsyncTooltip/utils/asyncTooltipUtil";
import { naLabel } from "@ot/constants";
import { GenomicLocationPresentationType } from "@ot/constants";
import type { GeneVisTooltipEntityType, GeneVisTooltipOptions } from "./model";

export const TOOLTIP_WIDTH = 420;

const TooltipLink = styled(Link)({
  "&:hover": {
    textDecoration: "none",
    textDecorationColor: "transparent",
    WebkitTextDecorationColor: "transparent",
  },
});

function GeneVisTooltip({
  tooltip,
  emphasis,
}: {
  tooltip?: GeneVisTooltipOptions;
  emphasis?: any;
}) {
  const { datum, otherData } = (useGenTrackTooltipState() ?? {}) as {
    datum?: any;
    otherData?: { entityType?: GeneVisTooltipEntityType };
  };
  const [getTargetData, targetQuery] = useLazyQuery(TARGET_TOOLTIP_QUERY);
  const [getVariantData, variantQuery] = useLazyQuery(VARIANT_TOOLTIP_QUERY);
  const entityType = otherData?.entityType;

  useEffect(() => {
    if (!datum?.id || !entityType) return;
    if (entityType === "target") getTargetData({ variables: { ensgId: datum.id } });
    if (entityType === "variant") getVariantData({ variables: { variantId: datum.id } });
  }, [datum?.id, entityType]);

  if (!datum || !entityType) return null;

  const loading = entityType === "target" ? targetQuery.loading : variantQuery.loading;
  const entity = entityType === "target" ? targetQuery.data?.target : variantQuery.data?.variant;
  const Detail = tooltip?.Detail;

  if (loading || !entity) {
    return (
      <Box sx={{ width: TOOLTIP_WIDTH, p: 1, backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: 1, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <Box><Skeleton /><Skeleton /></Box>
        <Skeleton /><Skeleton />
      </Box>
    );
  }

  return (
    <Box sx={{ width: tooltip?.getWidth?.({ datum, entityType, context: tooltip.context }) ?? TOOLTIP_WIDTH, backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: 1, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
      <TooltipLink to={`/${entityType}/${entity.id}`}>
        <Box sx={{ py: 1, pl: 1, pr: 2, display: "block", cursor: "pointer", "&:hover": { backgroundColor: "#e1eff9" } }}>
          <Box sx={{ p: 1, py: 0, fontSize: "0.7rem", color: theme => theme.palette.grey[700], textDecoration: "underline" }}>
            {`${entityType}/${entity.id}`}
          </Box>
          <Box sx={{ display: "flex", gap: 1, py: 1 }}>
            <Box sx={{ p: 1, color: theme => theme.palette.primary.main }}>
              <FontAwesomeIcon size="2x" icon={getEntityIcon(entityType)} />
            </Box>
            <Box sx={{ pt: 0.4, flex: 1 }}>
              <Box sx={{ typography: "subtitle2", color: theme => theme.palette.grey[900], textTransform: "capitalize", fontWeight: "bold" }}>
                {entity.name || entity.id || naLabel}
              </Box>
              <Box
                sx={{
                  typography: "body2",
                  color: theme => theme.palette.grey[800],
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 3,
                  overflow: "hidden",
                }}
              >
                {getEntityDescription(entityType, entity as Record<string, unknown>)}
              </Box>
            </Box>
          </Box>
          {entityType === "target" && entity.genomicLocation?.chromosome && (
            <Box sx={{ mt: 1, px: 1, typography: "body2" }} component="span">
              <GenomicLocation type={GenomicLocationPresentationType.PLAIN} geneLoc={entity.genomicLocation} />
            </Box>
          )}
        </Box>
      </TooltipLink>
      {Detail && <Detail datum={datum} entityType={entityType} entity={entity} context={tooltip?.context} emphasis={emphasis} />}
    </Box>
  );
}

export default GeneVisTooltip;
