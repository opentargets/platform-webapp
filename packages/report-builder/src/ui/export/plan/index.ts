import type { ExportBranding } from "../../../core";
import type { ExportDocument, ExportPlan, ExportSettings } from "../types";
import { planPaper } from "./paper";
import { planSlides } from "./slides";

export { validSlideRoles, validPaperRoles, validTableLayouts, roleLabel, effectiveRole } from "./roles";

/**
 * Pure and cheap (< 50ms for 30 blocks); re-run on every step-2 change. `branding` supplies the
 * wording baked into the plan (bylines, caption sources); neutral defaults when omitted.
 */
export function plan(
  doc: ExportDocument,
  target: "slides" | "paper",
  settings: ExportSettings,
  branding?: ExportBranding
): ExportPlan {
  return target === "slides" ? planSlides(doc, settings) : planPaper(doc, settings, branding);
}
