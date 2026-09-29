import { parse, type Node } from "acorn";
import * as walk from "acorn-walk";
import type { NotebookError } from "./protocol";

export const GUARD_NAME = "__guard";
export const TIMEOUT_CLASS = "__LoopTimeout";

type LoopNode = Node & { body: Node; start: number; end: number; loc: { start: { line: number } } };

interface Insertion {
  at: number;
  text: string;
}

export type InstrumentResult = { ok: true; code: string; readsWidth: boolean } | { ok: false; error: NotebookError };

/**
 * Parse the user's code (an async function body) and prepend a guard call to
 * every loop body. Guards are spliced in on the same line as the loop so the
 * instrumented code keeps the user's line numbers; nothing is re-serialised.
 */
export function instrument(code: string): InstrumentResult {
  let ast: Node;
  try {
    ast = parse(code, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      locations: true,
    });
  } catch (e) {
    const err = e as { message?: string; loc?: { line: number; column: number } };
    return {
      ok: false,
      error: {
        kind: "syntax",
        message: (err.message ?? "Syntax error").replace(/\s*\(\d+:\d+\)\s*$/, ""),
        line: err.loc?.line,
        column: err.loc ? err.loc.column + 1 : undefined,
      },
    };
  }

  const insertions: Insertion[] = [];
  let readsWidth = false;

  const guardLoop = (node: Node) => {
    const loop = node as LoopNode;
    const line = loop.loc.start.line;
    const guard = `if(${GUARD_NAME}())throw new ${TIMEOUT_CLASS}(${line});`;
    if (loop.body.type === "BlockStatement") {
      insertions.push({ at: loop.body.start + 1, text: guard });
    } else {
      // `while (x) i++;` → `while (x) {guard; i++;}`
      insertions.push({ at: loop.body.start, text: `{${guard}` });
      insertions.push({ at: loop.body.end, text: "}" });
    }
  };

  walk.simple(ast, {
    ForStatement: guardLoop,
    ForInStatement: guardLoop,
    ForOfStatement: guardLoop,
    WhileStatement: guardLoop,
    DoWhileStatement: guardLoop,
    Identifier: (node) => {
      if ((node as Node & { name: string }).name === "width") readsWidth = true;
    },
  });

  // Apply from the end so earlier offsets stay valid
  insertions.sort((a, b) => b.at - a.at);
  let out = code;
  insertions.forEach(({ at, text }) => {
    out = out.slice(0, at) + text + out.slice(at);
  });
  return { ok: true, code: out, readsWidth };
}
