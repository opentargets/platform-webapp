import { v4 as uuidv4 } from "uuid";
import { NonWidgetBlock, ReportBlock } from "../../../types/report";
import { uniqueRef } from "./refs";

export const PLATFORM_GRAPHQL_ENDPOINT = "https://api.platform.opentargets.org/api/v4/graphql";

export type InsertableKind = NonWidgetBlock["kind"];

export const DEFAULT_NOTEBOOK_CODE = `// Link a block above, then refer to it by name, e.g. my_table.rows
return html\`<p>Link an input to start.</p>\`;
`;

const DEFAULT_QUERY = `query TargetInfo($ensemblId: String!) {
  target(ensemblId: $ensemblId) {
    id
    approvedSymbol
    approvedName
  }
}
`;

/**
 * A fresh block of `kind` with a new id, timestamp and per-kind defaults.
 * `blocks` (the report's current blocks) keeps data-block refs unique.
 */
export const createBlock = (
  kind: InsertableKind,
  blocks: ReportBlock[] = [],
  overrides: Partial<NonWidgetBlock> = {}
): NonWidgetBlock => {
  const base = { reportSectionId: uuidv4(), addedAt: Date.now() };
  const dataBase = (title: string) => ({
    title,
    ref: uniqueRef(title, blocks),
    display: "table" as const,
  });

  let block: NonWidgetBlock;
  switch (kind) {
    case "text":
      block = { ...base, kind, doc: { type: "doc", content: [{ type: "paragraph" }] } };
      break;
    case "heading":
      block = { ...base, kind, text: "", level: 2 };
      break;
    case "callout":
      block = { ...base, kind, tone: "info", doc: { type: "doc", content: [{ type: "paragraph" }] } };
      break;
    case "image":
      block = { ...base, kind, src: "", alt: "", width: "column" };
      break;
    case "divider":
      block = { ...base, kind };
      break;
    case "chapter":
      block = { ...base, kind, title: "" };
      break;
    case "graphql":
      block = {
        ...base,
        ...dataBase("GraphQL query"),
        kind,
        endpoint: PLATFORM_GRAPHQL_ENDPOINT,
        query: DEFAULT_QUERY,
        variables: {},
        onOpen: "rerun",
      };
      break;
    case "rest":
      block = {
        ...base,
        ...dataBase("REST endpoint"),
        kind,
        method: "GET",
        url: "",
        params: [],
        headers: [],
        onOpen: "snapshot",
      };
      break;
    case "table":
      block = {
        ...base,
        ...dataBase("Table"),
        kind,
        source: { type: "paste" },
        columns: [],
        rows: [],
      };
      break;
    case "notebook":
      block = {
        ...base,
        kind,
        title: "Untitled notebook",
        ref: uniqueRef("notebook", blocks),
        inputs: [],
        code: DEFAULT_NOTEBOOK_CODE,
        display: "auto",
        height: null,
        runMode: "auto",
        hideCodeInExport: true,
      };
      break;
  }
  return { ...block, ...overrides } as NonWidgetBlock;
};
