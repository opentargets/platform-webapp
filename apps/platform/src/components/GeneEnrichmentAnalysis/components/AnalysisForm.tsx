import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Typography,
} from "@mui/material";
import type { AnalysisInputs, AssociationsState, GeneSetSource } from "../types";

interface AnalysisFormProps {
  libraries: string[];
  analysisInputs: AnalysisInputs;
  associationsState: AssociationsState;
  onLibraryChange: (value: string) => void;
  onGeneSetSourceChange: (value: GeneSetSource) => void;
  onSubmit: () => void;
}

const LIBRARY_DISPLAY_NAMES: Record<string, string> = {
  ReactomePathways_2025: "Reactome 2025",
  "GO:BP_2025": "Gene Ontology (Biological Process) 2025",
  "GO:CC_2025": "Gene Ontology (Cellular Component) 2025",
  "GO:MF_2025": "Gene Ontology (Molecular Function) 2025",
};

/** Extract display name from library path */
function getLibraryDisplayName(library: string): string {
  const parts = library.split("/");
  const rawName = parts[parts.length - 1] || library;
  return LIBRARY_DISPLAY_NAMES[rawName] ?? rawName;
}

function AnalysisForm({
  libraries,
  analysisInputs,
  associationsState,
  onLibraryChange,
  onGeneSetSourceChange,
  onSubmit,
}: AnalysisFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const hasUploadedGenes = associationsState.uploadedEntities.length > 0;
  const hasPinnedGenes = associationsState.pinnedEntities.length > 0;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        p: 3,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {/* Pathway Library Section */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Gene Sets
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select a gene set library to use for the enrichment analysis. Different libraries
            contain curated gene sets from various biological pathway sources.
          </Typography>
          <FormControl fullWidth size="small">
            <Typography variant="body2" sx={{ mb: 1 }}>
              Select library
            </Typography>
            <Select
              id="library-select"
              value={analysisInputs.selectedLibrary}
              displayEmpty
              onChange={(e) => onLibraryChange(e.target.value as string)}
            >
              <MenuItem value="" disabled>
                Choose a library...
              </MenuItem>
              {libraries.map((lib) => (
                <MenuItem value={lib} key={lib}>
                  {getLibraryDisplayName(lib)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {/* Gene Set Source Section */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Ranked List of Genes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose which genes to include in the analysis. You can use all genes from the current
            association results, or select a specific subset. Filters and weights included.
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              name="gene-set-source"
              value={analysisInputs.geneSetSource}
              onChange={(e) => onGeneSetSourceChange(e.target.value as GeneSetSource)}
            >
              <FormControlLabel
                value="all"
                control={<Radio size="small" />}
                label="List from Association Page"
                sx={{ mb: 1 }}
              />
              <FormControlLabel
                value="uploaded"
                control={<Radio size="small" />}
                disabled={!hasUploadedGenes}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>Uploaded List of Genes</span>
                    {hasUploadedGenes && (
                      <Chip
                        label={`${associationsState.uploadedEntities.length} genes`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
                    )}
                  </Box>
                }
                sx={{ mb: 1 }}
              />
              <FormControlLabel
                value="pinned"
                control={<Radio size="small" />}
                disabled={!hasPinnedGenes}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>Pinned List of Genes</span>
                    {hasPinnedGenes && (
                      <Chip
                        label={`${associationsState.pinnedEntities.length} genes`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
                    )}
                  </Box>
                }
              />
            </RadioGroup>
            {!hasUploadedGenes && !hasPinnedGenes && (
              <FormHelperText>
                Tip: Upload or pin genes in the associations table to enable subset analysis.
              </FormHelperText>
            )}
          </FormControl>
        </Paper>
      </Box>

      {/* Submit Button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          pt: 4,
          borderTop: "1px solid",
          borderColor: "divider",
          mt: 4,
        }}
      >
        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={!analysisInputs.selectedLibrary}
          sx={{
            px: 6,
            py: 1.5,
            textTransform: "none",
            fontSize: "1rem",
          }}
        >
          Run Gene Set Enrichment Analysis
        </Button>
      </Box>
    </Box>
  );
}

export default AnalysisForm;
