import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { Params, useNavigate, useParams } from "react-router";

import DownloadsSchema from "./DownloadsSchema";
import DownloadsAccessOptions from "./DownloadsAccessOptions";
import { CopyUrlButton } from "ui";
import { useContext, useEffect, useMemo } from "react";
import { DownloadsContext } from "./context/DownloadsContext";

function DownloadsDialog() {
  const { state } = useContext(DownloadsContext);
  const { downloadsRow, downloadsView }: Readonly<Params<string>> = useParams();
  const navigate = useNavigate();

  const currentDataRow = useMemo(() => {
    return state.rows.filter(e => e["@id"] === `${downloadsRow}-fileset`);
  }, [downloadsRow]);

  const currentSchemaRow = useMemo(
    () => state.schemaRows.filter(e => e["@id"] === downloadsRow),
    [downloadsRow]
  );

  const VEIW_MAP = {
    access: (
      <DownloadsAccessOptions
        data={currentDataRow[0]}
        version={state.downloadsData?.version}
        locationUrl={state.locationURLs}
      />
    ),
    schema: <DownloadsSchema data={currentSchemaRow[0]} />,
  };

  function handleClose() {
    navigate("/downloads");
  }

  function switchDisplayMode() {
    if (downloadsView === "access") navigate(`/downloads/${downloadsRow}/schema`);
    else navigate(`/downloads/${downloadsRow}/access`);
  }

  function getDisplayText() {
    if (downloadsView === "access") return "Show Schema";
    return "Access Data";
  }

  useEffect(() => {
    if (!Object.hasOwnProperty.call(VEIW_MAP, downloadsView) || !currentDataRow.length) {
      handleClose();
    }
  }, [downloadsRow, downloadsView]);

  return (
    <Dialog
      open={true}
      onClose={handleClose}
      aria-labelledby="scroll-dialog-title"
      aria-describedby="scroll-dialog-description"
      sx={{
        "& .MuiDialog-container": {
          "& .MuiPaper-root": {
            minWidth: "50vw",
            width: "800px",
            maxWidth: "100%",
            maxHeight: "90%",
          },
        },
      }}
    >
      <DialogTitle id="scroll-dialog-title">
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
            Dataset: {downloadsRow}
          </Typography>
          <CopyUrlButton tooltipTitle={`Copy URL for ${downloadsRow} dataset `} />
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, pt: 2, mx: 3, mb: 3 }}>
        {VEIW_MAP[downloadsView]}
      </DialogContent>
      <DialogActions sx={{ mb: 2, mx: 2, display: "flex", justifyContent: "space-between" }}>
        <Button onClick={switchDisplayMode}>{getDisplayText()}</Button>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
export default DownloadsDialog;
