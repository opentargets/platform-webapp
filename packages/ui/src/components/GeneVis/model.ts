export type GeneVisVariant = {
  id: string;
  chromosome?: string;
  position: number;
  referenceAllele?: string;
  alternateAllele?: string;
  mostSevereConsequence?: { id?: string; label?: string };
};

export type GeneVisVariantRow = {
  variant: GeneVisVariant;
  posteriorProbability?: number;
  pValueMantissa?: number;
  pValueExponent?: number;
  beta?: number;
  standardError?: number;
  r2Overall?: number;
  logBF?: number;
};

export type GeneVisGeneHighlight = {
  targetIds: string[];
  geneColor?: number;
  hoverBoxColor?: number;
  labelBackgroundColor?: number;
  labelPadding?: number;
  legend?: string;
};

export type GeneVisVariantEmphasis = {
  variantId: string;
  label?: string;
};

export type GeneVisTooltipEntityType = "target" | "variant";

export type GeneVisTooltipDetailProps = {
  datum: any;
  entityType: GeneVisTooltipEntityType;
  entity: any;
  context?: unknown;
  emphasis?: GeneVisVariantEmphasis;
};

export type GeneVisTooltipOptions = {
  context?: unknown;
  Detail?: ComponentType<GeneVisTooltipDetailProps>;
  getWidth?: (context: {
    datum: any;
    entityType: GeneVisTooltipEntityType;
    context?: unknown;
  }) => number | undefined;
};

/**
 * Query-independent input for GeneVis. Callers adapt their own API responses to
 * this model; GeneVis deliberately does not know about entity GraphQL shapes.
 */
export type GeneVisModel = {
  genes: any[];
  referencePosition?: number;
  overviewVariants?: GeneVisVariant[];
  variantTrack?: {
    rows: GeneVisVariantRow[];
    emphasis?: GeneVisVariantEmphasis;
  };
  genePresentation?: {
    priorityIds?: string[];
    highlights?: GeneVisGeneHighlight[];
    scoreByGeneId?: Record<string, number>;
  };
};
import type { ComponentType } from "react";
