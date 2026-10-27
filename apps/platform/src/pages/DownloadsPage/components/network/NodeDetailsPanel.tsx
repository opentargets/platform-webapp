import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight, faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Box, IconButton, Typography } from "ui";
import BasketToggleButton from "../BasketToggleButton";
import CategoryDot from "../CategoryDot";
import DatasetActionLinks from "../DatasetActionLinks";
import { CONTROL_BORDER, MONO_FONT, RADIUS } from "../tokens";

export interface PanelNode {
  id: string;
  label: string;
  type: string;
  description?: string;
}

interface NodeDetailsPanelProps {
  node: PanelNode;
  neighbours: PanelNode[];
  inBasket: (id: string) => boolean;
  onToggleBasket: (id: string) => void;
  onAddAll: (ids: string[]) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** Above this many neighbours the connected list groups by category with collapsible headers */
const HUB_THRESHOLD = 8;
/** Groups larger than this start collapsed */
const COLLAPSED_GROUP_SIZE = 5;
export const PANEL_WIDTH = 320;

const headerLabelSx = (theme: any) => ({
  fontSize: ".6875rem",
  fontWeight: 600,
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  color: theme.palette.grey[500],
});

/**
 * Docked panel for the selected network node: its details and actions, then
 * every dataset it connects to. Clicking a connected row moves the selection.
 */
function NodeDetailsPanel({ node, neighbours, inBasket, onToggleBasket, onAddAll, onSelect, onClose }: NodeDetailsPanelProps) {
  const isHub = neighbours.length > HUB_THRESHOLD;

  return (
    <Box
      component="aside"
      aria-label={`${node.label} details`}
      sx={theme => ({
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: PANEL_WIDTH,
        maxWidth: "100%",
        zIndex: 3,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
        borderLeft: `1px solid ${theme.palette.divider}`,
      })}
    >
      <Box
        sx={theme => ({
          display: "flex",
          flexDirection: "column",
          gap: 1,
          padding: "16px 18px",
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CategoryDot category={node.type} />
          <Typography component="span" sx={theme => ({ fontSize: ".75rem", color: theme.palette.grey[600], flex: 1 })}>
            {node.type}
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Clear selection" sx={{ m: -0.5 }}>
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Box>
          <Typography component="h3" sx={theme => ({ fontSize: "1.125rem", fontWeight: 700, lineHeight: 1.3, color: theme.palette.grey[800], m: 0 })}>
            {node.label}
          </Typography>
          <Typography component="div" sx={theme => ({ fontFamily: MONO_FONT, fontSize: ".75rem", color: theme.palette.grey[500] })}>
            {node.id}
          </Typography>
        </Box>
        {node.description && (
          <Typography sx={theme => ({ fontSize: ".8125rem", lineHeight: 1.5, color: theme.palette.grey[700] })}>
            {node.description}
          </Typography>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          <DatasetActionLinks datasetId={node.id} />
          <Box sx={{ flex: 1 }} />
          <BasketToggleButton inBasket={inBasket(node.id)} onToggle={() => onToggleBasket(node.id)} datasetName={node.label} />
        </Box>
      </Box>

      {isHub ? (
        <GroupedConnectedList neighbours={neighbours} inBasket={inBasket} onToggleBasket={onToggleBasket} onAddAll={onAddAll} onSelect={onSelect} />
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <Typography component="h4" sx={theme => ({ ...headerLabelSx(theme), m: 0, padding: "12px 18px 6px" })}>
            Connected datasets · {neighbours.length}
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
            {neighbours.map(n => (
              <ConnectedRow key={n.id} node={n} inBasket={inBasket(n.id)} onToggleBasket={onToggleBasket} onSelect={onSelect} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

/* ------------------------------------------------------------------ */

interface ConnectedRowProps {
  node: PanelNode;
  inBasket: boolean;
  onToggleBasket: (id: string) => void;
  onSelect: (id: string) => void;
  indented?: boolean;
}

export function ConnectedRow({ node, inBasket, onToggleBasket, onSelect, indented = false }: ConnectedRowProps) {
  return (
    <Box
      component="li"
      sx={theme => ({
        display: "flex",
        alignItems: "center",
        gap: 1,
        padding: `9px 18px 9px ${indented ? 36 : 18}px`,
        borderBottom: `1px solid ${theme.palette.grey[200]}`,
        "&:hover": { backgroundColor: theme.palette.grey[50] },
      })}
    >
      {!indented && <CategoryDot category={node.type} />}
      <Box
        component="button"
        type="button"
        onClick={() => onSelect(node.id)}
        sx={{
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          border: 0,
          padding: 0,
          background: "none",
          cursor: "pointer",
          font: "inherit",
          color: "inherit",
          "&:hover .connected-name": { textDecoration: "underline" },
        }}
      >
        <Typography className="connected-name" component="div" sx={theme => ({ fontSize: ".8125rem", fontWeight: 500, color: theme.palette.grey[800], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
          {node.label}
        </Typography>
        <Typography component="div" sx={theme => ({ fontFamily: MONO_FONT, fontSize: ".6875rem", color: theme.palette.grey[500] })}>
          {node.id}
        </Typography>
      </Box>
      <BasketToggleButton variant="text" inBasket={inBasket} onToggle={() => onToggleBasket(node.id)} datasetName={node.label} />
    </Box>
  );
}

/* ------------------------------------------------------------------ */

interface GroupedConnectedListProps {
  neighbours: PanelNode[];
  inBasket: (id: string) => boolean;
  onToggleBasket: (id: string) => void;
  onAddAll: (ids: string[]) => void;
  onSelect: (id: string) => void;
}

function GroupedConnectedList({ neighbours, inBasket, onToggleBasket, onAddAll, onSelect }: GroupedConnectedListProps) {
  const [filter, setFilter] = useState("");

  const groups = useMemo(() => {
    const byCategory = new Map<string, PanelNode[]>();
    neighbours.forEach(n => {
      const list = byCategory.get(n.type) ?? [];
      list.push(n);
      byCategory.set(n.type, list);
    });
    return Array.from(byCategory.entries())
      .map(([category, nodes]) => ({ category, nodes: [...nodes].sort((a, b) => a.label.localeCompare(b.label)) }))
      .sort((a, b) => b.nodes.length - a.nodes.length || a.category.localeCompare(b.category));
  }, [neighbours]);

  // Which groups the user has toggled; untouched groups follow the size rule
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [allCollapsed, setAllCollapsed] = useState<boolean | null>(null);
  const isCollapsed = (category: string, size: number) => {
    if (category in overrides) return overrides[category];
    if (allCollapsed !== null) return allCollapsed;
    return size > COLLAPSED_GROUP_SIZE;
  };
  const toggleGroup = (category: string, size: number) =>
    setOverrides(prev => ({ ...prev, [category]: !isCollapsed(category, size) }));
  const anyExpanded = groups.some(g => !isCollapsed(g.category, g.nodes.length));
  const setAll = (collapsed: boolean) => {
    setOverrides({});
    setAllCollapsed(collapsed);
  };

  const q = filter.trim().toLowerCase();
  const matches = (n: PanelNode) => !q || n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q);

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, padding: "12px 18px 6px" }}>
        <Typography component="h4" sx={theme => ({ ...headerLabelSx(theme), m: 0, flex: 1 })}>
          Connected datasets · {neighbours.length}
        </Typography>
        <Box
          component="button"
          type="button"
          onClick={() => setAll(anyExpanded)}
          sx={theme => ({ border: 0, padding: 0, background: "none", cursor: "pointer", font: "inherit", fontSize: ".75rem", color: theme.palette.primary.main, "&:hover": { textDecoration: "underline" } })}
        >
          {anyExpanded ? "Collapse all" : "Expand all"}
        </Box>
      </Box>
      <Box
        sx={theme => ({
          display: "flex",
          alignItems: "center",
          gap: 1,
          mx: "18px",
          mb: 1,
          padding: "5px 8px",
          border: `1px solid ${CONTROL_BORDER}`,
          borderRadius: RADIUS,
          color: theme.palette.grey[500],
          "&:focus-within": { borderColor: theme.palette.primary.dark },
        })}
      >
        <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 11 }} aria-hidden />
        <Box
          component="input"
          type="search"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter connections"
          aria-label="Filter connections"
          sx={theme => ({ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", font: "inherit", fontSize: ".8125rem", color: theme.palette.text.primary, "&::-webkit-search-cancel-button": { display: "none" } })}
        />
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {groups.map(({ category, nodes }) => {
          const visible = q ? nodes.filter(matches) : nodes;
          if (q && !visible.length) return null;
          const collapsed = !q && isCollapsed(category, nodes.length);
          const missing = nodes.filter(n => !inBasket(n.id)).map(n => n.id);
          return (
            <Box key={category}>
              <ConnectedGroupHeader
                category={category}
                count={nodes.length}
                collapsed={collapsed}
                onToggle={() => toggleGroup(category, nodes.length)}
                missingCount={missing.length}
                onAddAll={() => onAddAll(missing)}
              />
              {!collapsed && (
                <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
                  {visible.map(n => (
                    <ConnectedRow key={n.id} node={n} indented inBasket={inBasket(n.id)} onToggleBasket={onToggleBasket} onSelect={onSelect} />
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

interface ConnectedGroupHeaderProps {
  category: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  missingCount: number;
  onAddAll: () => void;
}

export function ConnectedGroupHeader({ category, count, collapsed, onToggle, missingCount, onAddAll }: ConnectedGroupHeaderProps) {
  return (
    <Box
      sx={theme => ({
        position: "sticky",
        top: 0,
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
        padding: "8px 18px",
        backgroundColor: theme.palette.grey[50],
        borderBottom: `1px solid ${theme.palette.grey[200]}`,
        fontSize: ".75rem",
      })}
    >
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1, border: 0, padding: 0, background: "none", cursor: "pointer", font: "inherit", color: "inherit", textAlign: "left" }}
      >
        <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronDown} style={{ fontSize: 9, width: 10 }} aria-hidden />
        <CategoryDot category={category} />
        <Typography component="span" sx={theme => ({ fontSize: "inherit", fontWeight: 700, color: theme.palette.grey[800] })}>
          {category}
        </Typography>
        <Typography component="span" sx={theme => ({ fontFamily: MONO_FONT, fontSize: ".6875rem", color: theme.palette.grey[500] })}>
          {count}
        </Typography>
      </Box>
      <Box
        component="button"
        type="button"
        onClick={onAddAll}
        disabled={missingCount === 0}
        aria-label={`Add all ${category} connections to basket`}
        sx={theme => ({
          border: 0,
          padding: 0,
          background: "none",
          cursor: "pointer",
          font: "inherit",
          fontSize: ".75rem",
          whiteSpace: "nowrap",
          color: theme.palette.primary.main,
          "&:hover": { textDecoration: "underline" },
          "&:disabled": { opacity: 0.45, cursor: "default", textDecoration: "none" },
        })}
      >
        {missingCount === 0 ? "All in basket" : "+ Add all"}
      </Box>
    </Box>
  );
}

export default NodeDetailsPanel;
