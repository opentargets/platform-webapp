# Graph Visualization Plan: Downloads Page Data Schema

## Overview
Implement an interactive force-directed graph visualization of the Open Targets downloads data schema using Cytoscape. The visualization shows datasets as nodes and foreign key relationships as edges, automatically organizing into a hub-and-spoke topology centered on Core Entities (Target, Disease, Drug, etc.).

---

## Architecture

### File Structure
```
apps/platform/src/pages/DownloadsPage/
├── graph/
│   ├── components/
│   │   ├── GraphVisualization.jsx      (Main container, <250 lines)
│   │   ├── GraphCanvas.jsx              (Cytoscape wrapper, <250 lines)
│   │   ├── GraphLegend.jsx              (Node type legend, <250 lines)
│   │   ├── GraphControls.jsx            (Zoom/reset/export, <250 lines)
│   │   └── GraphTooltip.jsx             (Node details popup, <250 lines)
│   ├── hooks/
│   │   ├── useGraphData.js              (Transform downloads → nodes/edges, <250 lines)
│   │   ├── useCytoscapeInstance.js      (Lifecycle management, <250 lines)
│   │   ├── useGraphInteractions.js      (Click/hover handlers, <250 lines)
│   │   └── useGraphLayout.js            (Force layout algorithm, <250 lines)
│   └── utils/
│       ├── dataTransformer.js           (Schema → graph data, <250 lines)
│       ├── layoutConfig.js              (Cytoscape layout options, <250 lines)
│       ├── styleConfig.js               (Node/edge CSS, <250 lines)
│       ├── nodeClassifier.js            (Categorize nodes by type, <250 lines)
│       └── mockSchema.js                (Sample schema for testing, <250 lines)
```

---

## Component Design

### 1. **GraphVisualization.jsx** (Top-level Container)
**Responsibility**: Orchestrate graph state and layout  
**Props**: `downloadsData` (from parent), optional `defaultView`  
**State**: `selectedNode`, `highlightedEdges`, `viewMode`  
**Exports**: Main component  

**Pseudocode**:
```javascript
- Receive downloads data from parent
- Extract schema metadata (if available) or use mock schema
- Pass to useGraphData hook to get nodes/edges
- Render layout:
  * GraphCanvas (main Cytoscape instance)
  * GraphControls (sidebar buttons)
  * GraphLegend (color key)
  * GraphTooltip (on hover)
- Handle state changes (selectedNode updates)
```

### 2. **GraphCanvas.jsx** (Cytoscape Container)
**Responsibility**: Mount Cytoscape, apply layout, sync state  
**Props**: `nodes`, `edges`, `selectedNode`, `onNodeSelect`  
**Refs**: `cy` (Cytoscape instance)  

**Pseudocode**:
```javascript
- useRef for DOM container
- useCytoscapeInstance hook to init Cytoscape with nodes/edges
- Apply layout from useGraphLayout
- Bind interaction handlers
- Update highlighting on selectedNode changes
- Handle resize events
```

### 3. **GraphLegend.jsx** (Node Type Key)
**Responsibility**: Show node categories with colors and descriptions  
**Props**: `nodeTypes` (config)  
**Styling**: MUI Card with color swatches  

**Legend Items**:
- Core Entities (Large, Blue) - Target, Disease, Drug, Variant, Study
- Evidence Datasets (Medium, Orange) - CRISPR, ClinVar, Literature, etc.
- Attributes/Ontologies (Small, Green) - HPO, Sequence Ontology, etc.

### 4. **GraphControls.jsx** (Toolbar)
**Responsibility**: User actions (zoom, pan, reset, export)  
**Props**: `cyInstance`, `onExport`  

**Actions**:
- Zoom In/Out buttons
- Reset View (center + fit)
- Layout Reset (restart force simulation)
- Export as Image/JSON
- Toggle Physics (pause/resume simulation)

### 5. **GraphTooltip.jsx** (Hover/Detail View)
**Responsibility**: Display node/edge details on interaction  
**Props**: `selectedNode`, `position`, `onClose`  

