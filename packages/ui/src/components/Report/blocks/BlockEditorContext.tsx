import React, { createContext, ReactNode, useCallback, useContext, useMemo } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useReportBuilder } from "../../../providers/ReportBuilderProvider";
import { NonWidgetBlock, Report, ReportBlock } from "../../../types/report";

/**
 * Where the inserter menu should open and what choosing a tile does
 */
export interface InserterRequest {
  insertIndex: number;
  anchorEl?: HTMLElement | null;
  // Slash command: anchor at the caret instead of an element
  anchorPosition?: { top: number; left: number };
  // Slash command in an empty Text block: narrative kinds replace that block
  replaceBlockId?: string;
  // Runs before the block is inserted (e.g. delete the typed "/")
  onBeforeInsert?: () => void;
}

interface BlockEditorContextValue {
  report: Report;
  openInserter: (request: InserterRequest) => void;
  // Move focus into a block's primary field (new block, or previous block after a delete)
  requestFocus: (reportSectionId: string) => void;
  insertBlock: (block: NonWidgetBlock, atIndex: number) => void;
  updateBlock: (reportSectionId: string, patch: Partial<ReportBlock>) => void;
  moveBlock: (reportSectionId: string, delta: -1 | 1) => void;
  // Remove a block; `focusPrevious` moves focus to the block above it
  removeBlock: (reportSectionId: string, options?: { confirm?: string; focusPrevious?: boolean }) => void;
  duplicateBlock: (reportSectionId: string) => void;
}

const BlockEditorContext = createContext<BlockEditorContextValue | null>(null);

export const useBlockEditor = (): BlockEditorContextValue => {
  const context = useContext(BlockEditorContext);
  if (!context) throw new Error("useBlockEditor must be used inside BlockEditorProvider");
  return context;
};

export const FOCUS_TARGET_ATTR = "data-block-autofocus";

/**
 * Focus a block's primary field: an element marked data-block-autofocus, else its
 * rich-text editor, else its row header. Retried for a few frames so a block that
 * was just inserted has time to mount.
 */
export const focusBlockElement = (reportSectionId: string, attempts = 6): void => {
  const root = document.querySelector<HTMLElement>(`[data-report-section-id="${reportSectionId}"]`);
  const target =
    root?.querySelector<HTMLElement>(`[${FOCUS_TARGET_ATTR}]`) ??
    root?.querySelector<HTMLElement>(".ProseMirror") ??
    root?.querySelector<HTMLElement>("[data-report-row-header]");
  if (target) {
    target.focus();
    target.scrollIntoView?.({ block: "nearest" });
    return;
  }
  if (attempts > 0) requestAnimationFrame(() => focusBlockElement(reportSectionId, attempts - 1));
};

interface BlockEditorProviderProps {
  report: Report;
  openInserter: (request: InserterRequest) => void;
  // Called after a block is inserted (e.g. to expand collapsible kinds)
  onInserted?: (block: NonWidgetBlock) => void;
  children: ReactNode;
}

export const BlockEditorProvider: React.FC<BlockEditorProviderProps> = ({
  report,
  openInserter,
  onInserted,
  children,
}) => {
  const { dispatch } = useReportBuilder();
  const blocks = report.sections;

  const requestFocus = useCallback((id: string) => {
    requestAnimationFrame(() => focusBlockElement(id));
  }, []);

  const insertBlock = useCallback(
    (block: NonWidgetBlock, atIndex: number) => {
      dispatch({ type: "insertBlock", block, atIndex });
      onInserted?.(block);
      requestFocus(block.reportSectionId);
    },
    [dispatch, onInserted, requestFocus]
  );

  const updateBlock = useCallback(
    (reportSectionId: string, patch: Partial<ReportBlock>) =>
      dispatch({ type: "updateBlock", reportSectionId, patch }),
    [dispatch]
  );

  const moveBlock = useCallback(
    (reportSectionId: string, delta: -1 | 1) => {
      const from = blocks.findIndex((b) => b.reportSectionId === reportSectionId);
      const to = from + delta;
      if (from === -1 || to < 0 || to >= blocks.length) return;
      dispatch({ type: "reorderSections", newOrder: arrayMove(blocks, from, to) });
    },
    [blocks, dispatch]
  );

  const removeBlock = useCallback(
    (reportSectionId: string, options: { confirm?: string; focusPrevious?: boolean } = {}) => {
      if (options.confirm && !window.confirm(options.confirm)) return;
      const index = blocks.findIndex((b) => b.reportSectionId === reportSectionId);
      dispatch({ type: "removeSectionFromReport", reportSectionId });
      const previous = blocks[index - 1];
      if (options.focusPrevious && previous) requestFocus(previous.reportSectionId);
    },
    [blocks, dispatch, requestFocus]
  );

  const duplicateBlock = useCallback(
    (reportSectionId: string) => dispatch({ type: "duplicateBlock", reportSectionId }),
    [dispatch]
  );

  const value = useMemo(
    () => ({
      report,
      openInserter,
      requestFocus,
      insertBlock,
      updateBlock,
      moveBlock,
      removeBlock,
      duplicateBlock,
    }),
    [report, openInserter, requestFocus, insertBlock, updateBlock, moveBlock, removeBlock, duplicateBlock]
  );

  return <BlockEditorContext.Provider value={value}>{children}</BlockEditorContext.Provider>;
};
