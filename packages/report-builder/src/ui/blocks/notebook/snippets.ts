import type { NotebookColumn } from "./protocol";

export interface SnippetContext {
  ref?: string;
  columns: NotebookColumn[];
}

export interface Snippet {
  label: string;
  code: (ctx: SnippetContext) => string;
}

const pick = (columns: NotebookColumn[], type: NotebookColumn["type"], skip: string[] = []): string | undefined =>
  columns.find((c) => c.type === type && !skip.includes(c.key))?.key;

const names = (ctx: SnippetContext) => {
  const ref = ctx.ref ?? "my_table";
  const cat = pick(ctx.columns, "string") ?? "category";
  const num = pick(ctx.columns, "number") ?? "value";
  const num2 = pick(ctx.columns, "number", [num]) ?? "other";
  return { ref, cat, num, num2 };
};

export const SNIPPETS: Snippet[] = [
  {
    label: "Bar chart (Plot)",
    code: (ctx) => {
      const { ref, cat, num } = names(ctx);
      return `const rows = ${ref}.rows;

return Plot.plot({
  width,
  marginLeft: 160,
  x: { label: "${num}" },
  y: { label: null },
  marks: [
    Plot.barX(rows, { x: "${num}", y: "${cat}", fill: theme.primary, sort: { y: "-x" } }),
    Plot.ruleX([0]),
  ],
});
`;
    },
  },
  {
    label: "Scatter (Plot)",
    code: (ctx) => {
      const { ref, cat, num, num2 } = names(ctx);
      return `const rows = ${ref}.rows;

return Plot.plot({
  width,
  grid: true,
  marks: [
    Plot.dot(rows, { x: "${num}", y: "${num2}", fill: theme.primary, tip: true, title: "${cat}" }),
  ],
});
`;
    },
  },
  {
    label: "Histogram",
    code: (ctx) => {
      const { ref, num } = names(ctx);
      return `const rows = ${ref}.rows;

return Plot.plot({
  width,
  marks: [
    Plot.rectY(rows, Plot.binX({ y: "count" }, { x: "${num}", fill: theme.primary })),
    Plot.ruleY([0]),
  ],
});
`;
    },
  },
  {
    label: "Heatmap (d3)",
    code: (ctx) => {
      const { ref, cat, num } = names(ctx);
      const cat2 = pick(ctx.columns, "string", [cat]) ?? cat;
      return `const rows = ${ref}.rows;
const xs = Array.from(new Set(rows.map(d => d.${cat})));
const ys = Array.from(new Set(rows.map(d => d.${cat2})));
const margin = { top: 20, right: 20, bottom: 60, left: 120 };
const cell = Math.max(12, Math.min(28, (width - margin.left - margin.right) / xs.length));
const h = margin.top + margin.bottom + cell * ys.length;

const x = d3.scaleBand(xs, [margin.left, margin.left + cell * xs.length]).padding(0.05);
const y = d3.scaleBand(ys, [margin.top, margin.top + cell * ys.length]).padding(0.05);
const color = d3.scaleSequential(d3.extent(rows, d => d.${num}), d3.interpolateBlues);

const root = d3.create("svg").attr("width", width).attr("height", h).style("font", "11px sans-serif");
root.selectAll("rect").data(rows).join("rect")
  .attr("x", d => x(d.${cat})).attr("y", d => y(d.${cat2}))
  .attr("width", x.bandwidth()).attr("height", y.bandwidth())
  .attr("fill", d => color(d.${num}))
  .append("title").text(d => \`\${d.${cat}} · \${d.${cat2}}: \${d.${num}}\`);
root.append("g").attr("transform", \`translate(0,\${margin.top + cell * ys.length})\`).call(d3.axisBottom(x))
  .selectAll("text").attr("transform", "rotate(-40)").style("text-anchor", "end");
root.append("g").attr("transform", \`translate(\${margin.left},0)\`).call(d3.axisLeft(y));

return root.node();
`;
    },
  },
  {
    label: "Join two inputs by key",
    code: (ctx) => {
      const { ref, cat } = names(ctx);
      return `// Rows of ${ref} enriched with the matching row of another input
const other = ${ref}; // ← replace with a second linked input
const key = "${cat}";
const byKey = new Map(other.rows.map(d => [d[key], d]));

return ${ref}.rows.map(d => ({ ...d, ...(byKey.get(d[key]) ?? {}) }));
`;
    },
  },
  {
    label: "Group and count",
    code: (ctx) => {
      const { ref, cat } = names(ctx);
      return `const counts = d3.rollups(${ref}.rows, v => v.length, d => d.${cat})
  .map(([${cat}, count]) => ({ ${cat}, count }))
  .sort((a, b) => b.count - a.count);

return counts;
`;
    },
  },
];
