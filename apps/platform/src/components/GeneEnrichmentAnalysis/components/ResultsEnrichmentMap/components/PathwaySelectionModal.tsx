import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Autocomplete, TextField, Typography } from "@mui/material";
import { useState } from "react";
import type { ShortestPathResult } from "../../utils/shortestPath";

export interface PathwaySelectionModalProps {
  open: boolean;
  onClose: () => void;
  onPathwaysSelected: (source: string, target: string) => void;
  selectedPathways: { source: string | null; target: string | null };
  foundPath?: ShortestPathResult | null;
  isLoading?: boolean;
  availablePathways?: string[];
}

/**
 * Modal for selecting two pathways to find shortest path between them
 */
export function PathwaySelectionModal({
  open,
  onClose,
  onPathwaysSelected,
  selectedPathways,
  foundPath,
  isLoading = false,
  availablePathways = [],
}: PathwaySelectionModalProps) {
  const [tempSource, setTempSource] = useState<string | null>(null);
  const [tempTarget, setTempTarget] = useState<string | null>(null);
  const [sourceInputValue, setSourceInputValue] = useState("");
  const [targetInputValue, setTargetInputValue] = useState("");

  const handleFindPath = () => {
    if (tempSource && tempTarget && tempSource !== tempTarget) {
      onPathwaysSelected(tempSource, tempTarget);
    }
  };

  const handleClose = () => {
    setTempSource(null);
    setTempTarget(null);
    setSourceInputValue("");
    setTargetInputValue("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Find Shortest Path Between Pathways</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Enter two pathway names to find the chain of gene connections linking them.
          </Typography>

          <Autocomplete
            options={availablePathways}
            value={tempSource}
            inputValue={sourceInputValue}
            onChange={(_, newValue) => setTempSource(newValue)}
            onInputChange={(_, newInputValue) => setSourceInputValue(newInputValue)}
            disabled={isLoading}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Source Pathway"
                placeholder="e.g., DNA repair"
                size="small"
              />
            )}
          />

          <Autocomplete
            options={availablePathways}
            value={tempTarget}
            inputValue={targetInputValue}
            onChange={(_, newValue) => setTempTarget(newValue)}
            onInputChange={(_, newInputValue) => setTargetInputValue(newInputValue)}
            disabled={isLoading}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Target Pathway"
                placeholder="e.g., Apoptosis"
                size="small"
              />
            )}
          />

          {foundPath && foundPath.pathFound && (
            <Box
              sx={{
                p: 2,
                bgcolor: "success.light",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "success.main",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Path Found! 🎯
              </Typography>
              <Typography variant="body2">
                <strong>Distance:</strong> {foundPath.distance.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                <strong>Pathway steps:</strong> {foundPath.pathNodeIds.length}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Connecting genes:</strong> {foundPath.connectingGenes.join(", ") || "None"}
              </Typography>
            </Box>
          )}

          {foundPath && !foundPath.pathFound && (
            <Box
              sx={{
                p: 2,
                bgcolor: "warning.light",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "warning.main",
              }}
            >
              <Typography variant="body2" color="warning.dark">
                No path found between these pathways. They may not be connected through shared genes with current filters applied.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleFindPath}
          variant="contained"
          disabled={!tempSource || !tempTarget || tempSource === tempTarget || isLoading}
        >
          {isLoading ? "Computing..." : "Find Path"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
