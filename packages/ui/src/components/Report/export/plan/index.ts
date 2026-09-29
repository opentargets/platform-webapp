import type { ExportDocument, ExportPlan, ExportSettings } from "../types";
import { planPaper } from "./paper";
import { planSlides } from "./slides";

export { validSlideRoles, validPaperRoles, validTableLayouts, roleLabel, effectiveRole } from "./roles";

/** Pure and cheap (< 50ms for 30 blocks); re-run on every step-2 change. */
export function plan(doc: ExportDocument, target: "slides" | "paper", settings: ExportSettings): ExportPlan {
  return target === "slides" ? planSlides(doc, settings) : planPaper(doc, settings);
}
