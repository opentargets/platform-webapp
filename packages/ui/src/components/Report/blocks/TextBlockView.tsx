import React from "react";
import { TextBlock } from "../../../types/report";
import { InlineBlockFrame } from "./BlockFrames";
import { useBlockEditor } from "./BlockEditorContext";
import { RichTextEditor } from "./RichTextEditor";
import { BlockViewProps } from "./types";

export const TextBlockView: React.FC<BlockViewProps<TextBlock>> = ({ block, index }) => {
  const { updateBlock, removeBlock, openInserter } = useBlockEditor();

  return (
    <InlineBlockFrame reportSectionId={block.reportSectionId} index={index} title="Text">
      <RichTextEditor
        doc={block.doc}
        ariaLabel="Text block"
        placeholder="Write something, or type / for blocks"
        onChange={(doc) => updateBlock(block.reportSectionId, { doc })}
        // Empty blocks are kept on blur; only an explicit Backspace removes them
        onBackspaceWhenEmpty={() => removeBlock(block.reportSectionId, { focusPrevious: true })}
        onSlash={({ anchorPosition, wasEmpty, removeSlash }) =>
          openInserter({
            insertIndex: index + 1,
            anchorPosition,
            replaceBlockId: wasEmpty ? block.reportSectionId : undefined,
            onBeforeInsert: removeSlash,
          })
        }
      />
    </InlineBlockFrame>
  );
};

export default TextBlockView;
