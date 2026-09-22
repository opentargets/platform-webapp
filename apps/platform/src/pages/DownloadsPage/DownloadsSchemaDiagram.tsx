/**
 * Component: DownloadsSchemaDiagram
 * A standalone, full-page entity-relationship view of the downloads schema:
 * every dataset as a database table (its fields and their types), connected
 * by the specific fields that reference each other - unlike the "Network"
 * pane on the main Downloads page, which trades field-level detail for a
 * degree-sized overview (see graph/components/GraphVisualization.tsx).
 * Reached from that pane's toolbar (see GraphControls's "Schema diagram"
 * button) and rendered by DownloadsPage in place of the card/network split
 * when the URL matches /downloads/schema-diagram.
 */

import { useCallback, useMemo, useState } from 'react';
import { Box, Typography, Link, TextField, InputAdornment } from 'ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { ErdCanvas, GraphControls, useErdData } from './graph';
import GraphEdgeTooltip, { EdgeTooltipInfo } from './graph/components/GraphEdgeTooltip';
import { GraphController, GraphPointerPosition } from './graph/types';

function DownloadsSchemaDiagram() {
  const { nodes, edges } = useErdData();

  const [query, setQuery] = useState('');
  const [controller, setController] = useState<GraphController | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{ id: string; position: GraphPointerPosition } | null>(null);
  const [pinnedEdge, setPinnedEdge] = useState<{ id: string; position: GraphPointerPosition } | null>(null);

  const matchedIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(nodes.filter(n => n.data.label.toLowerCase().includes(q)).map(n => n.data.id));
  }, [nodes, query]);

  // One legend swatch per category actually present, in the order first seen
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    nodes.forEach(n => {
      if (!seen.has(n.data.category)) seen.set(n.data.category, n.data.color);
    });
    return Array.from(seen.entries());
  }, [nodes]);

  const describeEdge = useCallback(
    (edgeId: string): EdgeTooltipInfo | null => {
      const edge = edges.find(e => e.data.id === edgeId);
      if (!edge) return null;
      const labelOf = (id: string) => nodes.find(n => n.data.id === id)?.data.label ?? id;
      return {
        id: edgeId,
        sourceLabel: labelOf(edge.data.source),
        targetLabel: labelOf(edge.data.target),
        references: [{ sourceField: edge.data.sourceFieldPath, targetField: edge.data.targetField }],
      };
    },
    [edges, nodes]
  );

  const handleEdgeHover = useCallback((edgeId: string | null, position?: GraphPointerPosition) => {
    setHoveredEdge(edgeId && position ? { id: edgeId, position } : null);
  }, []);

  const handleEdgeSelect = useCallback((edgeId: string, position?: GraphPointerPosition) => {
    if (position) setPinnedEdge({ id: edgeId, position });
    setHoveredEdge(null);
  }, []);

  const handleDeselect = useCallback(() => setPinnedEdge(null), []);

  const hoveredEdgeInfo = hoveredEdge && hoveredEdge.id !== pinnedEdge?.id ? describeEdge(hoveredEdge.id) : null;
  const pinnedEdgeInfo = pinnedEdge ? describeEdge(pinnedEdge.id) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: 'calc(100vh - 220px)', minHeight: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Link to="/downloads">
            <FontAwesomeIcon icon={faArrowLeft} size="sm" style={{ marginRight: 6 }} />
            Back to downloads
          </Link>
          <Typography variant="h5" component="h1" sx={{ mt: 1 }}>
            Schema diagram
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Every downloadable dataset as a database table, connected by its foreign-key fields.
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Find a table..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FontAwesomeIcon icon={faSearch} size="sm" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 240 }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {categories.map(([category, color]) => (
          <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">
              {category}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <ErdCanvas
          nodes={nodes}
          edges={edges}
          matchedIds={matchedIds}
          onNodeDeselect={handleDeselect}
          onEdgeSelect={handleEdgeSelect}
          onEdgeHover={handleEdgeHover}
          onGraphReady={setController}
          sx={{ height: '100%' }}
        />

        <Box sx={{ position: 'absolute', top: 24, right: 24, zIndex: 2 }}>
          <GraphControls
            controller={controller}
            showDiagramLink={false}
            sx={{ backgroundColor: 'background.paper', boxShadow: 2 }}
          />
        </Box>

        {hoveredEdgeInfo && hoveredEdge && <GraphEdgeTooltip edge={hoveredEdgeInfo} position={hoveredEdge.position} />}
        {pinnedEdgeInfo && pinnedEdge && (
          <GraphEdgeTooltip
            edge={pinnedEdgeInfo}
            position={pinnedEdge.position}
            pinned
            onClose={() => setPinnedEdge(null)}
          />
        )}
      </Box>
    </Box>
  );
}

export default DownloadsSchemaDiagram;
