import { isNotebook, type ReportBlock, refOf } from "./types";

/**
 * Dependency graph over refs. There's an edge `input → notebook` for every
 * linked input; only notebooks have inputs, so every edge ends at a notebook.
 */
export interface RefGraph {
  nodes: string[];
  // input ref → refs of the notebooks that read it
  downstream: Map<string, string[]>;
  // notebook ref → its input refs
  upstream: Map<string, string[]>;
  // ref → block id
  blockIds: Map<string, string>;
}

export const buildGraph = (blocks: ReportBlock[]): RefGraph => {
  const nodes: string[] = [];
  const downstream = new Map<string, string[]>();
  const upstream = new Map<string, string[]>();
  const blockIds = new Map<string, string>();
  blocks.forEach((block) => {
    const ref = refOf(block);
    if (!ref) return;
    nodes.push(ref);
    blockIds.set(ref, block.reportSectionId);
    if (!downstream.has(ref)) downstream.set(ref, []);
  });
  blocks.forEach((block) => {
    if (!isNotebook(block)) return;
    upstream.set(block.ref, [...block.inputs]);
    block.inputs.forEach((input) => {
      const list = downstream.get(input) ?? [];
      list.push(block.ref);
      downstream.set(input, list);
    });
  });
  return { nodes, downstream, upstream, blockIds };
};

/** Every ref reachable from `ref` following input → notebook edges (excluding itself). */
export const downstreamOf = (graph: RefGraph, ref: string): string[] => {
  const seen = new Set<string>();
  const stack = [...(graph.downstream.get(ref) ?? [])];
  while (stack.length) {
    const next = stack.pop() as string;
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...(graph.downstream.get(next) ?? []));
  }
  return Array.from(seen);
};

export const upstreamOf = (graph: RefGraph, ref: string): string[] => {
  const seen = new Set<string>();
  const stack = [...(graph.upstream.get(ref) ?? [])];
  while (stack.length) {
    const next = stack.pop() as string;
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...(graph.upstream.get(next) ?? []));
  }
  return Array.from(seen);
};

/**
 * The path `notebookRef → … → inputRef` that linking `inputRef` into
 * `notebookRef` would close into a loop, or null when the link is fine.
 */
export const cyclePath = (
  graph: RefGraph,
  notebookRef: string,
  inputRef: string
): string[] | null => {
  if (notebookRef === inputRef) return [notebookRef, notebookRef];
  // BFS from the notebook along downstream edges looking for the input
  const parent = new Map<string, string>();
  const queue = [notebookRef];
  const seen = new Set([notebookRef]);
  while (queue.length) {
    const current = queue.shift() as string;
    for (const next of graph.downstream.get(current) ?? []) {
      if (seen.has(next)) continue;
      parent.set(next, current);
      if (next === inputRef) {
        const path = [inputRef];
        let node = inputRef;
        while (node !== notebookRef) {
          node = parent.get(node) as string;
          path.unshift(node);
        }
        path.push(notebookRef);
        return path;
      }
      seen.add(next);
      queue.push(next);
    }
  }
  return null;
};

export const wouldCreateCycle = (
  blocks: ReportBlock[],
  notebookRef: string,
  inputRef: string
): boolean => cyclePath(buildGraph(blocks), notebookRef, inputRef) !== null;

/** Refs in an order where every notebook comes after all of its inputs. */
export const topoOrder = (graph: RefGraph): string[] => {
  const indegree = new Map<string, number>();
  graph.nodes.forEach((ref) => indegree.set(ref, (graph.upstream.get(ref) ?? []).length));
  const ready = graph.nodes.filter((ref) => indegree.get(ref) === 0);
  const order: string[] = [];
  while (ready.length) {
    const ref = ready.shift() as string;
    order.push(ref);
    (graph.downstream.get(ref) ?? []).forEach((next) => {
      const remaining = (indegree.get(next) ?? 1) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) ready.push(next);
    });
  }
  return order;
};
