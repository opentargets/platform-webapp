import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Box } from "ui";
import { DownloadsContext } from "../../context/DownloadsContext";
import { selectNode, setNetworkScope } from "../../context/downloadsActions";
import { NetworkScope } from "../../types/downloadTypes";
import { selectRowsById } from "../../context/downloadsSelectors";
import { GraphVisualization, useGraphData } from "../../graph";
import type { GraphController } from "../../graph/types";
import useBasket from "../useBasket";
import { RADIUS } from "../tokens";
import CanvasHeader from "./CanvasHeader";
import CategoryLegend from "./CategoryLegend";
import NodeDetailsPanel, { PanelNode } from "./NodeDetailsPanel";

/**
 * The Network view: the schema graph of every dataset, with a basket scope,
 * a selectable node whose details and connections dock on the right, and a
 * category legend. Filters from the Cards view don't apply here.
 */
function NetworkView() {
  const { state, dispatch } = useContext(DownloadsContext);
  const { basket, inBasket, toggle, add } = useBasket();
  const [controller, setController] = useState<GraphController | null>(null);
  const controllerRef = useRef<GraphController | null>(null);
  controllerRef.current = controller;

  const { nodes: allNodes, edges: allEdges } = useGraphData();

  // Datasets with no schema relationship to anything (degree 0) have no edges
  // to draw and would only push the radial layout outwards, so they're left
  // off the canvas - see radialLayout.ts. Nodes are labelled with the
  // dataset's display name (the FileSet name the cards show) rather than the
  // RecordSet name, which in current releases is just the id again.
  const rowsById = useMemo(() => selectRowsById(state.rows), [state.rows]);
  const nodes = useMemo(
    () =>
      allNodes
        .filter(n => (n.data.degree ?? 0) > 0)
        .map(n => {
          const name = rowsById.get(n.data.id)?.name;
          return name && name !== n.data.label ? { ...n, data: { ...n.data, label: name } } : n;
        }),
    [allNodes, rowsById]
  );
  const edges = useMemo(() => {
    const kept = new Set(nodes.map(n => n.data.id));
    return allEdges.filter(e => kept.has(e.data.source) && kept.has(e.data.target));
  }, [allEdges, nodes]);

  const nodeById = useMemo(() => new Map<string, PanelNode>(nodes.map(n => [n.data.id, n.data as PanelNode])), [nodes]);

  const neighboursById = useMemo(() => {
    const map = new Map<string, Set<string>>();
    edges.forEach(e => {
      if (!map.has(e.data.source)) map.set(e.data.source, new Set());
      if (!map.has(e.data.target)) map.set(e.data.target, new Set());
      map.get(e.data.source)!.add(e.data.target);
      map.get(e.data.target)!.add(e.data.source);
    });
    return map;
  }, [edges]);

  const scope: NetworkScope = state.networkScope;
  const basketMode = scope === "basket";
  const basketIds = useMemo(() => (basketMode ? new Set(basket) : null), [basketMode, basket]);

  const basketEdgeCount = useMemo(
    () => (basketIds ? edges.filter(e => basketIds.has(e.data.source) && basketIds.has(e.data.target)).length : 0),
    [edges, basketIds]
  );

  const selectedId = state.selectedNodeId && nodeById.has(state.selectedNodeId) ? state.selectedNodeId : null;
  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;
  const neighbours = useMemo(() => {
    if (!selectedId) return [];
    return Array.from(neighboursById.get(selectedId) ?? [])
      .map(id => nodeById.get(id))
      .filter((n): n is PanelNode => Boolean(n))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedId, neighboursById, nodeById]);

  const categories = useMemo(() => {
    const present = new Set(nodes.map(n => n.data.type as string));
    const ordered = state.allUniqueCategories.filter(c => present.has(c));
    present.forEach(c => {
      if (!ordered.includes(c)) ordered.push(c);
    });
    return ordered;
  }, [nodes, state.allUniqueCategories]);

  const select = useCallback((id: string | null) => dispatch(selectNode(id)), [dispatch]);
  const clearSelection = useCallback(() => select(null), [select]);

  const changeScope = useCallback(
    (next: NetworkScope) => {
      dispatch(setNetworkScope(next));
    },
    [dispatch]
  );

  // Fit follows the scope: basket mode zooms to the basket's nodes, leaving
  // it fits everything again. The layout itself never changes.
  useEffect(() => {
    const c = controllerRef.current;
    if (!c) return;
    if (basketMode) c.fitTo(basket);
    else c.fit();
    // Only react to scope flips (and the basket while in basket mode), not to
    // the controller instance changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketMode, basketMode ? basket : null]);

  // Esc clears the selection unless a dialog/drawer owns the key
  useEffect(() => {
    if (!selectedId) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || state.basketOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, state.basketOpen, clearSelection]);

  const hint = selected
    ? "Esc or click the canvas to clear"
    : basketMode
      ? `${basket.length} ${basket.length === 1 ? "dataset" : "datasets"} in your basket · ${basketEdgeCount} direct ${
          basketEdgeCount === 1 ? "connection" : "connections"
        } between them`
      : "Hover a node to preview · click to select · scroll to zoom";

  return (
    <Box
      sx={theme => ({
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 220px)",
        minHeight: 480,
        border: `1px solid ${theme.palette.grey[300]}`,
        borderRadius: RADIUS,
        backgroundColor: "#fff",
        overflow: "hidden",
      })}
    >
      <CanvasHeader
        scope={scope}
        basketCount={basket.length}
        onScopeChange={changeScope}
        hint={hint}
        selectedLabel={selected?.label ?? null}
        onClearSelection={clearSelection}
        controller={controller}
      />
      <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
        <GraphVisualization
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedId}
          onNodeSelect={select}
          onNodeDeselect={clearSelection}
          basketIds={basketIds}
          inBasket={inBasket}
          onToggleBasket={toggle}
          onControllerReady={setController}
        />
        <CategoryLegend categories={categories} basketMode={basketMode} />
        {selected && (
          <NodeDetailsPanel
            node={selected}
            neighbours={neighbours}
            inBasket={inBasket}
            onToggleBasket={toggle}
            onAddAll={add}
            onSelect={select}
            onClose={clearSelection}
          />
        )}
      </Box>
    </Box>
  );
}

export default NetworkView;