**Content**:
- Node name, type, connection count
- Sample columns/fields (if available)
- Link to corresponding schema file

---

## Hook Design

### 1. **useGraphData.js** (Data Transformation)
**Returns**: `{ nodes, edges, loading, error }`  
**Dependencies**: `downloadsData`  

**Logic**:
```javascript
- Call dataTransformer(downloadsData) to generate nodes/edges
- Classify each node (core/evidence/attribute) using nodeClassifier
- Assign sizes/colors based on classification
- Return standardized Cytoscape format
```

### 2. **useCytoscapeInstance.js** (Lifecycle)
**Returns**: `{ cy, containerRef }`  
**Dependencies**: `nodes`, `edges`, `layoutConfig`  

**Logic**:
```javascript
- Create container ref
- On mount: Initialize Cytoscape with:
  * nodes/edges
  * style from styleConfig
  * layout from layoutConfig
- On update: Batch-update Cytoscape with new data
- On unmount: Destroy instance
- Handle errors gracefully
```

### 3. **useGraphInteractions.js** (Events)
**Returns**: Event handler functions  
**Dependencies**: `cy`, `onNodeSelect`, callbacks  

**Handlers**:
- `onNodeTap`: Select node, highlight connected edges
- `onNodeHover`: Show tooltip
- `onEdgeTap`: Highlight relationship, show details
- `onCanvasTap`: Clear selection
- `onDrag`: Disable pan if dragging node (Cytoscape handles physics)

### 4. **useGraphLayout.js** (Layout Algorithm)
**Returns**: `layoutConfig` object  
**Dependencies**: `nodeCount`, `edgeCount`, `layoutMode`  

**Logic**:
```javascript
- Default: Force-directed (cose-bilkent or cola.js)
- Tune parameters based on data size
- Return Cytoscape layout config with:
  * name: 'cose-bilkent' or 'cola'
  * directed: false
  * animate: true
  * avoidOverlap: true
  * edgeLength: scale based on node degree
```

---

## Utility Design

### 1. **dataTransformer.js** (Schema → Graph)
**Exports**: `transformDownloadsToGraph(data) → { nodes, edges }`  

**Logic**:
```javascript
Parse downloads metadata to extract:
- Dataset names (nodes)
- Foreign key references (edges)
- Return Cytoscape format:
  {
    nodes: [
      { data: { id, label, type, size, degree }, classes },
      ...
    ],
    edges: [
      { data: { id, source, target, type }, classes },
      ...
    ]
  }
```

### 2. **layoutConfig.js** (Cytoscape Layout Options)
**Exports**: `getLayoutConfig(layoutMode, dataSize) → config`  

**Defaults**:
```javascript
{
  name: 'cose-bilkent',
  directed: false,
  animate: true,
  animationDuration: 500,
  avoidOverlap: true,
  nodeSpacing: 10,
  edgeElasticity: data => data.degree * 0.5,
  numIter: 1000,
  tile: true
}
```

### 3. **styleConfig.js** (Cytoscape Styling)
**Exports**: `getStylesheet() → stylesheet`  

**Style Rules**:
```javascript
Core Entities:
  - width/height: 80px
  - backgroundColor: #2196F3 (blue)
  - fontSize: 14px
  
Evidence Datasets:
  - width/height: 60px
  - backgroundColor: #FF9800 (orange)
  - fontSize: 12px
  
Attributes:
  - width/height: 40px
  - backgroundColor: #4CAF50 (green)
  - fontSize: 11px

Edges:
  - lineColor: #999
  - targetArrowColor: #999
  - width: 2px
  
Highlighted (selected):
  - backgroundColor: #FFD700
  - lineWidth: 3
```

### 4. **nodeClassifier.js** (Categorize Nodes)
**Exports**: `classifyNode(nodeName, degree) → { type, size, color }`  

**Rules**:
```javascript
Core Entities = ['Target', 'Disease', 'Drug', 'Variant', 'Study']
  → type: 'core', size: 80, color: '#2196F3'

Evidence = nodes with degree > 2 or name contains ['evidence', 'crispr', 'clinvar']
  → type: 'evidence', size: 60, color: '#FF9800'

Attributes = everything else
  → type: 'attribute', size: 40, color: '#4CAF50'
```

