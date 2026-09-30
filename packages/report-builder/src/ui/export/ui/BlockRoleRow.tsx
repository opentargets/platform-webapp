import React, { memo, useState } from "react";
import { Avatar, Box, Button, Divider, ListItemIcon, Menu, MenuItem, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCheck } from "@fortawesome/free-solid-svg-icons";
import { DEFAULT_TOP_N } from "../layout";
import { roleLabel, validPaperRoles, validSlideRoles, validTableLayouts } from "../plan/roles";
import type {
  BlockExportOverride,
  DeepPartial,
  ExportPlan,
  ExportWarning,
  IRNode,
  PaperRole,
  SlideRole,
  TableLayout,
} from "../types";
import type { MappedTarget } from "./useExportFlow";
import { nodeIcon, nodeTitle, rowDomId } from "./nodeMeta";

const TABLE_LAYOUT_LABELS: Record<TableLayout, (topN: number) => string> = {
  topN: (n) => `Top ${n}`,
  split: () => "Split",
  appendix: () => "Appendix",
  omit: () => "Omit",
};

// Human label for a role in the menu: the part of the role line after the arrow
const roleText = (target: MappedTarget, node: IRNode, role: SlideRole | PaperRole) => {
  const label = roleLabel(target, node, role);
  const i = label.indexOf("→");
  const text = i >= 0 ? label.slice(i + 1).trim() : label;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const menuButtonSx = {
  textTransform: "none",
  fontSize: 12,
  minWidth: 0,
  px: 1,
  py: 0.25,
  height: 26,
} as const;

interface BlockRoleRowProps {
  target: MappedTarget;
  node: IRNode;
  effective?: ExportPlan["roles"][string];
  override?: BlockExportOverride;
  warnings: ExportWarning[];
  avatarText?: string; // widget short name
  selected?: boolean;
  twoColumn?: boolean; // paper: offer "Span both columns"
  spans?: boolean; // paper: whether the plan currently spans this block (defaults + override)
  onSelect?: (nodeId: string) => void;
  onOverride: (nodeId: string, patch: DeepPartial<BlockExportOverride> | undefined) => void;
  onRetry?: () => void;
  retrying?: boolean;
}

/** One IR node in step 2: avatar, title, mono role line, Layout ▾ and (when flagged) Fix ▾. */
export const BlockRoleRow: React.FC<BlockRoleRowProps> = memo(
  ({
    target,
    node,
    effective,
    override,
    warnings,
    avatarText,
    selected,
    twoColumn,
    spans,
    onSelect,
    onOverride,
    onRetry,
    retrying,
  }) => {
    const [layoutAnchor, setLayoutAnchor] = useState<HTMLElement | null>(null);
    const [fixAnchor, setFixAnchor] = useState<HTMLElement | null>(null);

    const roles: (SlideRole | PaperRole)[] = target === "slides" ? validSlideRoles(node) : validPaperRoles(node);
    const tableLayouts = target === "slides" ? validTableLayouts(node) : [];
    const role = effective?.role;
    const topN = effective?.topN ?? override?.topN ?? DEFAULT_TOP_N;
    const omitted = role === "omit";
    const roleLine = role ? roleLabel(target, node, role, effective?.tableLayout, effective?.topN) : "…";

    const flagged = warnings.filter((w) => w.severity === "warn");
    const info = warnings.filter((w) => w.severity === "info" && w.code !== "RASTER_FALLBACK");
    const missing = warnings.some((w) => w.code === "FIGURE_MISSING") || (node.type === "figure" && node.asset.kind === "missing");
    const rasterFallback = node.type === "figure" && node.rasterFallback;
    // Info warnings can carry a fix too (e.g. split a long table); offer those as well
    const fixes = warnings.filter((w) => w.fix);
    const canSpan = target === "paper" && twoColumn && (node.type === "figure" || node.type === "table");
    const isSpanned = spans ?? override?.spanColumns ?? false;

    const chooseRole = (next: SlideRole | PaperRole) => {
      setLayoutAnchor(null);
      // A role other than omit un-omits a table whose layout was "omit"
      const patch: DeepPartial<BlockExportOverride> = { role: next };
      if (next !== "omit" && override?.tableLayout === "omit") patch.tableLayout = undefined;
      onOverride(node.id, patch);
    };

    const chooseTableLayout = (next: TableLayout) => {
      setLayoutAnchor(null);
      onOverride(node.id, next === "omit" ? { tableLayout: next } : { tableLayout: next, role: undefined });
    };

    const toggleSpan = () => {
      setLayoutAnchor(null);
      onOverride(node.id, { spanColumns: !isSpanned });
    };

    const resetRow = () => {
      setLayoutAnchor(null);
      onOverride(node.id, undefined);
    };

    const hasOverride = !!override && Object.keys(override).length > 0;

    return (
      <Box
        id={rowDomId(node.id)}
        data-export-node-id={node.id}
        onClick={() => onSelect?.(node.id)}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          p: "8px 10px",
          bgcolor: selected ? "#e3f0fa" : "#fff",
          border: "1px",
          borderStyle: omitted ? "dashed" : "solid",
          borderColor: selected ? "primary.main" : "grey.300",
          borderRadius: "2px",
          opacity: omitted ? 0.75 : 1,
          cursor: onSelect ? "pointer" : "default",
          scrollMarginTop: 8,
        }}
      >
        <Avatar
          sx={{
            width: 26,
            height: 26,
            fontSize: 11,
            bgcolor: avatarText ? "primary.dark" : "grey.200",
            color: avatarText ? "white" : "grey.700",
            flexShrink: 0,
            mt: "2px",
          }}
        >
          {avatarText ?? <FontAwesomeIcon icon={nodeIcon(node)} />}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: "#616161" }} title={nodeTitle(node)}>
            {nodeTitle(node)}
          </Typography>
          <Typography
            noWrap
            sx={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: "text.secondary" }}
            title={roleLine}
          >
            {roleLine}
            {canSpan && isSpanned ? " · spans columns" : ""}
          </Typography>
          {rasterFallback && (
            <Typography sx={{ fontSize: 11, color: "text.secondary", fontStyle: "italic" }}>
              image only, not re-rendered
            </Typography>
          )}
          {flagged.map((w) => (
            <Typography key={`${w.code}-${w.message}`} sx={{ fontSize: 11, color: "secondary.main", mt: 0.25 }}>
              {w.message}
            </Typography>
          ))}
          {info.map((w) => (
            <Typography key={`${w.code}-${w.message}`} sx={{ fontSize: 11, color: "text.secondary", mt: 0.25 }}>
              {w.message}
            </Typography>
          ))}
        </Box>

        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, flexShrink: 0 }}
        >
          {(roles.length > 1 || tableLayouts.length > 0 || canSpan) && (
            <Button
              size="small"
              variant="text"
              aria-haspopup="menu"
              endIcon={<FontAwesomeIcon icon={faCaretDown} size="xs" />}
              onClick={(e) => setLayoutAnchor(e.currentTarget)}
              sx={menuButtonSx}
            >
              Layout
            </Button>
          )}
          {(flagged.length > 0 || fixes.length > 0 || missing) && (
            <Button
              size="small"
              variant="text"
              color="secondary"
              aria-haspopup="menu"
              endIcon={<FontAwesomeIcon icon={faCaretDown} size="xs" />}
              onClick={(e) => setFixAnchor(e.currentTarget)}
              sx={menuButtonSx}
            >
              Fix
            </Button>
          )}
        </Box>

        <Menu
          anchorEl={layoutAnchor}
          open={!!layoutAnchor}
          onClose={() => setLayoutAnchor(null)}
          onClick={(e) => e.stopPropagation()}
          slotProps={{ list: { dense: true } }}
        >
          {roles.map((r) => (
            <MenuItem key={r} selected={role === r && !tableLayouts.length} onClick={() => chooseRole(r)}>
              <ListItemIcon sx={{ minWidth: 24 }}>{role === r && <FontAwesomeIcon icon={faCheck} size="xs" />}</ListItemIcon>
              {roleText(target, node, r)}
            </MenuItem>
          ))}
          {tableLayouts.length > 0 && <Divider />}
          {tableLayouts.length > 0 && (
            <Typography sx={{ px: 2, py: 0.5, fontSize: 11, color: "text.secondary" }}>Table layout</Typography>
          )}
          {tableLayouts.map((l) => (
            <MenuItem key={l} onClick={() => chooseTableLayout(l)}>
              <ListItemIcon sx={{ minWidth: 24 }}>
                {effective?.tableLayout === l && <FontAwesomeIcon icon={faCheck} size="xs" />}
              </ListItemIcon>
              {TABLE_LAYOUT_LABELS[l](topN)}
            </MenuItem>
          ))}
          {canSpan && <Divider />}
          {canSpan && (
            <MenuItem onClick={toggleSpan}>
              <ListItemIcon sx={{ minWidth: 24 }}>
                {isSpanned && <FontAwesomeIcon icon={faCheck} size="xs" />}
              </ListItemIcon>
              Span both columns
            </MenuItem>
          )}
          {hasOverride && <Divider />}
          {hasOverride && (
            <MenuItem onClick={resetRow}>
              <ListItemIcon sx={{ minWidth: 24 }} />
              Reset to default
            </MenuItem>
          )}
        </Menu>

        <Menu
          anchorEl={fixAnchor}
          open={!!fixAnchor}
          onClose={() => setFixAnchor(null)}
          onClick={(e) => e.stopPropagation()}
          slotProps={{ list: { dense: true } }}
        >
          {fixes.map((w) => (
            <MenuItem
              key={`${w.code}-${w.fix!.label}`}
              onClick={() => {
                setFixAnchor(null);
                onOverride(node.id, w.fix!.override);
              }}
            >
              {w.fix!.label}
            </MenuItem>
          ))}
          {missing && onRetry && (
            <MenuItem
              disabled={retrying}
              onClick={() => {
                setFixAnchor(null);
                onRetry();
              }}
            >
              {retrying ? "Retrying…" : "Retry"}
            </MenuItem>
          )}
          {!omitted && roles.includes("omit") && !fixes.some((w) => w.fix!.override.role === "omit") && (
            <MenuItem onClick={() => chooseRole("omit")}>Omit</MenuItem>
          )}
        </Menu>
      </Box>
    );
  }
);

BlockRoleRow.displayName = "BlockRoleRow";

export default BlockRoleRow;
