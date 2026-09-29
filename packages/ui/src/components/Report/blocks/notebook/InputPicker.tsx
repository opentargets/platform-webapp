import React, { useEffect, useMemo, useState } from "react";
import { Avatar, Box, InputBase, Popover, Tooltip, Typography } from "@mui/material";
import { isNotebook, isWidget, refOf, type NotebookBlock, type ReportBlock } from "../../../../types/report";
import { useBlockEditor } from "../BlockEditorContext";
import { monoSx } from "../DataBlockShell";
import { uniqueRef } from "../refs";
import { buildGraph, cyclePath } from "./graph";
import { linkableBlocks, resolveInput } from "./resolveInputs";

interface Candidate {
  block: ReportBlock;
  title: string;
  kind: string;
  avatar: string;
  // Existing ref, or the one a widget would get when linked
  ref: string;
  rows: number;
  disabled?: string;
}

interface InputPickerProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  notebook: NotebookBlock;
  // Pre-filled search (lint quick-fix)
  initialSearch?: string;
  onPick: (block: ReportBlock, ref: string) => void;
}

const AVATARS: Record<string, string> = { graphql: "GQL", rest: "API", table: "CSV", notebook: "{ }" };

/**
 * Searchable list of every block that can be an input: widgets, tables, data
 * blocks and other notebooks — never narrative blocks, the notebook itself,
 * already-linked blocks, or anything that would close a loop.
 */
export const InputPicker: React.FC<InputPickerProps> = ({
  open,
  anchorEl,
  onClose,
  notebook,
  initialSearch = "",
  onPick,
}) => {
  const { report } = useBlockEditor();
  const [search, setSearch] = useState(initialSearch);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setSearch(initialSearch);
      setActiveIndex(0);
    }
  }, [open, initialSearch]);

  const candidates = useMemo<Candidate[]>(() => {
    if (!open) return [];
    const blocks = report.sections;
    const graph = buildGraph(blocks);
    return linkableBlocks(blocks, notebook)
      .filter((block) => {
        const ref = refOf(block);
        return !ref || !notebook.inputs.includes(ref);
      })
      .map((block) => {
        const ref = refOf(block) ?? uniqueRef(isWidget(block) ? block.definition.name : "block", blocks);
        const loop = refOf(block) ? cyclePath(graph, notebook.ref, ref) : null;
        const resolved = refOf(block) ? resolveInput(blocks, ref) : null;
        const rows = resolved?.summary.rows ?? (isWidget(block) ? resolveWidgetRows(block, blocks) : 0);
        if (isWidget(block)) {
          return {
            block,
            title: block.definition.name,
            kind: `widget · ${block.definition.entity}${block.entityLabel ? ` · ${block.entityLabel}` : ""}`,
            avatar: block.definition.shortName || block.definition.name.charAt(0),
            ref,
            rows,
            disabled: loop ? `Would create a loop: ${loop.join(" → ")}` : undefined,
          };
        }
        const kind = isNotebook(block) ? "notebook" : block.kind;
        return {
          block,
          title: "title" in block ? block.title : kind,
          kind,
          avatar: AVATARS[kind] ?? kind.slice(0, 3).toUpperCase(),
          ref,
          rows,
          disabled: loop ? `Would create a loop: ${loop.join(" → ")}` : undefined,
        };
      });
  }, [open, report.sections, notebook]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) => c.title.toLowerCase().includes(q) || c.ref.includes(q) || c.kind.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const choose = (candidate: Candidate) => {
    if (candidate.disabled) return;
    onClose();
    onPick(candidate.block, candidate.ref);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => Math.max(0, Math.min(filtered.length - 1, i + delta)));
    } else if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      choose(filtered[activeIndex]);
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{ paper: { sx: { width: 420, maxWidth: "calc(100vw - 32px)", p: 1 } } }}
    >
      <Box onKeyDown={handleKeyDown}>
        <InputBase
          autoFocus
          fullWidth
          placeholder="Search blocks…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveIndex(0);
          }}
          inputProps={{ "aria-label": "Search blocks to link", role: "combobox", "aria-expanded": true }}
          sx={{ border: "1px solid", borderColor: "grey.300", borderRadius: "2px", px: 1, py: 0.25, mb: 1, fontSize: 14 }}
        />
        <Box role="listbox" aria-label="Blocks" sx={{ maxHeight: 320, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <Typography sx={{ fontSize: 13, color: "text.secondary", p: 1 }}>
              {candidates.length === 0 ? "No other blocks can be linked yet." : "No matching blocks"}
            </Typography>
          )}
          {filtered.map((candidate, index) => {
            const active = index === activeIndex;
            const row = (
              <Box
                role="option"
                aria-selected={active}
                aria-disabled={!!candidate.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(candidate)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: "6px 8px",
                  borderRadius: "2px",
                  cursor: candidate.disabled ? "not-allowed" : "pointer",
                  opacity: candidate.disabled ? 0.5 : 1,
                  bgcolor: active ? "#e3f0fa" : "transparent",
                }}
              >
                <Avatar sx={{ width: 26, height: 26, fontSize: 10, fontWeight: 700, bgcolor: "primary.dark" }}>
                  {candidate.avatar}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: "#616161" }}>
                    {candidate.title}
                  </Typography>
                  <Typography noWrap sx={{ ...monoSx, fontSize: 11, color: "grey.600" }}>
                    {candidate.kind} · {candidate.ref}
                    {refOf(candidate.block) ? "" : " (new ref)"}
                  </Typography>
                </Box>
                <Typography sx={{ ...monoSx, fontSize: 11, color: "grey.600", flexShrink: 0 }}>
                  {candidate.rows.toLocaleString()} rows
                </Typography>
              </Box>
            );
            return candidate.disabled ? (
              <Tooltip key={candidate.block.reportSectionId} title={candidate.disabled}>
                <span>{row}</span>
              </Tooltip>
            ) : (
              <React.Fragment key={candidate.block.reportSectionId}>{row}</React.Fragment>
            );
          })}
        </Box>
      </Box>
    </Popover>
  );
};

// A widget without a ref isn't resolvable by ref yet; count its rows directly
const resolveWidgetRows = (block: ReportBlock, blocks: ReportBlock[]): number => {
  if (!isWidget(block)) return 0;
  try {
    const probe = { ...block, ref: "__probe__" } as ReportBlock;
    return resolveInput([...blocks.filter((b) => b !== block), probe], "__probe__").summary.rows;
  } catch {
    return 0;
  }
};

export default InputPicker;
