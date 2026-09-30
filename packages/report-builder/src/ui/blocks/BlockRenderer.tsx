import React from "react";
import { NonWidgetBlock } from "../../core";
import { CalloutBlockView } from "./CalloutBlockView";
import { ChapterBlockView } from "./ChapterBlockView";
import { DividerBlockView } from "./DividerBlockView";
import { GraphqlBlockView } from "./GraphqlBlockView";
import { HeadingBlockView } from "./HeadingBlockView";
import { ImageBlockView } from "./ImageBlockView";
import { NotebookBlockView } from "./notebook/NotebookBlockView";
import { RestBlockView } from "./RestBlockView";
import { TableBlockView } from "./TableBlockView";
import { TextBlockView } from "./TextBlockView";
import { BlockViewProps } from "./types";

// Kinds that render as collapsible rows (header + expandable body)
export const COLLAPSIBLE_KINDS = new Set<NonWidgetBlock["kind"]>([
  "image",
  "graphql",
  "rest",
  "table",
  "notebook",
]);

export const blockTitle = (block: NonWidgetBlock): string => {
  switch (block.kind) {
    case "graphql":
    case "rest":
    case "table":
    case "notebook":
      return block.title;
    case "image":
      return block.caption || block.fileName || "Image";
    case "heading":
      return block.text || "Heading";
    case "chapter":
      return block.title || "Chapter";
    case "callout":
      return "Callout";
    case "divider":
      return "Divider";
    default:
      return "Text";
  }
};

/**
 * switch(kind) → view, for every non-widget block
 */
export const BlockRenderer: React.FC<BlockViewProps<NonWidgetBlock>> = ({ block, ...rest }) => {
  switch (block.kind) {
    case "text":
      return <TextBlockView block={block} {...rest} />;
    // Legacy: headings are now styles inside Text blocks; kept so saved reports still render
    case "heading":
      return <HeadingBlockView block={block} {...rest} />;
    case "callout":
      return <CalloutBlockView block={block} {...rest} />;
    case "image":
      return <ImageBlockView block={block} {...rest} />;
    case "divider":
      return <DividerBlockView block={block} {...rest} />;
    case "chapter":
      return <ChapterBlockView block={block} {...rest} />;
    case "graphql":
      return <GraphqlBlockView block={block} {...rest} />;
    case "rest":
      return <RestBlockView block={block} {...rest} />;
    case "table":
      return <TableBlockView block={block} {...rest} />;
    case "notebook":
      return <NotebookBlockView block={block} {...rest} />;
    default:
      return null;
  }
};

export default BlockRenderer;
