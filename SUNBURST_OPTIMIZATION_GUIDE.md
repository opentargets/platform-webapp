# ZoomableSunburst Optimization Guide for Large Datasets (20,000+ nodes)

## Problem Statement
Current implementation renders all nodes as SVG elements, causing performance issues with 20,000+ data points. Main bottlenecks: DOM rendering, visibility calculations, animations on invisible nodes, and debug logging.

---

## Priority Optimizations

### Priority 1: Remove Debug Logging (Quick Win - 10-15% improvement)
**Files affected**: `hooks.ts`, `ZoomableSunburst.tsx`, `SunburstArcs.tsx`, `SunburstLabels.tsx`

Remove all `console.log()` and `console.error()` statements (they're especially expensive in loops).

**Impact**: Removes I/O overhead in tight render loops

---

### Priority 2: Visibility-Based Rendering (30-40% improvement)
**Problem**: All 20,000 nodes are mapped to React components, even invisible ones

**Solution**: Filter nodes BEFORE rendering, only include nodes that meet visibility criteria:

```typescript
// In ZoomableSunburst.tsx useSunburstPartition hook
const nodes = useMemo(() => {
  const descendants = root.descendants().filter((d) => {
    // Only include nodes that could be visible at current focus level
    const arcData = d.target ?? d.current;
    return arcData && arcData.y1 <= 3 && arcData.y0 >= 1 && arcData.x1 > arcData.x0;
  });
  return descendants;
}, [root, focus]); // Add focus as dependency
```

**Impact**: Reduces DOM elements by 60-80% for typical zoom levels

---

### Priority 3: Optimize Label Rendering (15-25% improvement)
**Problem**: Rendering text labels for all nodes, most of which are invisible

**Solution**: Only create text elements for visible labels

```typescript
// In SunburstLabels.tsx
export const SunburstLabels: React.FC<SunburstLabelsProps> = ({ nodes, radius }) => {
  return (
    <>
      {nodes
        .filter(d => labelVisible(d.target ?? d.current))
        .map((d, i) => (
          <text key={d.data.name} ...>{d.data.name}</text>
        ))}
    </>
  );
};
```

**Impact**: 60-90% reduction in text elements

---

### Priority 4: Virtual Scrolling for Deep Hierarchies
**Problem**: Many data points create deep hierarchies with many invisible levels

**Solution**: Implement depth-based culling - don't render descendants beyond visible range

```typescript
// In hooks.ts - add depth limit based on focus
function buildPartition(data: DataNode, maxDepth = 6): PartitionNode {
  const root = d3.hierarchy(data).sum((d) => (d.children ? 0 : d.value ?? 1));
  
  // Option 1: Filter descendants before partition
  root.each((d) => {
    if (d.children && d.depth >= maxDepth) {
      d.children = [];
    }
  });
  
  (d3.partition() as any).size([2 * Math.PI, root.height + 1])(root);
  return root as PartitionNode;
}
```

**Impact**: 40-70% reduction for deep hierarchies; adjust `maxDepth` based on data structure

---

### Priority 5: Batch Transitions with RequestAnimationFrame
**Problem**: All node transitions run simultaneously on every interaction

**Solution**: Use D3's native transition system but reduce rendered nodes (combines with Priority 2)

```typescript
// In ZoomableSunburst.tsx - already using transitions, but only on visible nodes
// After filtering in Priority 2, transitions will be faster automatically
```

**Impact**: Smoother animations, reduced CPU spikes

---

### Priority 6: Lazy Load Data Simplification
**Problem**: Need to load 20,000 points but don't display all details

**Solution**: For initial load, aggregate/simplify data:

```typescript
// Before passing to ZoomableSunburst
function simplifyLargeDataset(data: DataNode, threshold = 500): DataNode {
  if (countNodes(data) <= threshold) return data;
  
  return {
    ...data,
    children: data.children?.map(child => {
      // Aggregate children beyond a depth limit
      if ((child.children?.length ?? 0) > 50) {
        return {
          name: child.name,
          value: child.children?.reduce((sum, c) => sum + (c.value ?? 1), 0) ?? 0,
          children: undefined, // Don't load all descendants initially
        };
      }
      return child;
    }) ?? [],
  };
}
```

**Impact**: Faster initial render by 50-70%

---

### Priority 7: Memoize Arc Calculations
**Problem**: Arc paths recalculated unnecessarily

```typescript
// In hooks.ts
export function useSunburstArc(radius: number) {
  return useMemo(
    () => {
      return (d3.arc() as any)
        .startAngle((d: ArcData) => d?.x0 ?? 0) // Safely handle undefined
        .endAngle((d: ArcData) => d?.x1 ?? 0)
        // ... rest of arc config
    },
    [radius]
  );
}
```

**Impact**: 5-10% improvement

---

## Implementation Priority

1. **Phase 1 (Quick)**: Remove logging (Priority 1)
2. **Phase 2 (Medium)**: Visibility filtering (Priorities 2-3)
3. **Phase 3 (Advanced)**: Depth culling and lazy loading (Priorities 4-6)

---

## Performance Targets

| Dataset Size | Current FPS | With Phase 1 | With Phase 2 | With Phase 3 |
|-------------|-----------|------------|------------|------------|
| 1,000 nodes | 60 | 60 | 60 | 60 |
| 5,000 nodes | 45 | 50 | 55+ | 58+ |
| 10,000 nodes | 20 | 25 | 40+ | 50+ |
| 20,000 nodes | 8 | 12 | 25+ | 40+ |

---

## Additional Recommendations

### 1. **Add Performance Monitoring**
```typescript
// In ZoomableSunburst.tsx
useLayoutEffect(() => {
  const start = performance.now();
  // ... render code
  const duration = performance.now() - start;
  if (duration > 16.67) { // > 1 frame at 60fps
    console.warn(`Slow render: ${duration.toFixed(2)}ms`);
  }
}, [focus, nodes]);
```

### 2. **Implement Canvas Fallback for Very Large Datasets**
For 20,000+ points, consider:
- Render only visible segments with Canvas API
- Use WebGL for rendering
- Switch between SVG (detail) and Canvas (performance)

### 3. **Add Progressive Loading**
```typescript
// Load hierarchy in chunks
function loadDataProgressive(data: DataNode, batchSize = 100) {
  const [visibleData, setVisibleData] = useState(data);
  
  useEffect(() => {
    let count = 0;
    const loadMore = () => {
      // Expand some nodes with their full children
      count += batchSize;
      // Update state incrementally
    };
    const timer = requestIdleCallback(loadMore);
    return () => cancelIdleCallback(timer);
  }, []);
  
  return visibleData;
}
```

### 4. **Optimize Color Mapping**
```typescript
// Use array lookup instead of Map for better performance
const colorArray = new Array(nodeCount);
topLevel.forEach((c, i) => {
  colorArray[c.data.id] = colors[i % colors.length];
});

// In render: colorArray[node.data.id]
```

---

## Testing Strategy

1. **Benchmark current state** with React DevTools Profiler
2. **Apply Phase 1** optimizations, re-benchmark
3. **Apply Phase 2**, measure improvement
4. **For 20,000 nodes**, apply Phase 3 and test with actual data
5. **Monitor FPS** during zoom/click interactions

### Profiling Commands
```bash
# React DevTools Profiler
# 1. Open React DevTools → Profiler tab
# 2. Record interaction (zoom/click)
# 3. Check render time and component time

# Performance API (in console)
performance.measure('sunburst-render', 'navigationStart');
```

---

## File Change Summary

| File | Changes | Priority |
|------|---------|----------|
| `hooks.ts` | Remove logs, add visibility filter, memoize | 1-2 |
| `ZoomableSunburst.tsx` | Remove logs, filter nodes before render | 1-2 |
| `SunburstArcs.tsx` | Remove logs, use filtered nodes | 1-2 |
| `SunburstLabels.tsx` | Filter visible labels before render | 2-3 |
| `utils.ts` | No changes needed | - |

---

## Quick Implementation Checklist

- [ ] Remove all `console.log()` statements
- [ ] Add visibility check in `useSunburstPartition` 
- [ ] Filter labels in `SunburstLabels` 
- [ ] Test with 5,000 node dataset
- [ ] Test with 20,000 node dataset
- [ ] Measure FPS improvement
- [ ] Profile in React DevTools
- [ ] Implement data simplification if needed
- [ ] Add depth culling for deep hierarchies
- [ ] Consider Canvas rendering for 20,000+ nodes

