import { Box, Container, Typography } from "@mui/material";
import { useEffect, type ReactElement } from "react";
import { useSearchParams } from "react-router";
import { BasePage } from "ui";
import { setAssociationsState, setStandaloneGenes } from "../../components/GeneEnrichmentAnalysis/actions";
import StandaloneAnalysisContainer from "../../components/GeneEnrichmentAnalysis/components/StandaloneAnalysisContainer";
import { GeneEnrichmentProvider, useGeneEnrichmentDispatch } from "../../components/GeneEnrichmentAnalysis/Provider";
import { readAndClearAotfHandoff } from "../../components/GeneEnrichmentAnalysis/utils/aotfHandoff";

function AnalysisPageInner(): ReactElement {
  const dispatch = useGeneEnrichmentDispatch();
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <StandaloneAnalysisContainer />
    </Box>
  );
}

function AnalysisPage(): ReactElement {
  return (
    <BasePage>
      <GeneEnrichmentProvider>
        <Container maxWidth={false} sx={{ pt: 4, pb: 6, display: "flex", flexDirection: "column", flex: 1 }}>
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
            <AnalysisPageInner />
          </Box>
        </Container>
      </GeneEnrichmentProvider>
    </BasePage>
  );
}

export default AnalysisPage;
