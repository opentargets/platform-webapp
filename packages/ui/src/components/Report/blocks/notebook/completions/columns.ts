import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { NOTEBOOK_GLOBALS, type NotebookColumn } from "../protocol";
import d3Members from "./d3.json";
import plotMembers from "./plot.json";

interface Member {
  name: string;
  type: string;
}

export interface CompletionInputs {
  // ref → column list (empty for chart-only / unresolved inputs)
  [ref: string]: NotebookColumn[];
}

const INPUT_FIELDS: Completion[] = [
  { label: "rows", type: "property", detail: "rows as captured (filters applied)" },
  { label: "allRows", type: "property", detail: "rows ignoring captured filters" },
  { label: "columns", type: "property", detail: "{ key, label, type }[]" },
  { label: "meta", type: "property", detail: "source title, kind, entity…" },
  { label: "data", type: "property", detail: "raw response (GraphQL / REST)" },
];

const THEME_FIELDS: Completion[] = ["fontFamily", "text", "primary", "secondary", "palette"].map((label) => ({
  label,
  type: "property",
}));

const GLOBAL_DETAILS: Record<string, string> = {
  d3: "d3 v7",
  Plot: "Observable Plot",
  width: "output width (px)",
  height: "output height (px)",
  html: "html`…` → element",
  svg: "svg`…` → element",
  invalidation: "resolves before the next run",
  log: "write to the console pane",
  theme: "platform colours",
};

const toCompletions = (members: Member[], boost = 0): Completion[] =>
  members.map((m) => ({ label: m.name, type: m.type === "function" ? "function" : "variable", boost }));

const D3_COMPLETIONS = toCompletions(d3Members as Member[]);
const PLOT_COMPLETIONS = toCompletions(plotMembers as Member[]);

// Plot channel names whose string values are column keys
const CHANNEL = /\b(x|y|x1|x2|y1|y2|fx|fy|z|fill|stroke|r|title|href|text|opacity|length|sort|symbol)\s*:\s*"([A-Za-z0-9_]*)$/;

const columnCompletions = (columns: NotebookColumn[]): Completion[] =>
  columns.map((c) => ({ label: c.key, type: "property", detail: c.type, boost: 2 }));

/**
 * Completion source for the notebook editor: input refs and their fields,
 * column keys (after `ref.rows[0].`, on `d.` inside a callback over a known
 * input, and inside Plot channel strings), d3 / Plot members, and the globals.
 */
export const makeCompletionSource =
  (getInputs: () => CompletionInputs) =>
  (context: CompletionContext): CompletionResult | null => {
    const inputs = getInputs();
    const refs = Object.keys(inputs);
    const before = context.state.sliceDoc(Math.max(0, context.pos - 400), context.pos);

    // ref.rows[0].col
    const rowField = before.match(/([A-Za-z_$][\w$]*)\.(?:rows|allRows)\[\d*\]\.([\w$]*)$/);
    if (rowField && inputs[rowField[1]]) {
      return { from: context.pos - rowField[2].length, options: columnCompletions(inputs[rowField[1]]) };
    }

    // Inside a Plot channel string: x: "co|
    const channel = before.match(CHANNEL);
    if (channel) {
      const known = refs.filter((r) => before.includes(`${r}.rows`) || before.includes(`${r}.allRows`));
      const source = known.length ? known : refs;
      const columns = source.flatMap((r) => inputs[r]);
      return { from: context.pos - channel[2].length, options: dedupe(columnCompletions(columns)) };
    }

    // something.member
    const member = before.match(/([A-Za-z_$][\w$]*)\.([\w$]*)$/);
    if (member) {
      const [, object, partial] = member;
      const from = context.pos - partial.length;
      if (object === "d3") return { from, options: D3_COMPLETIONS, validFor: /^[\w$]*$/ };
      if (object === "Plot") return { from, options: PLOT_COMPLETIONS, validFor: /^[\w$]*$/ };
      if (object === "theme") return { from, options: THEME_FIELDS };
      if (inputs[object]) return { from, options: INPUT_FIELDS };
      // `d.` inside a callback over a known input's rows: offer that input's columns
      const over = Array.from(before.matchAll(/([A-Za-z_$][\w$]*)\.(?:rows|allRows)/g)).map((m) => m[1]);
      const last = over.filter((r) => inputs[r]).pop();
      if (last && inputs[last].length) {
        return { from, options: columnCompletions(inputs[last]), validFor: /^[\w$]*$/ };
      }
      return null;
    }

    // Plain identifier: refs + globals
    const word = context.matchBefore(/[A-Za-z_$][\w$]*$/);
    if (!word && !context.explicit) return null;
    const options: Completion[] = [
      ...refs.map((ref) => ({
        label: ref,
        type: "variable",
        detail: `input · ${inputs[ref].length} columns`,
        boost: 3,
      })),
      ...NOTEBOOK_GLOBALS.map((name) => ({ label: name, type: "variable", detail: GLOBAL_DETAILS[name], boost: 1 })),
    ];
    return { from: word?.from ?? context.pos, options, validFor: /^[\w$]*$/ };
  };

const dedupe = (options: Completion[]): Completion[] => {
  const seen = new Set<string>();
  return options.filter((o) => (seen.has(o.label) ? false : (seen.add(o.label), true)));
};
