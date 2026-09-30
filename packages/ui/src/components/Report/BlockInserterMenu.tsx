import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, InputBase, Popover, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faAlignLeft,
  faBookmark,
  faCircleInfo,
  faCode,
  faGlobe,
  faImage,
  faMinus,
  faSquareRootVariable,
  faTable,
} from "@fortawesome/free-solid-svg-icons";
import { useReportBuilder } from "../../providers/ReportBuilderProvider";
import { createBlock, InsertableKind } from "./blocks/defaults";
import { InserterRequest, useBlockEditor } from "./blocks/BlockEditorContext";

interface InserterItem {
  kind: InsertableKind;
  label: string;
  icon: IconDefinition;
  group: "narrative" | "data";
  aliases: string[];
}

const ITEMS: InserterItem[] = [
  {
    kind: "text",
    label: "Text",
    icon: faAlignLeft,
    group: "narrative",
    aliases: ["paragraph", "prose", "body", "write", "heading", "h2", "h3", "title", "rich"],
  },
  {
    kind: "callout",
    label: "Callout",
    icon: faCircleInfo,
    group: "narrative",
    aliases: ["note", "info", "warning", "caveat", "finding", "admonition"],
  },
  {
    kind: "image",
    label: "Image / upload",
    icon: faImage,
    group: "narrative",
    aliases: ["picture", "photo", "figure", "upload", "png", "jpg", "svg"],
  },
  {
    kind: "divider",
    label: "Divider",
    icon: faMinus,
    group: "narrative",
    aliases: ["rule", "separator", "hr", "line"],
  },
  {
    kind: "chapter",
    label: "Chapter break",
    icon: faBookmark,
    group: "narrative",
    aliases: ["section", "part", "chapter"],
  },
  {
    kind: "graphql",
    label: "GraphQL query",
    icon: faCode,
    group: "data",
    aliases: ["query", "api", "gql", "graphql"],
  },
  {
    kind: "rest",
    label: "REST endpoint",
    icon: faGlobe,
    group: "data",
    aliases: ["api", "http", "fetch", "url", "json"],
  },
  {
    kind: "table",
    label: "Table / CSV",
    icon: faTable,
    group: "data",
    aliases: ["csv", "tsv", "spreadsheet", "excel", "paste", "data"],
  },
  {
    kind: "notebook",
    label: "Notebook",
    icon: faSquareRootVariable,
    group: "data",
    aliases: ["d3", "plot", "chart", "javascript", "code", "viz", "notebook", "cell", "compute"],
  },
];

const NARRATIVE_KINDS = new Set<InsertableKind>(
  ITEMS.filter((i) => i.group === "narrative").map((i) => i.kind)
);
const COLUMNS = 3;

const groupLabelSx = {
  fontFamily: '"Roboto Mono", monospace',
  fontSize: 11,
  letterSpacing: ".06em",
  color: "grey.500",
  textTransform: "uppercase",
  mb: 0.75,
} as const;

interface BlockInserterMenuProps {
  request: InserterRequest | null;
  onClose: () => void;
}

/**
 * Popover listing narrative and data block kinds. Widgets are deliberately
 * absent: they're only added from the page.
 */
export const BlockInserterMenu: React.FC<BlockInserterMenuProps> = ({ request, onClose }) => {
  const { dispatch } = useReportBuilder();
  const { report, insertBlock, removeBlock } = useBlockEditor();
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (request) {
      setSearch("");
      setActiveIndex(0);
    }
  }, [request]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.aliases.some((a) => a.startsWith(q))
    );
  }, [search]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const choose = (item: InserterItem) => {
    if (!request) return;
    const { insertIndex, replaceBlockId, onBeforeInsert } = request;
    onClose();
    onBeforeInsert?.();
    const block = createBlock(item.kind, report.sections);
    const replaceIndex = replaceBlockId
      ? report.sections.findIndex((b) => b.reportSectionId === replaceBlockId)
      : -1;
    if (replaceIndex !== -1 && NARRATIVE_KINDS.has(item.kind)) {
      removeBlock(replaceBlockId as string);
      insertBlock(block, replaceIndex);
    } else {
      insertBlock(block, insertIndex);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -COLUMNS,
      ArrowDown: COLUMNS,
    };
    if (event.key in moves && filtered.length > 0) {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, Math.min(filtered.length - 1, i + moves[event.key])));
    } else if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      choose(filtered[activeIndex]);
    }
  };

  const renderGroup = (group: InserterItem["group"], label: string) => {
    const items = filtered.filter((i) => i.group === group);
    if (items.length === 0) return null;
    return (
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={groupLabelSx}>{label}</Typography>
        <Box
          role="group"
          aria-label={label}
          sx={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`, gap: 0.75 }}
        >
          {items.map((item) => {
            const index = filtered.indexOf(item);
            const active = index === activeIndex;
            return (
              <Box
                key={item.kind}
                id={`block-option-${item.kind}`}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(item)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: "7px 9px",
                  fontSize: 13,
                  border: "1px solid",
                  borderColor: active ? "primary.main" : "grey.300",
                  borderRadius: "2px",
                  cursor: "pointer",
                  color: "text.primary",
                  bgcolor: active ? "#e3f0fa" : "#fff",
                  "&:hover": { bgcolor: active ? "#e3f0fa" : "#f2f8fd" },
                }}
              >
                <Box sx={{ color: "primary.dark", width: 14, display: "flex", justifyContent: "center" }}>
                  <FontAwesomeIcon icon={item.icon} />
                </Box>
                {item.label}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Popover
      open={!!request}
      onClose={onClose}
      // Focus moves into the new block; don't pull it back to the + button
      disableRestoreFocus
      anchorEl={request?.anchorEl}
      anchorReference={request?.anchorPosition ? "anchorPosition" : "anchorEl"}
      anchorPosition={request?.anchorPosition}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{ paper: { sx: { width: 520, maxWidth: "calc(100vw - 32px)", p: 1.5 } } }}
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
          inputProps={{
            "aria-label": "Search blocks",
            role: "combobox",
            "aria-expanded": true,
            "aria-controls": "block-inserter-options",
            "aria-activedescendant": filtered[activeIndex]
              ? `block-option-${filtered[activeIndex].kind}`
              : undefined,
          }}
          sx={{
            border: "1px solid",
            borderColor: "grey.300",
            borderRadius: "2px",
            px: 1,
            py: 0.25,
            mb: 1.5,
            fontSize: 14,
          }}
        />
        <Box id="block-inserter-options" role="listbox" aria-label="Block types">
          {renderGroup("narrative", "Narrative")}
          {renderGroup("data", "Compute & data")}
          {filtered.length === 0 && (
            <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.5 }}>
              No matching blocks
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "grey.300",
            pt: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: 12, fontStyle: "italic", color: "text.secondary", flex: 1 }}>
            Platform widgets are added from the page — use "Add to narrative" on any section.
          </Typography>
          <Button
            size="small"
            onClick={() => {
              onClose();
              dispatch({ type: "toggleBuilderOpen", isOpen: false });
            }}
            sx={{ textTransform: "none", flexShrink: 0 }}
          >
            Close drawer
          </Button>
        </Box>
      </Box>
    </Popover>
  );
};

export default BlockInserterMenu;
