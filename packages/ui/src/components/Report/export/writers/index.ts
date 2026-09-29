import type { Report } from "../../../../types/report";
import type { ExportFile, ExportFormat, ExportPlan, ExportTarget, WriterContext } from "../types";

export type ExportResult = { kind: "file"; file: ExportFile } | { kind: "printed" };

const requirePlan = (plan: ExportPlan | null, target: "slides" | "paper"): ExportPlan => {
  if (!plan) throw new Error(`The ${target} export needs a plan; go back to the mapping step and try again`);
  if (plan.target !== target) throw new Error(`Got a ${plan.target} plan for a ${target} export`);
  return plan;
};

/**
 * Dispatches to the lazily-imported writer for (target, format); each writer module is its
 * own chunk, so a library that fails to load only breaks that format.
 * - slides/paper need `plan`; working/data ignore it.
 * - Any PDF goes through the browser print dialog and resolves { kind: "printed" }.
 * - data needs `report` (report.json is built from the report itself, secrets stripped).
 */
export async function runExport(args: {
  target: ExportTarget;
  format: ExportFormat;
  plan: ExportPlan | null;
  report: Report;
  ctx: WriterContext;
}): Promise<ExportResult> {
  const { target, format, plan, report, ctx } = args;
  const file = (blob: Blob, ext: string): ExportResult => ({
    kind: "file",
    file: { blob, fileName: exportFileName(report.name, target, ext) },
  });

  if (format === "latex") throw new Error("LaTeX export arrives in phase 2");

  if (target === "slides" && format === "pptx") {
    const { writePptx } = await import("./pptx");
    return file(await writePptx(requirePlan(plan, "slides"), ctx), "pptx");
  }
  if (target === "slides" && format === "pdf") {
    const { printSlides } = await import("./pdf-print");
    await printSlides(requirePlan(plan, "slides"), ctx);
    return { kind: "printed" };
  }
  if (target === "paper" && format === "pdf") {
    const { printPaper } = await import("./pdf-print");
    await printPaper(requirePlan(plan, "paper"), ctx);
    return { kind: "printed" };
  }
  if (target === "paper" && format === "docx") {
    const { writeDocx } = await import("./docx");
    return file(await writeDocx(requirePlan(plan, "paper"), ctx), "docx");
  }
  if (target === "paper" && format === "md") {
    const { writeMarkdown } = await import("./markdown");
    return file(await writeMarkdown(requirePlan(plan, "paper"), ctx), "zip");
  }
  if (target === "working" && format === "pdf") {
    const { printWorking } = await import("./pdf-print");
    await printWorking(ctx.doc, ctx);
    return { kind: "printed" };
  }
  if (target === "data" && (format === "json" || format === "csvzip")) {
    const { writeData } = await import("./data");
    return file(await writeData(report, ctx.doc, ctx.settings), "zip");
  }
  throw new Error(`Exporting ${target} as ${format.toUpperCase()} is not supported`);
}

/** `{report-name-kebab}-{target}-{YYYY-MM-DD}.{ext}` */
export function exportFileName(reportName: string, target: ExportTarget, ext: string, date = new Date()): string {
  const kebab =
    reportName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "report";
  return `${kebab}-${target}-${date.toISOString().slice(0, 10)}.${ext}`;
}
