/**
 * Creates Node tooltip HTML
 */
export function createNodeTooltipHTML(
  viewMode: "genes" | "pathways",
  data: Record<string, unknown>
): string {
  if (viewMode === "genes") {
    const pathwayList = (data.pathways as string[])?.slice(0, 5).join("<br/>");
    
    return `
      <strong>${data.gene}</strong><br/>
      Pathways: ${data.pathwayCount}<br/>
      Best FDR: ${(data.bestFDR as number)?.toExponential(2)}<br/>
      <small>${pathwayList}${(data.pathways as string[])?.length > 5 ? `<br/>... and ${(data.pathways as string[]).length - 5} more` : ""}</small>
    `;
  } else {
    return `
      <strong>${data.pathway}</strong><br/>
      NES: ${(data.nes as number)?.toFixed(3)}<br/>
      FDR: ${(data.fdr as number)?.toExponential(2)}<br/>
      p-value: ${(data.pValue as number)?.toExponential(2)}<br/>
      Pathway size: ${data.pathwaySize}<br/>
      Leading edge genes: ${data.geneCount}
    `;
  }
}

/**
 * Creates Edge tooltip HTML
 */
export function createEdgeTooltipHTML(
  viewMode: "genes" | "pathways",
  data: Record<string, unknown>
): string {
  if (viewMode === "genes") {
    const pathwayList = (data.sharedPathways as string[])?.slice(0, 8).join("<br/>");
    return `
      <strong>Shared Pathways: ${data.sharedCount}</strong><br/>
      <small>${pathwayList}${(data.sharedPathways as string[])?.length > 8 ? `<br/>... and ${(data.sharedPathways as string[]).length - 8} more` : ""}</small>
    `;
  } else {
    const geneList = (data.sharedGenes as string[])?.slice(0, 8).join(", ");
    return `
      <strong>Shared Genes: ${data.sharedCount}</strong><br/>
      <small>${geneList}${(data.sharedGenes as string[])?.length > 8 ? `... and ${(data.sharedGenes as string[]).length - 8} more` : ""}</small>
    `;
  }
}

/**
 * Styles and appends a tooltip element to the DOM
 */
export function styleAndAppendTooltip(tooltip: HTMLDivElement): void {
  tooltip.style.position = "fixed";
  tooltip.style.background = "rgba(0, 0, 0, 0.85)";
  tooltip.style.color = "white";
  tooltip.style.padding = "8px 12px";
  tooltip.style.borderRadius = "4px";
  tooltip.style.fontSize = "12px";
  tooltip.style.pointerEvents = "none";
  tooltip.style.zIndex = "9999";
  tooltip.style.maxWidth = "300px";
  try {
    document.body.appendChild(tooltip);
  } catch (err) {
    console.error("[TOOLTIP] Failed to appendChild:", err);
  }
}

/**
 * Removes a tooltip from the DOM
 */
export function removeTooltip(
  tooltip: HTMLDivElement,
  tooltipsRef: React.MutableRefObject<Set<HTMLDivElement>>,
  context: string
): void {
  try {
    if (tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
    } else {
      console.warn(`[${context}] Tooltip has no parent node`);
    }
  } catch (err) {
    console.error(
      `[${context}] Failed to removeChild:`,
      err,
      "parent:",
      (tooltip.parentNode as Element)?.tagName
    );
  }

  try {
    tooltipsRef.current.delete(tooltip);
  } catch (err) {
    console.warn(`[${context}] Failed to delete from tooltipsRef:`, err);
  }
}
