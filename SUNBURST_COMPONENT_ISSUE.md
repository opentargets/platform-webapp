# Enhance Sunburst Component for Large-Scale Gene Enrichment Datasets

As a **data analyst / researcher**, I want **an improved sunburst visualization for gene set enrichment analysis (GSEA) results** because **current visualizations struggle with performance and usability when displaying large pathway datasets (>500 pathways), and hierarchical drill-down exploration provides better insights than flat table views.**

## Background

The Gene Enrichment Analysis section currently uses a sunburst chart to visualize GSEA results. The current implementation uses Plotly, which can be slow and memory-intensive for large datasets. 

**Current state:**
- Filtering system for search, categories, NES range, p-value, and FDR thresholds
- Color scale showing enrichment scores (NES values)
- Static UI hints for interaction patterns
- Performance degradation with >500 pathways

**Proposed improvement:**
- Migrate to a D3-powered interactive sunburst with hierarchical grouping
- Support drill-down exploration with animated transitions
- Add zoom and pan capabilities (scroll to zoom, shift+drag to pan)
- Implement intelligent text label visibility based on available space
- Provide breadcrumb navigation for context awareness
- Maintain all existing filter functionality

## Key Features

### Performance Enhancements
- D3 partition layout for efficient hierarchical rendering
- Progressive disclosure through drill-down (only visible nodes render labels)
- Optimized text rendering with visibility culling

### User Experience Improvements
- **Interactive exploration**: Click to drill down into pathway categories, scroll to zoom, shift+drag to pan
- **Breadcrumb navigation**: Shows current position in hierarchy
- **Hover feedback**: Highlights selected pathway and displays full name/breadcrumb trail
- **Animated transitions**: Smooth 650ms animations between states
- **Branch-based coloring**: Distinct hues for each top-level category for easier visual scanning

### Dataset Handling
- Automatic optimization for large datasets (>500 pathways)
- Hierarchical grouping reduces visual clutter
- Maintains all filtering controls (search, NES range, p-value, FDR)

## Tasks

- [ ] Integrate `ZoomableSunburst` component into `ResultsPlotlySunburst`
- [ ] Verify data transformation (`gseaToSunburst` utility) creates proper hierarchy
- [ ] Ensure all existing filters (search, category, NES, p-value, FDR) work with new visualization
- [ ] Implement breadcrumb trail display and interaction
- [ ] Add hover state handling for pathway highlighting
- [ ] Test performance with datasets of varying sizes (100, 500, 1000+ pathways)
- [ ] Verify zoom, pan, and drill-down interactions work smoothly
- [ ] Update component documentation with new interaction patterns
- [ ] Conduct user testing with biology/data science team

## Acceptance Tests

How do we know the task is complete?

1. **Visualization renders correctly**: When I navigate to the Gene Enrichment Analysis page with >500 GSEA results, I see an interactive sunburst chart that loads in <2 seconds without browser lag.

2. **Drill-down navigation works**: When I click on a pathway arc, the view smoothly animates to zoom into that sector, showing sub-pathways or related items. When I click the center circle or use the breadcrumb, I can navigate back to parent levels.

3. **Zoom and pan interactions work**: When I scroll on the sunburst, the visualization zooms in/out smoothly. When I shift+drag on the sunburst, it pans the view. Both interactions maintain the hierarchy and labels correctly.

4. **All filters are functional**: When I adjust the NES range, p-value threshold, FDR threshold, or search for pathways, the sunburst updates to show only matching pathways with smooth animated transitions.

5. **Hover feedback is clear**: When I hover over a pathway arc, the center displays its name and a breadcrumb trail shows its position in the hierarchy.

6. **Performance with large datasets**: When loading 1000+ pathways, the component remains responsive and interactions (clicks, zooms, drags) complete within 300ms.

7. **Labels render intelligently**: Small/narrow arcs don't display labels, while appropriately-sized arcs show clear pathway names rotated correctly.

8. **Mobile/responsive**: The sunburst adapts gracefully to different container sizes and maintains full interactivity on tablets (landscape and portrait).

9. **Color scheme is accessible**: The branch colors provide sufficient contrast and the visualization is distinguishable for color-blind users (consider using perceptually uniform palettes).

## Design Notes

- **Data structure**: Expects hierarchical data with `{ name, children: [...] }` structure
- **Color palette**: Must use `PRIORITISATION_COLORS` from `colorPalettes` utility to maintain NES value-based coloring. Arc color should reflect the NES score of the pathway (negative to positive enrichment), using the same gradient scale as the current Plotly implementation
- **Animation**: 650ms cubic easing for all transitions
- **Font**: System fonts with fallback to sans-serif
- **Accessibility**: Center label can be toggled; breadcrumb provides context for screen readers

## Related Files

- [ZoomableSunburst.tsx](/apps/platform/src/components/Surnburst/ZoomableSunburst.tsx) - Main visualization component
- [ResultsPlotlySunburst.tsx](/apps/platform/src/components/GeneEnrichmentAnalysis/components/ResultsPlotlySunburst.tsx) - Parent component with filtering logic
- [gseaToSunburst utility](/apps/platform/src/components/Surnburst/utils.ts) - Data transformation
