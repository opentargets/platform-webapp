import {
  faArrowTrendUp,
  faChevronDown,
  faChevronRight,
  faCircleInfo,
  faFile,
  faFolder,
  faFolderOpen,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import type { GseaResult } from "../api/gseaApi";

interface ResultsTreeViewProps {
  results: GseaResult[];
}

interface TreeViewSettings {
  showPValues: boolean;
  showFDR: boolean;
  showNES: boolean;
  showES: boolean;
  showGenes: boolean;
  showGeneCount: boolean;
  sortBy: "Pathway" | "p-value" | "FDR" | "NES" | "ES";
  sortDirection: "asc" | "desc";
  groupBy: "hierarchy" | "significance" | "none";
}

interface TreeNode {
  id: string;
  result: GseaResult;
  children: TreeNode[];
  level: number;
}

const DEFAULT_SETTINGS: TreeViewSettings = {
  showPValues: true,
  showFDR: true,
  showNES: true,
  showES: false,
  showGenes: false,
  showGeneCount: true,
  sortBy: "FDR",
  sortDirection: "asc",
  groupBy: "hierarchy",
};

/** Helper to get gene list from comma-separated string */
function getGeneList(result: GseaResult): string[] {
  const genes = result["Leading edge genes"];
  if (!genes || genes === "") return [];
  return genes
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/** Helper to get sortable value from result */
function getSortValue(result: GseaResult, sortBy: string): string | number {
  switch (sortBy) {
    case "Pathway":
      return result.Pathway || "";
    case "p-value":
      return result["p-value"] ?? 1;
    case "FDR":
      return result.FDR ?? 1;
    case "NES":
      return result.NES ?? 0;
    case "ES":
      return result.ES ?? 0;
    default:
      return 0;
  }
}

/**
 * Build a tree structure from results based on "Parent pathway" relationships.
 */
function buildHierarchy(results: GseaResult[], settings: TreeViewSettings): TreeNode[] {
  // Create a map of ID -> result for quick lookup
  const resultMap = new Map<string, GseaResult>();
  results.forEach((r) => {
    const id = r.ID || r.Pathway;
    resultMap.set(id, r);
  });

  // Create a map of parent -> children
  const childrenMap = new Map<string, string[]>();
  const rootIds: string[] = [];

  results.forEach((r) => {
    const id = r.ID || r.Pathway;
    const parentPathway = r["Parent pathway"];

    if (parentPathway && parentPathway !== "" && resultMap.has(parentPathway)) {
      // Has a parent that exists in our results
      if (!childrenMap.has(parentPathway)) {
        childrenMap.set(parentPathway, []);
      }
      childrenMap.get(parentPathway)!.push(id);
    } else {
      // Root node (no parent or parent not in results)
      rootIds.push(id);
    }
  });

  // Sort function for nodes
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      const aValue = getSortValue(a.result, settings.sortBy);
      const bValue = getSortValue(b.result, settings.sortBy);

      if (typeof aValue === "string" && typeof bValue === "string") {
        return settings.sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return settings.sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  };

  // Recursive function to build tree
  const buildChildren = (parentId: string, level: number): TreeNode[] => {
    const childIds = childrenMap.get(parentId) || [];
    const children = childIds
      .map((childId) => {
        const result = resultMap.get(childId);
        if (!result) return null;
        return {
          id: childId,
          result,
          children: buildChildren(childId, level + 1),
          level,
        };
      })
      .filter(Boolean) as TreeNode[];

    return sortNodes(children);
  };

  // Build root nodes
  const rootNodes = rootIds
    .map((id) => {
      const result = resultMap.get(id);
      if (!result) return null;
      return {
        id,
        result,
        children: buildChildren(id, 1),
        level: 0,
      };
    })
    .filter(Boolean) as TreeNode[];

  return sortNodes(rootNodes);
}

/**
 * Group results by significance level (flat grouping).
 */
function groupBySignificance(
  results: GseaResult[],
  settings: TreeViewSettings
): {
  id: string;
  label: string;
  results: GseaResult[];
  color: "success" | "warning" | "default";
}[] {
  const sortedResults = [...results].sort((a, b) => {
    const aValue = getSortValue(a, settings.sortBy);
    const bValue = getSortValue(b, settings.sortBy);

    if (typeof aValue === "string" && typeof bValue === "string") {
      return settings.sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return settings.sortDirection === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const highlySignificant: GseaResult[] = [];
  const significant: GseaResult[] = [];
  const notSignificant: GseaResult[] = [];

  sortedResults.forEach((result) => {
    if (result.FDR < 0.01) {
      highlySignificant.push(result);
    } else if (result.FDR < 0.05) {
      significant.push(result);
    } else {
      notSignificant.push(result);
    }
  });

  const groups: {
    id: string;
    label: string;
    results: GseaResult[];
    color: "success" | "warning" | "default";
  }[] = [];

  if (highlySignificant.length > 0) {
    groups.push({
      id: "highly-significant",
      label: `Highly Significant (FDR < 0.01)`,
      results: highlySignificant,
      color: "success",
    });
  }

  if (significant.length > 0) {
    groups.push({
      id: "significant",
      label: `Significant (FDR < 0.05)`,
      results: significant,
      color: "warning",
    });
  }

  if (notSignificant.length > 0) {
    groups.push({
      id: "not-significant",
      label: `Not Significant (FDR >= 0.05)`,
      results: notSignificant,
      color: "default",
    });
  }

  return groups;
}

interface TreeNodeComponentProps {
  node: TreeNode;
  settings: TreeViewSettings;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onNodeClick: (result: GseaResult) => void;
}

function TreeNodeComponent({
  node,
  settings,
  expandedNodes,
  onToggle,
  onNodeClick,
}: TreeNodeComponentProps) {
  const { result, children, level } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSignificant = result.FDR < 0.05;
  const geneList = getGeneList(result);

  return (
    <Box>
      <ListItem
        sx={{
          pl: level * 3 + 2,
          backgroundColor: isSignificant ? "rgba(76, 175, 80, 0.08)" : "transparent",
          borderLeft: isSignificant ? "3px solid #4caf50" : "3px solid transparent",
          "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
        }}
      >
        <ListItemButton sx={{ borderRadius: 1 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {hasChildren ? (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
              >
                <FontAwesomeIcon
                  icon={isExpanded ? faChevronDown : faChevronRight}
                  style={{ fontSize: "0.8rem" }}
                />
              </IconButton>
            ) : (
              <FontAwesomeIcon
                icon={faFile}
                style={{ color: isSignificant ? "#4caf50" : "#bdbdbd", marginLeft: 8 }}
              />
            )}
          </ListItemIcon>
          {hasChildren && (
            <ListItemIcon sx={{ minWidth: 28 }}>
              <FontAwesomeIcon
                icon={isExpanded ? faFolderOpen : faFolder}
                style={{ color: isSignificant ? "#4caf50" : "#9e9e9e" }}
              />
            </ListItemIcon>
          )}
          <ListItemText
            onClick={() => onNodeClick(result)}
            primary={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isSignificant ? 600 : 400,
                    color: isSignificant ? "primary.main" : "text.primary",
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {result.Pathway}
                </Typography>
                {hasChildren && (
                  <Chip
                    label={`${children.length} children`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.65rem", height: 20 }}
                  />
                )}
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {settings.showNES && (
                    <Tooltip title="Normalised Enrichment Score · highlighted when |NES| > 1.5">
                      <Chip
                        label={`NES: ${result.NES?.toFixed(2)}`}
                        size="small"
                        color={Math.abs(result.NES) > 1.5 ? "success" : "default"}
                        variant={Math.abs(result.NES) > 1.5 ? "filled" : "outlined"}
                      />
                    </Tooltip>
                  )}
                  {settings.showES && (
                    <Chip label={`ES: ${result.ES?.toFixed(2)}`} size="small" variant="outlined" />
                  )}
                  {settings.showPValues && (
                    <Tooltip title="P-value · highlighted when p-value < 0.05">
                      <Chip
                        label={`P: ${result["p-value"]?.toExponential(1)}`}
                        size="small"
                        color={result["p-value"] < 0.05 ? "success" : "default"}
                        variant={result["p-value"] < 0.05 ? "filled" : "outlined"}
                      />
                    </Tooltip>
                  )}
                  {settings.showFDR && (
                    <Tooltip title="False Discovery Rate · highlighted when FDR < 0.05">
                      <Chip
                        label={`FDR: ${result.FDR?.toExponential(1)}`}
                        size="small"
                        color={result.FDR < 0.05 ? "success" : "default"}
                        variant={result.FDR < 0.05 ? "filled" : "outlined"}
                      />
                    </Tooltip>
                  )}
                  {settings.showGeneCount && (
                    <Tooltip title="Overlapping genes / Pathway size">
                      <Chip
                        label={`${result["Number of input genes"]}/${result["Pathway size"]} genes`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Tooltip>
                  )}
                </Box>
              </Box>
            }
            secondary={
              settings.showGenes &&
              geneList.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Leading edge genes:
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                    {geneList.slice(0, 8).map((gene, idx) => (
                      <Chip
                        key={idx}
                        label={gene}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.65rem" }}
                      />
                    ))}
                    {geneList.length > 8 && (
                      <Chip
                        label={`+${geneList.length - 8} more`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.65rem" }}
                      />
                    )}
                  </Box>
                </Box>
              )
            }
          />
        </ListItemButton>
      </ListItem>

      {hasChildren && isExpanded && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {children.map((childNode) => (
              <TreeNodeComponent
                key={childNode.id}
                node={childNode}
                settings={settings}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onNodeClick={onNodeClick}
              />
            ))}
          </List>
        </Collapse>
      )}
    </Box>
  );
}

interface ResultNodeProps {
  result: GseaResult;
  settings: TreeViewSettings;
  onNodeClick: (result: GseaResult) => void;
  level: number;
}

function ResultNode({ result, settings, onNodeClick, level }: ResultNodeProps) {
  const isSignificant = result.FDR < 0.05;
  const geneList = getGeneList(result);

  return (
    <ListItem
      sx={{
        pl: level * 3 + 2,
        backgroundColor: isSignificant ? "rgba(76, 175, 80, 0.08)" : "transparent",
        borderLeft: isSignificant ? "3px solid #4caf50" : "3px solid transparent",
        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
      }}
    >
      <ListItemButton onClick={() => onNodeClick(result)} sx={{ borderRadius: 1 }}>
        <ListItemIcon sx={{ minWidth: 36 }}>
          <FontAwesomeIcon
            icon={faFile}
            style={{ color: isSignificant ? "#4caf50" : "#bdbdbd" }}
          />
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isSignificant ? 600 : 400,
                  color: isSignificant ? "primary.main" : "text.primary",
                }}
              >
                {result.Pathway}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {settings.showNES && (
                  <Tooltip title="Normalised Enrichment Score · highlighted when |NES| > 1.5">
                    <Chip
                      label={`NES: ${result.NES?.toFixed(2)}`}
                      size="small"
                      color={Math.abs(result.NES) > 1.5 ? "success" : "default"}
                      variant={Math.abs(result.NES) > 1.5 ? "filled" : "outlined"}
                    />
                  </Tooltip>
                )}
                {settings.showES && (
                  <Chip label={`ES: ${result.ES?.toFixed(2)}`} size="small" variant="outlined" />
                )}
                {settings.showPValues && (
                  <Tooltip title="P-value · highlighted when p-value < 0.05">
                    <Chip
                      label={`P: ${result["p-value"]?.toExponential(1)}`}
                      size="small"
                      color={result["p-value"] < 0.05 ? "success" : "default"}
                      variant={result["p-value"] < 0.05 ? "filled" : "outlined"}
                    />
                  </Tooltip>
                )}
                {settings.showFDR && (
                  <Tooltip title="False Discovery Rate · highlighted when FDR < 0.05">
                    <Chip
                      label={`FDR: ${result.FDR?.toExponential(1)}`}
                      size="small"
                      color={result.FDR < 0.05 ? "success" : "default"}
                      variant={result.FDR < 0.05 ? "filled" : "outlined"}
                    />
                  </Tooltip>
                )}
                {settings.showGeneCount && (
                  <Tooltip title="Overlapping genes / Pathway size">
                    <Chip
                      label={`${result["Number of input genes"]}/${result["Pathway size"]} genes`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Tooltip>
                )}
              </Box>
            </Box>
          }
          secondary={
            settings.showGenes &&
            geneList.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Leading edge genes:
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                  {geneList.slice(0, 8).map((gene, idx) => (
                    <Chip
                      key={idx}
                      label={gene}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.65rem" }}
                    />
                  ))}
                  {geneList.length > 8 && (
                    <Chip
                      label={`+${geneList.length - 8} more`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.65rem" }}
                    />
                  )}
                </Box>
              </Box>
            )
          }
        />
      </ListItemButton>
    </ListItem>
  );
}

function ResultsTreeView({ results }: ResultsTreeViewProps) {
  const [settings, setSettings] = useState<TreeViewSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<GseaResult | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>();
    initialExpanded.add("highly-significant");
    initialExpanded.add("significant");
    return initialExpanded;
  });

  // Check if results have hierarchy data
  const hasHierarchyData = useMemo(() => {
    return results.some((r) => r["Parent pathway"] && r["Parent pathway"] !== "");
  }, [results]);

  // Build hierarchy tree
  const hierarchyTree = useMemo(() => {
    if (settings.groupBy !== "hierarchy") return [];
    return buildHierarchy(results, settings);
  }, [results, settings]);

  // Group by significance
  const significanceGroups = useMemo(() => {
    if (settings.groupBy !== "significance") return [];
    return groupBySignificance(results, settings);
  }, [results, settings]);

  // Flat sorted results for "none" grouping
  const flatResults = useMemo(() => {
    if (settings.groupBy !== "none") return [];
    return [...results].sort((a, b) => {
      const aValue = getSortValue(a, settings.sortBy);
      const bValue = getSortValue(b, settings.sortBy);

      if (typeof aValue === "string" && typeof bValue === "string") {
        return settings.sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return settings.sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [results, settings]);

  const handleSettingsChange = useCallback((key: keyof TreeViewSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleNodeClick = useCallback((result: GseaResult) => {
    setSelectedResult(result);
    setDetailsOpen(true);
  }, []);

  const handleToggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const significantCount = results.filter((r) => r.FDR < 0.05).length;
  const rootCount = hierarchyTree.length;

  if (results.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="text.secondary">No results to display in tree view.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              "&:hover": { opacity: 0.7 },
            }}
            onClick={() => setSettingsOpen(true)}
          >
            <FontAwesomeIcon icon={faGear} />
            <Typography variant="body2" fontWeight={500}>
              View settings
            </Typography>
          </Box>
          <Chip label={`${results.length} total`} size="small" variant="outlined" />
          <Chip
            label={`${significantCount} significant`}
            color="success"
            size="small"
            variant="outlined"
          />
          <Chip label={`Sorted by ${settings.sortBy} (${settings.sortDirection})`} size="small" variant="outlined" />
          {settings.groupBy === "hierarchy" && (
            <Chip label={`${rootCount} top-level pathways`} size="small" variant="outlined" />
          )}
          {!hasHierarchyData && settings.groupBy === "hierarchy" && (
            <Chip label="No hierarchy data" color="warning" size="small" variant="outlined" />
          )}
        </Box>
      </Box>

      {/* Legend */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 3,
          px: 2,
          py: 1,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 3, height: 14, backgroundColor: "#4caf50", borderRadius: 0.5 }} />
            <Typography variant="caption" color="text.disabled">
              Significant (FDR {"<"} 0.05)
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FontAwesomeIcon
              icon={faFolder}
              style={{ fontSize: "0.7rem", color: "#9e9e9e" }}
            />
            <Typography variant="caption" color="text.disabled">
              Parent pathway
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FontAwesomeIcon
              icon={faFile}
              style={{ fontSize: "0.7rem", color: "#9e9e9e" }}
            />
            <Typography variant="caption" color="text.disabled">
              Terminal pathway
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tree content */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <List>
          {/* Hierarchy view */}
          {settings.groupBy === "hierarchy" &&
            hierarchyTree.map((node) => (
              <TreeNodeComponent
                key={node.id}
                node={node}
                settings={settings}
                expandedNodes={expandedNodes}
                onToggle={handleToggleNode}
                onNodeClick={handleNodeClick}
              />
            ))}

          {/* Significance grouping view */}
          {settings.groupBy === "significance" &&
            significanceGroups.map((group) => (
              <Box key={group.id}>
                <ListItem
                  sx={{
                    backgroundColor: "grey.100",
                    "&:hover": { backgroundColor: "grey.200" },
                  }}
                >
                  <ListItemButton onClick={() => handleToggleNode(group.id)}>
                    <ListItemIcon>
                      <FontAwesomeIcon
                        icon={expandedNodes.has(group.id) ? faChevronDown : faChevronRight}
                      />
                    </ListItemIcon>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <FontAwesomeIcon
                        icon={expandedNodes.has(group.id) ? faFolderOpen : faFolder}
                        style={{
                          color:
                            group.color === "success"
                              ? "#4caf50"
                              : group.color === "warning"
                                ? "#ff9800"
                                : "#bdbdbd",
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="subtitle2">{group.label}</Typography>
                          <Chip label={group.results.length} size="small" color={group.color} />
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                <Collapse in={expandedNodes.has(group.id)} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {group.results.map((result, idx) => (
                      <ResultNode
                        key={`${result.ID || result.Pathway}-${idx}`}
                        result={result}
                        settings={settings}
                        onNodeClick={handleNodeClick}
                        level={1}
                      />
                    ))}
                  </List>
                </Collapse>
                <Divider />
              </Box>
            ))}

          {/* Flat view (no grouping) */}
          {settings.groupBy === "none" &&
            flatResults.map((result, idx) => (
              <ResultNode
                key={`${result.ID || result.Pathway}-${idx}`}
                result={result}
                settings={settings}
                onNodeClick={handleNodeClick}
                level={0}
              />
            ))}
        </List>
      </Box>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tree View Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Group By</InputLabel>
              <Select
                value={settings.groupBy}
                onChange={(e) => handleSettingsChange("groupBy", e.target.value)}
                label="Group By"
              >
                <MenuItem value="hierarchy">Pathway Hierarchy</MenuItem>
                <MenuItem value="significance">Significance Level</MenuItem>
                <MenuItem value="none">No Grouping</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={settings.sortBy}
                onChange={(e) => handleSettingsChange("sortBy", e.target.value)}
                label="Sort By"
              >
                <MenuItem value="Pathway">Pathway Name</MenuItem>
                <MenuItem value="p-value">P-Value</MenuItem>
                <MenuItem value="FDR">FDR</MenuItem>
                <MenuItem value="NES">NES</MenuItem>
                <MenuItem value="ES">ES</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Sort Direction</InputLabel>
              <Select
                value={settings.sortDirection}
                onChange={(e) => handleSettingsChange("sortDirection", e.target.value)}
                label="Sort Direction"
              >
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </Select>
            </FormControl>

            <Divider />
            <Typography variant="subtitle2">Display Options</Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showNES}
                  onChange={(e) => handleSettingsChange("showNES", e.target.checked)}
                />
              }
              label="Show NES"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showES}
                  onChange={(e) => handleSettingsChange("showES", e.target.checked)}
                />
              }
              label="Show ES"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showPValues}
                  onChange={(e) => handleSettingsChange("showPValues", e.target.checked)}
                />
              }
              label="Show P-Values"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showFDR}
                  onChange={(e) => handleSettingsChange("showFDR", e.target.checked)}
                />
              }
              label="Show FDR"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showGeneCount}
                  onChange={(e) => handleSettingsChange("showGeneCount", e.target.checked)}
                />
              }
              label="Show Gene Count"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showGenes}
                  onChange={(e) => handleSettingsChange("showGenes", e.target.checked)}
                />
              }
              label="Show Gene Lists"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FontAwesomeIcon icon={faCircleInfo} />
            Result Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedResult.Link ? (
                  <Link href={selectedResult.Link} target="_blank" rel="noopener noreferrer">
                    {selectedResult.Pathway}
                  </Link>
                ) : (
                  selectedResult.Pathway
                )}
              </Typography>

              {selectedResult.ID && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  ID: {selectedResult.ID}
                </Typography>
              )}

              {selectedResult["Parent pathway"] && selectedResult["Parent pathway"] !== "" && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Parent: {selectedResult["Parent pathway"]}
                </Typography>
              )}

              <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", mt: 2 }}>
                <Chip
                  label={`NES: ${selectedResult.NES?.toFixed(3)}`}
                  color={Math.abs(selectedResult.NES) > 1.5 ? "success" : "default"}
                />
                <Chip
                  label={`ES: ${selectedResult.ES?.toFixed(3)}`}
                  color={Math.abs(selectedResult.ES) > 0.3 ? "success" : "default"}
                />
                <Chip
                  label={`P-value: ${selectedResult["p-value"]?.toExponential(2)}`}
                  color={selectedResult["p-value"] < 0.05 ? "success" : "default"}
                />
                <Chip
                  label={`FDR: ${selectedResult.FDR?.toExponential(2)}`}
                  color={selectedResult.FDR < 0.05 ? "success" : "default"}
                />
                <Chip label={`Pathway size: ${selectedResult["Pathway size"]}`} color="primary" />
                <Chip
                  label={`Overlap genes: ${selectedResult["Number of input genes"]}`}
                  color="secondary"
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Leading Edge Genes ({getGeneList(selectedResult).length}):
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {getGeneList(selectedResult).map((gene, idx) => (
                    <Chip key={idx} label={gene} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ResultsTreeView;
