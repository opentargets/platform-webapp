import { Box, Container, Typography } from "@mui/material";
import { useEffect, type ReactElement } from "react";
import { useSearchParams } from "react-router-dom";
import { BasePage } from "ui";
import { setAssociationsState, setStandaloneGenes } from "../../components/GeneEnrichmentAnalysis/actions";
import StandaloneAnalysisContainer from "../../components/GeneEnrichmentAnalysis/components/StandaloneAnalysisContainer";
import {
  useGeneEnrichmentDispatch,
  useGeneEnrichmentState,
} from "../../components/GeneEnrichmentAnalysis/Provider";
import { readAndClearAotfHandoff } from "../../components/GeneEnrichmentAnalysis/utils/aotfHandoff";

function AnalysisPageContent(): ReactElement {
  const dispatch = useGeneEnrichmentDispatch();
  const { runs, activeRunId } = useGeneEnrichmentState();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source");

  useEffect(() => {
    if (source === "aotf") {
      const handoff = readAndClearAotfHandoff();
      if (handoff) {
        // Restore AOTF state so useGseaAnalysis can do the GQL fetch automatically
        dispatch(setAssociationsState(handoff.associationsState));
        dispatch(setStandaloneGenes(null)); // null = use GQL path
      } else {
        dispatch(setStandaloneGenes([])); // no handoff — show empty form
      }
    } else {
      dispatch(setStandaloneGenes([])); // direct navigation — show empty form
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeRun = activeRunId ? runs.find((run) => run.id === activeRunId) : null;
  // The results view (table/tree/sunburst/network) needs a viewport-bound,
  // internally-scrolling layout — the AOTF modal gets this for free from its
  // Dialog's fixed height:100vh, but this page has no such ancestor, so panes
  // like the sunburst fall back to their unbounded intrinsic size instead of
  // scrolling internally. Only clamp once results are showing: doing this for
  // the input form too would clip it on short viewports instead of letting the
  // page grow and scroll like every other page.
  const isResultsView = activeRun?.status === "complete";

  return (
    <Container
      maxWidth={false}
      sx={{
        pt: 4,
        pb: 6,
        display: "flex",
        flexDirection: "column",
        ...(isResultsView ? { height: "calc(100vh - 48px)", overflow: "hidden" } : { flex: 1 }),
      }}
    >
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Gene Set Enrichment Analysis
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Run GSEA on a custom ranked list of genes. Paste your gene list or upload a{" "}
        <Box component="code" sx={{ fontFamily: "monospace", fontSize: "0.9em" }}>
          .txt
        </Box>{" "}
        file with one{" "}
        <Box component="code" sx={{ fontFamily: "monospace", fontSize: "0.9em" }}>
          SYMBOL{"\t"}SCORE
        </Box>{" "}
        per line.
      </Typography>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <StandaloneAnalysisContainer />
      </Box>
    </Container>
  );
}

function AnalysisPage(): ReactElement {
  return (
    <BasePage>
      <AnalysisPageContent />
    </BasePage>
  );
}

export default AnalysisPage;