### 5. **mockSchema.js** (Test Data)
**Exports**: `getMockGraphData() → { nodes, edges }`  

**Sample**:
```javascript
const mockData = {
  nodes: [
    { id: 'target', label: 'Target', type: 'core' },
    { id: 'disease', label: 'Disease', type: 'core' },
    { id: 'crispr', label: 'CRISPR Evidence', type: 'evidence' },
    // ... 50+ more
  ],
  edges: [
    { source: 'crispr', target: 'target' },
    { source: 'crispr', target: 'disease' },
    // ... many more
  ]
}
```

---

## Integration Steps

### Phase 1: Setup
1. Install Cytoscape: `npm install cytoscape cytoscape-cose-bilkent`
2. Create `/graph` folder structure
3. Add mock schema test data

### Phase 2: Core Implementation
1. Implement utils (dataTransformer, styleConfig, layoutConfig)
2. Implement hooks (useGraphData, useCytoscapeInstance)
3. Implement GraphCanvas component
4. Test Cytoscape rendering

### Phase 3: UI & Interactivity
1. Implement interaction hook (useGraphInteractions)
2. Add GraphLegend, GraphControls, GraphTooltip
3. Implement GraphVisualization container
4. Add to DownloadsPage as optional view

### Phase 4: Polish
1. Performance optimization (memoization, lazy rendering)
2. Responsive sizing
3. Export/sharing features
4. Unit tests

---

## Integration with DownloadsPage

### Option 1: New Tab
```jsx
<Tabs>
  <Tab label="Cards View" />
  <Tab label="Graph View" />
</Tabs>
{viewMode === 'graph' && <GraphVisualization downloads={downloadsData} />}
```

### Option 2: Toggle Button
```jsx
<GraphVisualization 
  downloadsData={state.downloadsData}
  enabled={showGraph}
/>
```

### Data Flow
```
DownloadsPage state
    ↓
GraphVisualization (receives downloadsData)
    ↓
useGraphData hook (transforms to nodes/edges)
    ↓
GraphCanvas (renders Cytoscape)
    ↓
useGraphInteractions (handles clicks/hovers)
```

---

## Performance Considerations

### Optimization Strategies
1. **Memoization**: Wrap GraphCanvas in `React.memo`
2. **Lazy Layout**: Use `requestAnimationFrame` for layout updates
3. **Virtual Rendering**: If 56+ nodes, consider viewport culling
4. **Debounce**: Limit interaction handlers (e.g., hover events)

### Bundle Impact
- Cytoscape: ~180 KB
- cose-bilkent layout: ~120 KB
- Total: ~300 KB (tree-shakeable)

---

## Testing Strategy

### Unit Tests
- `dataTransformer.test.js` - Verify nodes/edges generation
- `nodeClassifier.test.js` - Check categorization logic
- `layoutConfig.test.js` - Validate layout parameters

### Integration Tests
- Hook rendering with mock data
- Component mount/unmount lifecycle
- Cytoscape instance initialization

### Manual Testing
- View with mock data (mockSchema.js)
- Test interactions (click, hover, zoom)
- Verify responsive behavior

---

## Future Enhancements

1. **Advanced Filtering**: Filter nodes by type, connection count
2. **Search**: Highlight path between two datasets
3. **Analytics**: Show statistics (node degree distribution, path lengths)
4. **3D Visualization**: Option to switch to 3D layout (Babylon.js)
5. **Real-time Updates**: WebSocket updates when datasets change
6. **Export Workflows**: Save filtered views, share graphs

---

## Success Criteria

- ✅ Force-directed layout renders correctly
- ✅ Hub-and-spoke topology emerges naturally
- ✅ Smooth interactions (click, hover, zoom)
- ✅ Legend + controls visible and functional
- ✅ All files ≤ 250 lines
- ✅ No performance lag with 56 nodes
- ✅ Responsive on mobile/tablet (optional zoom-to-fit)
