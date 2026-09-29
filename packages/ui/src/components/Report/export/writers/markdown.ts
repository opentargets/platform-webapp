import { formatReference } from "../citations";
import { formatDate } from "../plan/numbering";
import { toMarkdown } from "../richText/toMarkdown";
import type { ExportPlan, MethodsEntry, PaperUnit, PlacedTable, WriterContext } from "../types";

const escapeInline = (text: string): string => text.replace(/([\\`*_[\]<>|])/g, "\\$1");

const escapeCell = (value: unknown): string => {
  const s = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
};

const fence = (code: string, lang = ""): string => {
  const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((m) => m.length));
  const f = "`".repeat(longest + 1);
  return `${f}${lang}\n${code.replace(/\n$/, "")}\n${f}`;
};

/** GFM pipe table of the rows the plan placed. */
export function gfmTable(table: PlacedTable): string {
  const { columns, rows } = table.data;
  if (!columns.length) return table.note ? `*${escapeInline(table.note)}*` : "";
  const head = `| ${columns.map((c) => escapeCell(c.label || c.key)).join(" | ")} |`;
  const rule = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((c) => escapeCell(row[c.key])).join(" | ")} |`);
  return [head, rule, ...body].join("\n") + (table.note ? `\n\n*${escapeInline(table.note)}*` : "");
}

const TONE_LABEL = { info: "Note", warning: "Caution", finding: "Finding" } as const;

const quote = (text: string): string =>
  text
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");

const decodeDataUrl = (dataUrl: string): { bytes: Uint8Array; ext: string } | null => {
  const match = /^data:([^;,]+)?((?:;[^;,]+)*?)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1] || "application/octet-stream";
  const ext = mime.includes("svg") ? "svg" : mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : mime.split("/")[1] || "png";
  if (match[3]) {
    const bin = atob(match[4]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return { bytes, ext };
  }
  return { bytes: new TextEncoder().encode(decodeURIComponent(match[4])), ext };
};

const requestMarkdown = (entry: MethodsEntry): string[] => {
  const r = entry.request;
  if (!r) return [];
  const out: string[] = [];
  if (entry.kind === "graphql") {
    out.push(`- Endpoint: \`${r.endpoint}\``);
    if (r.query) out.push("", fence(r.query, "graphql"));
    if (r.variables && Object.keys(r.variables as object).length) {
      out.push("", fence(JSON.stringify(r.variables, null, 2), "json"));
    }
  } else {
    out.push(`- Request: \`${r.method ?? "GET"} ${r.endpoint}\``);
    if (r.params?.length) out.push(`- Parameters: ${r.params.map((p) => `\`${p.key}=${p.value}\``).join(", ")}`);
    if (r.headers?.length) {
      out.push(`- Headers: ${r.headers.map((h) => `\`${h.key}\`${h.secret ? " (secret, omitted)" : ""}`).join(", ")}`);
    }
    if (r.body) out.push("", fence(r.body));
  }
  return out;
};

const methodsMarkdown = (entries: MethodsEntry[]): string => {
  const parts = ["## Methods"];
  entries.forEach((e) => {
    const lines = [`### ${escapeInline(e.title)}${e.figureLabel ? ` (${e.figureLabel})` : ""}`, ""];
    if (e.sourceLabel) lines.push(`- Source: ${escapeInline(e.sourceLabel)}`);
    if (e.entity) lines.push(`- Entity: ${escapeInline(e.entity.label ?? e.entity.id)} (${e.entity.type} \`${e.entity.id}\`)`);
    if (e.filters.length) lines.push(`- Filters: ${e.filters.map(escapeInline).join("; ")}`);
    if (e.dataRelease) lines.push(`- Data release: Open Targets ${e.dataRelease}`);
    if (e.retrievedAt) lines.push(`- Retrieved: ${formatDate(e.retrievedAt)}`);
    if (e.deepLink) lines.push(`- Link: <${e.deepLink}>`);
    lines.push(...requestMarkdown(e));
    if (e.inputRefs?.length) lines.push(`- Inputs: ${e.inputRefs.map((r) => `\`${r}\``).join(", ")}`);
    if (e.code) lines.push("", fence(e.code, "js"));
    if (e.note) lines.push(`- Note: ${escapeInline(e.note)}`);
    parts.push(lines.join("\n"));
  });
  return parts.join("\n\n");
};

type Unit = PaperUnit;

/** Paper plan → zip of report.md + figures/fig-n.(svg|png). */
export async function writeMarkdown(plan: ExportPlan, ctx: WriterContext): Promise<Blob> {
  const { zipSync, strToU8 } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  const parts: string[] = [];
  const units = plan.units as Unit[];
  let figureIndex = 0;

  units.forEach((unit, i) => {
    ctx.onProgress?.(i, units.length, "Writing Markdown");
    switch (unit.kind) {
      case "paperTitle":
        parts.push(`# ${escapeInline(unit.title)}`, `*${escapeInline(unit.byline)}*`);
        if (unit.abstract) parts.push(`**Abstract.** ${escapeInline(unit.abstract)}`);
        return;
      case "paperHeading": {
        const hashes = "#".repeat(Math.min(6, unit.level + 1));
        const number = unit.number ? (unit.level === 1 ? `${unit.number} · ` : `${unit.number} `) : "";
        parts.push(`${hashes} ${number}${escapeInline(unit.text)}`);
        return;
      }
      case "paperBody": {
        let md = toMarkdown(unit.doc, { headingOffset: 2 });
        if (unit.figRefs.length) md = `${md.replace(/\s+$/, "")} (${unit.figRefs.join(", ")})`;
        if (unit.tone) md = quote(`**${TONE_LABEL[unit.tone]}.** ${md}`);
        if (md.trim()) parts.push(md);
        return;
      }
      case "paperFigure": {
        figureIndex += 1;
        const n = unit.label?.replace(/\D+/g, "") || String(figureIndex);
        const heading = `**${unit.label ? `${unit.label} · ` : ""}${escapeInline(unit.title)}.**`;
        const caption = unit.caption ? ` ${escapeInline(unit.caption)}` : "";
        const asset = unit.asset;
        let path: string | null = null;
        if (asset.kind === "svg") {
          path = `figures/fig-${n}.svg`;
          files[path] = strToU8(asset.svg);
        } else if (asset.kind === "raster") {
          const decoded = decodeDataUrl(asset.dataUrl);
          if (decoded) {
            path = `figures/fig-${n}.${decoded.ext}`;
            files[path] = decoded.bytes;
          }
        }
        if (path) {
          parts.push(`![${escapeInline(unit.alt || unit.title)}](${path})`, `${heading}${caption}`);
        } else {
          const reason = asset.kind === "missing" ? asset.reason : "image could not be decoded";
          parts.push(quote(`${heading} *Figure not available (${escapeInline(reason)}).*\n\n${escapeInline(unit.caption)}`));
        }
        return;
      }
      case "paperTable": {
        const heading = `**${unit.label ? `${unit.label} · ` : ""}${escapeInline(unit.title)}.**`;
        parts.push(`${heading}${unit.caption ? ` ${escapeInline(unit.caption)}` : ""}`, gfmTable(unit.table));
        return;
      }
      case "paperMethods":
        parts.push(methodsMarkdown(unit.entries));
        return;
      case "paperDataAvailability":
        parts.push("## Data availability", escapeInline(unit.text));
        if (unit.links.length) parts.push(unit.links.map((l) => `- [${escapeInline(l.label)}](<${l.url}>)`).join("\n"));
        return;
      case "paperReferences":
        parts.push(
          "## References",
          unit.references
            .map((ref, j) =>
              unit.style === "apa"
                ? `- ${escapeInline(formatReference(ref, unit.style))}`
                : `${j + 1}. ${escapeInline(formatReference(ref, unit.style))}`
            )
            .join("\n")
        );
        return;
      default:
        return;
    }
  });
  ctx.onProgress?.(units.length, units.length, "Packaging");
  files["report.md"] = strToU8(`${parts.filter((p) => p.trim()).join("\n\n")}\n`);
  return new Blob([zipSync(files, { level: 6 })], { type: "application/zip" });
}
