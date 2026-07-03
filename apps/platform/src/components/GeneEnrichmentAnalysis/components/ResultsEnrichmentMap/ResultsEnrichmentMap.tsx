import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import { useContext, useRef, useMemo, useEffect, useState } from "react";
import {
  EnrichmentMapContainer,
  EnrichmentMapControls,
  EnrichmentMapDetailsModal,
  EnrichmentMapHeader,
  EnrichmentMapLegend,
} from "./components";
import type { ResultsEnrichmentMapProps } from "./utils";
import {
  EnrichmentMapControlsContext,
} from "./utils/EnrichmentMapControlsContext";
import {
  useEnrichmentMapState,
  useElementComputation,
  useGeneSearch,
  useCytoscapeInstance,
} from "./hooks";
import { GseaResult } from "../../api/gseaApi";

/**
 * Enrichment Map visualization for GSEA pathway results using Cytoscape.js
 *
 * Shows pathways as nodes connected by edges when they share genes.
 * Related pathways cluster together to reveal enriched functional themes.
 */
export function ResultsEnrichmentMap({ results, genes, diseaseId }: ResultsEnrichmentMapProps) {
  return <ResultsEnrichmentMapContent results={results} genes={genes} diseaseId={diseaseId} />;
}

/**
 * Inner component using the enrichment map controls context
 */
function ResultsEnrichmentMapContent({ results, genes, diseaseId }: ResultsEnrichmentMapProps) {
  const controlsContext = useContext(EnrichmentMapControlsContext);
  if (!controlsContext) {
    throw new Error("ResultsEnrichmentMapContent must be used within EnrichmentMapControlsProvider");
  }
  const { state: controls, dispatch } = controlsContext;



  const containerRef = useRef<HTMLDivElement>(null);
  const [filterToggled, setFilterToggled] = useState(false);

  // State management
  const {
    modalOpen,
    setModalOpen,
    modalType,
    setModalType,
    modalData,
    setModalData,
  } = useEnrichmentMapState();

  // Element computation
  const { computedElements, computedStats, nesDataRange, nesRange, isLoading } = useElementComputation(
    results as Array<GseaResult>,
    genes,
    controls.similarityThreshold,
    controls.sizeBy,
    controls.fdrThreshold,
    controls.pValueThreshold,
    controls.nesRange
  );

  // Initialize NES range from actual results data
  useEffect(() => {
    dispatch({
      type: "INITIALIZE_NES_RANGE",
      payload: { min: nesDataRange.min, max: nesDataRange.max },
    });
  }, [nesDataRange, dispatch]);

  // Cytoscape instance
  const { cyRef, finalStats } = useCytoscapeInstance(
    containerRef,
    computedElements,
    results as unknown as Array<GseaResult>,
    genes,
    isLoading,
    (data) => {
      console.log("Node clicked with data:", data);
      // Hide tooltips when opening modal
      if (cyRef.current && (cyRef.current as any)._hideTooltips) {
        (cyRef.current as any)._hideTooltips();
      }
      setModalType("node");
      setModalData(data);
      setModalOpen(true);
    },
    (data) => {
      // Hide tooltips when opening modal
      if (cyRef.current && (cyRef.current as any)._hideTooltips) {
        (cyRef.current as any)._hideTooltips();
      }
      setModalType("edge");
      setModalData(data);
      setModalOpen(true);
    }
  );

  // Gene/pathway search highlighting
  useGeneSearch(cyRef, computedElements, controls.searchQuery);

  // Recalculate Cytoscape coordinates when filter panel is toggled
  useEffect(() => {
    if (cyRef.current) {
      // Use a small timeout to allow DOM layout to complete
      const timeoutId = setTimeout(() => {
        cyRef.current?.resize();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [filterToggled]);

  // Available pathways for autocomplete
  const availablePathways = useMemo(() => {
    return computedElements
      .filter((el) => !el.data?.source)
      .map((el) => (el.data?.displayLabel as string) || (el.data?.id as string))
      .filter((name) => name && name.length > 0)
      .sort();
  }, [computedElements]);

  // Extract unique gene names from computed elements
  const uniqueGenes = useMemo(() => {
    const geneSet = new Set<string>();
    computedElements.forEach((el) => {
      if (el.data?.sharedGenes && Array.isArray(el.data.sharedGenes)) {
        el.data.sharedGenes.forEach((gene: string) => geneSet.add(gene));
      }
    });
    return Array.from(geneSet).sort();
  }, [computedElements]);

  if (results.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">No results to visualize</Typography>
      </Paper>
    );
  }

  // Calculate filtered pathway count (nodes only, not edges)
  const filteredPathwayCount = useMemo(() => {
    return finalStats.displayedPathways || 0;
  }, [finalStats]);

  return (
    <Paper sx={{ p: 0 }}>
      <EnrichmentMapControls
          pathwayNames={availablePathways}
          geneNames={uniqueGenes}
          onToggleCollapsed={() => setFilterToggled(prev => !prev)}
          filteredPathwayCount={filteredPathwayCount}
          totalPathwayCount={finalStats.totalPathways || computedStats.totalPathways}
        />
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <EnrichmentMapLegend nesRange={nesRange} />
        <EnrichmentMapHeader stats={finalStats} cyRef={cyRef} />
      </Box>
      

      <Box sx={{ position: "relative" }}>
        
        <EnrichmentMapContainer ref={containerRef} />
        {isLoading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255, 255, 255, 0.7)",
              borderRadius: 1,
              zIndex: 10,
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <CircularProgress size={40} sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Computing network...
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <EnrichmentMapDetailsModal
        open={modalOpen}
        type={modalType}
        data={modalData}
        onClose={() => setModalOpen(false)}
        diseaseId={diseaseId}
      />
    </Paper>
  );
}
