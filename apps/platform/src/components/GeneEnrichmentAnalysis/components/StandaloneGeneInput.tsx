import { faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Alert,
  Box,
  Button,
  FormControl,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { AnalysisInputs, Gene } from "../types";
import { genesToText, parseGeneList } from "../utils/parseGeneList";
import { GseaLibrariesMap } from "../constants";

const LIBRARY_DISPLAY_NAMES: Record<string, string> = GseaLibrariesMap;

function getLibraryDisplayName(library: string): string {
  const parts = library.split("/");
  const rawName = parts[parts.length - 1] || library;
  return LIBRARY_DISPLAY_NAMES[rawName] ?? rawName;
}

interface StandaloneGeneInputProps {
  libraries: string[];
  analysisInputs: AnalysisInputs;
  initialGenes?: Gene[];
  onLibraryChange: (value: string) => void;
  onSubmit: (genes: Gene[]) => void;
}

export function StandaloneGeneInput({
  libraries,
  analysisInputs,
  initialGenes,
  onLibraryChange,
  onSubmit,
}: StandaloneGeneInputProps) {
  const [textValue, setTextValue] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill from AOTF handoff on mount
  useEffect(() => {
    if (initialGenes && initialGenes.length > 0) {
      setTextValue(genesToText(initialGenes));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const parseResult = textValue.trim() ? parseGeneList(textValue) : null;
  const geneCount = parseResult?.genes.length ?? 0;
  const hasValidInput = geneCount > 0 && !!analysisInputs.selectedLibrary;
  const visibleErrors = parseResult?.errors.slice(0, 5) ?? [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      setTextValue((ev.target?.result as string) ?? "");
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parseResult || parseResult.genes.length === 0) return;
    onSubmit(parseResult.genes);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", flexDirection: "column", height: "100%", p: 3 }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {/* Library selection */}
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
              value={analysisInputs.selectedLibrary}
              displayEmpty
              onChange={e => onLibraryChange(e.target.value)}
            >
              <MenuItem value="" disabled>
                Choose a library...
              </MenuItem>
              {libraries.map(lib => (
                <MenuItem value={lib} key={lib}>
                  {getLibraryDisplayName(lib)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {/* Gene input section */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Ranked Gene List
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Provide one gene per line in the format{" "}
            <Box component="code" sx={{ fontFamily: "monospace", fontSize: "0.85em" }}>
              SYMBOL{"\t"}SCORE
            </Box>
            . Scores can be any float (e.g. association score, fold-change, –log p-value).
          </Typography>

          <TextField
            multiline
            fullWidth
            minRows={10}
            maxRows={20}
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            placeholder={"BRCA1\t0.95\nTP53\t0.82\nEGFR\t0.74\n..."}
            inputProps={{ style: { fontFamily: "monospace", fontSize: "0.85rem" } }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FontAwesomeIcon icon={faUpload} />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload .txt file
            </Button>
            {fileName && (
              <Typography variant="caption" color="text.secondary">
                {fileName}
              </Typography>
            )}
            {geneCount > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                {geneCount} gene{geneCount !== 1 ? "s" : ""} parsed
              </Typography>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.tsv,.csv"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </Box>

          {visibleErrors.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              <Typography variant="caption" component="div">
                {visibleErrors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
                {(parseResult?.errors.length ?? 0) > 5 && (
                  <div>…and {(parseResult?.errors.length ?? 0) - 5} more</div>
                )}
              </Typography>
            </Alert>
          )}
        </Paper>
      </Box>

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
          size="large"
          disabled={!hasValidInput}
          sx={{ px: 6, py: 1.5, textTransform: "none", fontSize: "1rem" }}
        >
          Run Gene Set Enrichment Analysis
        </Button>
      </Box>
    </Box>
  );
}

export default StandaloneGeneInput;
