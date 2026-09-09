import { faClipboard } from "@fortawesome/free-regular-svg-icons";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Typography,
} from "@mui/material";
import { processVariantId } from "@ot/utils";
import { lighten } from "polished";
import { type ReactNode, useState } from "react";
import { Tooltip } from "ui";

const highlightBackground = (theme) => lighten(0.4, theme.palette.primary.main);

type DisplayVariantIdProps = {
  variantId: string;
  referenceAllele: string;
  alternateAllele: string;
  maxChars?: number;
  expand?: boolean;
};

function DisplayVariantId({
  variantId: otVariantId,
  referenceAllele,
  alternateAllele,
  maxChars = 6,
  expand = true,
}: DisplayVariantIdProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  if (!otVariantId || !referenceAllele || !alternateAllele) return null;

  function handleClick() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleCloseSnackbar() {
    setSnackbarOpen(false);
  }

  function copyToClipboard(text: string) {
    setSnackbarOpen(true);
    navigator.clipboard.writeText(text);
  }

  const { isHashed, stem } = processVariantId(otVariantId, referenceAllele, alternateAllele);

  const longReferenceAllele = referenceAllele.length > maxChars;
  const longAlternateAllele = alternateAllele.length > maxChars;

  if (isHashed || longReferenceAllele || longAlternateAllele) {
    return (
      <>
        <Box
          component="span"
          onClick={expand ? handleClick : null}
          title="Show variant ID"
          sx={{
            cursor: expand ? "pointer" : "inherit",
            padding: "0 0.06em",
            borderRadius: "0.3em",
            "&:hover": {
              background: expand ? highlightBackground : "transparent",
            },
          }}
        >
          {stem}_
          {longReferenceAllele ? (
            <HighlightBox hlight={expand}>
              <span style={{ fontSize: "0.94em", fontStyle: "italic" }}>DEL</span>
            </HighlightBox>
          ) : (
            referenceAllele
          )}
          _
          {longAlternateAllele ? (
            <HighlightBox hlight={expand}>
              <span style={{ fontSize: "0.94em", fontStyle: "italic" }}>INS</span>
            </HighlightBox>
          ) : (
            alternateAllele
          )}
        </Box>
        {expand && (
          <>
            <Dialog
              open={open}
              onClose={handleClose}
              scroll="paper"
              aria-labelledby="dialog-title"
              aria-describedby="dialog-description"
              maxWidth="md"
            >
              <DialogTitle id="dialog-title">
                <Typography variant="h6" component="span">
                  Variant ID
                </Typography>
                <IconButton
                  onClick={handleClose}
                  sx={{
                    zIndex: "2",
                    position: "absolute",
                    top: "0",
                    right: "0",
                    padding: "0.7em",
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers={true} sx={{ padding: "0 1.5em 3em" }}>
                {isHashed && (
                  <CopyPanel
                    label="Hashed Variant ID"
                    tooltipText="Variant ID used in Open Targets data."
                    text={otVariantId}
                    copyToClipboard={copyToClipboard}
                  />
                )}
                <CopyPanel
                  label="Full Variant ID"
                  text={`${stem}_${referenceAllele}_${alternateAllele}`}
                  copyToClipboard={copyToClipboard}
                />
              </DialogContent>
            </Dialog>
            <Snackbar
              open={snackbarOpen}
              onClose={handleCloseSnackbar}
              message="Copied to clipboard"
              autoHideDuration={3000}
            />
          </>
        )}
      </>
    );
  }

  return `${stem}_${referenceAllele}_${alternateAllele}`;
}

function HighlightBox({ children, hlight = true }) {
  return (
    <Box
      component="span"
      borderRadius="0.3em"
      mx={hlight ? "0.1em" : 0}
      px="0.15em"
      bgcolor={hlight ? highlightBackground : "transparent"}
    >
      {children}
    </Box>
  );
}

type CopyPanelProps = {
  label: string;
  text: string;
  tooltipText?: string;
  copyToClipboard: (text: string) => void;
};

function CopyPanel({ label, text, tooltipText, copyToClipboard }: CopyPanelProps) {
  return (
    <Box mt={2}>
      {tooltipText ? (
        <Tooltip title={tooltipText} showHelpIcon>
          <Typography variant="subtitle1" component="span">
            {label}
          </Typography>
        </Tooltip>
      ) : (
        <Typography variant="subtitle1">{label}</Typography>
      )}
      <Box
        sx={{
          marginTop: "0.1em",
          backgroundColor: (theme) => theme.palette.grey[300],
          position: "relative",
        }}
      >
        <Box position="absolute" top={0} right={0}>
          <Tooltip title="Copy to clipboard">
            <IconButton
              onClick={() => copyToClipboard(text)}
              sx={{ padding: "0.4em 0.5em !important" }}
            >
              <FontAwesomeIcon icon={faClipboard} />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography
          variant="body2"
          sx={{
            padding: "1em 3.2em 1em 1em",
            textWrap: "wrap",
            wordWrap: "break-word",
          }}
        >
          {text}
        </Typography>
      </Box>
    </Box>
  );
}

export default DisplayVariantId;
