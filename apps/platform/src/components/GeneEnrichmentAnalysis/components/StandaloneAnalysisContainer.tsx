import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useApolloClient } from "ui";
import { deleteRun, setActiveRun, setAnalysisInputs } from "../actions";
import { useGseaAnalysis } from "../hooks/useGseaAnalysis";
import { useGeneEnrichment } from "../Provider";
import type { Gene } from "../types";
import AnalysisResults from "./AnalysisResults";
import RunHistorySidebar from "./RunHistorySidebar";
import StandaloneGeneInput from "./StandaloneGeneInput";

const STEP_MESSAGES: Record<string, string> = {
  fetching_associations: "Fetching associations...",
  running_gsea: "Running Gene Set Enrichment Analysis...",
};

export function StandaloneAnalysisContainer() {
  const client = useApolloClient();
  const [state, dispatch] = useGeneEnrichment();
  const {
    analysisInputs,
    associationsState,
    libraries,
    librariesLoading,
    runs,
    activeRunId,
    standaloneGenes,
  } = state;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { step, results, inputOverlap, error, isLoading, runAnalysis, reset } = useGseaAnalysis({
    client,
    state,
    dispatch,
  });

  // Auto-trigger when arriving from AOTF handoff (standaloneGenes === null means GQL path)
  useEffect(() => {
    if (standaloneGenes === null && associationsState.efoId) {
      runAnalysis();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set first available library automatically
  useEffect(() => {
    if (!analysisInputs.selectedLibrary && libraries.length > 0) {
      dispatch(setAnalysisInputs({ selectedLibrary: libraries[0] }));
    }
  }, [libraries, analysisInputs.selectedLibrary, dispatch]);

  const handleSubmit = (genes: Gene[]) => {
    runAnalysis(genes);
  };

  const handleLibraryChange = (value: string) => {
    dispatch(setAnalysisInputs({ selectedLibrary: value }));
  };

  const handleSelectRun = useCallback(
    (runId: string | null) => dispatch(setActiveRun(runId)),
    [dispatch]
  );

  const handleDeleteRun = useCallback(
    (runId: string) => dispatch(deleteRun(runId)),
    [dispatch]
  );

  const handleNewAnalysis = useCallback(() => dispatch(setActiveRun(null)), [dispatch]);

  const handleToggleCollapse = useCallback(() => setSidebarCollapsed(prev => !prev), []);

  const showSidebar = true;

  if (librariesLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  function renderMainContent() {
    if (isLoading) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            p: 4,
            flex: 1,
            height: "100%",
          }}
        >
          <CircularProgress />
          <Typography>{STEP_MESSAGES[step] ?? "Running..."}</Typography>
        </Box>
      );
    }

    if (step === "error") {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
            textAlign: "center",
            flex: 1,
            height: "100%",
          }}
        >
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Button variant="outlined" onClick={reset}>
            Try again
          </Button>
        </Box>
      );
    }

    if (step === "complete") {
      return (
        <AnalysisResults
          results={results}
          inputOverlap={inputOverlap}
          onReset={reset}
          activeRunId={activeRunId}
        />
      );
    }

    return (
      <StandaloneGeneInput
        libraries={libraries}
        analysisInputs={analysisInputs}
        initialGenes={standaloneGenes ?? undefined}
        onLibraryChange={handleLibraryChange}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100%" }}>
      {showSidebar && (
        <RunHistorySidebar
          runs={runs}
          activeRunId={activeRunId}
          currentAssociationsState={associationsState}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          onSelectRun={handleSelectRun}
          onDeleteRun={handleDeleteRun}
          onNewAnalysis={handleNewAnalysis}
        />
      )}
      <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {renderMainContent()}
      </Box>
    </Box>
  );
}

export default StandaloneAnalysisContainer;
