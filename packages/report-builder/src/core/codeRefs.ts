import { type Node, parse } from "acorn";
import * as walk from "acorn-walk";
import { NOTEBOOK_GLOBALS } from "notebook-runtime/src/protocol";

const PARSE_OPTIONS = {
  ecmaVersion: "latest" as const,
  sourceType: "script" as const,
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  locations: true,
};

export interface SyntaxProblem {
  message: string;
  line?: number;
  column?: number;
}

export const parseNotebookCode = (
  code: string
): { ast: Node; error?: undefined } | { ast?: undefined; error: SyntaxProblem } => {
  try {
    return { ast: parse(code, PARSE_OPTIONS) };
  } catch (e) {
    const err = e as { message?: string; loc?: { line: number; column: number } };
    return {
      error: {
        message: (err.message ?? "Syntax error").replace(/\s*\(\d+:\d+\)\s*$/, ""),
        line: err.loc?.line,
        column: err.loc ? err.loc.column + 1 : undefined,
      },
    };
  }
};

type Ident = Node & { name: string };

// acorn-walk visits declaration names as "VariablePattern", which its typings don't list
const visitors = (v: Record<string, (node: Node) => void>) =>
  v as unknown as walk.SimpleVisitors<unknown>;
type PropertyNode = Node & { shorthand?: boolean; key: Node; value: Node };

/**
 * Rename every reference to identifier `from` in `code` to `to`, via the AST so
 * strings, comments and property names (`obj.from`) are left alone. Falls back
 * to a whole-word replace when the code doesn't parse.
 */
export const renameIdentifier = (code: string, from: string, to: string): string => {
  if (from === to) return code;
  const { ast } = parseNotebookCode(code);
  if (!ast) {
    return code.replace(new RegExp(`(^|[^A-Za-z0-9_$.])${from}(?![A-Za-z0-9_$])`, "g"), `$1${to}`);
  }
  const edits: { start: number; end: number; text: string }[] = [];
  const shorthand = new Set<Node>();
  walk.simple(
    ast,
    visitors({
      Property: (node) => {
        const prop = node as PropertyNode;
        if (prop.shorthand && (prop.value as Ident).name === from) {
          shorthand.add(prop.value);
          edits.push({ start: prop.start, end: prop.end, text: `${from}: ${to}` });
        }
      },
      Identifier: (node) => {
        if ((node as Ident).name === from && !shorthand.has(node)) {
          edits.push({ start: node.start, end: node.end, text: to });
        }
      },
      VariablePattern: (node) => {
        if ((node as Ident).name === from && !shorthand.has(node)) {
          edits.push({ start: node.start, end: node.end, text: to });
        }
      },
    })
  );
  edits.sort((a, b) => b.start - a.start);
  let out = code;
  edits.forEach(({ start, end, text }) => {
    out = out.slice(0, start) + text + out.slice(end);
  });
  return out;
};

// Names user code can use without declaring them
const BUILTINS = new Set([
  "Array",
  "ArrayBuffer",
  "BigInt",
  "Boolean",
  "DataView",
  "Date",
  "Error",
  "EvalError",
  "Float32Array",
  "Float64Array",
  "Function",
  "Infinity",
  "Int8Array",
  "Int16Array",
  "Int32Array",
  "Intl",
  "JSON",
  "Map",
  "Math",
  "NaN",
  "Number",
  "Object",
  "Promise",
  "Proxy",
  "RangeError",
  "ReferenceError",
  "Reflect",
  "RegExp",
  "Set",
  "String",
  "Symbol",
  "SyntaxError",
  "TypeError",
  "URIError",
  "Uint8Array",
  "Uint8ClampedArray",
  "Uint16Array",
  "Uint32Array",
  "WeakMap",
  "WeakRef",
  "WeakSet",
  "AggregateError",
  "atob",
  "btoa",
  "console",
  "decodeURI",
  "decodeURIComponent",
  "document",
  "encodeURI",
  "encodeURIComponent",
  "eval",
  "globalThis",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "performance",
  "queueMicrotask",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "setInterval",
  "clearInterval",
  "setTimeout",
  "clearTimeout",
  "structuredClone",
  "undefined",
  "window",
  "arguments",
  "Image",
  "Node",
  "Element",
  "HTMLElement",
  "SVGElement",
  "DocumentFragment",
  "URL",
  "Blob",
  "TextEncoder",
  "TextDecoder",
  "crypto",
  "Iterator",
  "Intl",
  "escape",
  "unescape",
  "self",
]);

export interface UnknownIdentifier {
  name: string;
  from: number;
  to: number;
}

/**
 * Identifiers referenced but never declared, and not globals, inputs or
 * builtins. Scope is approximated as "declared anywhere in the cell", which
 * only ever under-reports.
 */
export const unknownIdentifiers = (ast: Node, inputs: string[]): UnknownIdentifier[] => {
  const declared = new Set<string>();
  const refs: Ident[] = [];
  walk.simple(
    ast,
    visitors({
      VariablePattern: (node) => declared.add((node as Ident).name),
      Identifier: (node) => refs.push(node as Ident),
    })
  );
  const known = new Set<string>([...BUILTINS, ...NOTEBOOK_GLOBALS, ...inputs, ...declared]);
  return refs
    .filter((r) => !known.has(r.name))
    .map((r) => ({ name: r.name, from: r.start, to: r.end }));
};

/** Whether the code references `width` (then it re-runs on resize). */
export const readsWidth = (code: string): boolean => {
  const { ast } = parseNotebookCode(code);
  if (!ast) return /\bwidth\b/.test(code);
  let found = false;
  walk.simple(ast, {
    Identifier: (node) => {
      if ((node as Ident).name === "width") found = true;
    },
  });
  return found;
};
