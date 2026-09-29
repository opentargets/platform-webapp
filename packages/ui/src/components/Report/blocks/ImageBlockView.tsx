import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  InputBase,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";
import { fitsStorageBudget, useReportBuilder } from "../../../providers/ReportBuilderProvider";
import { ImageBlock } from "../../../types/report";
import { CollapsibleBlockRow } from "./BlockFrames";
import { FOCUS_TARGET_ATTR, useBlockEditor } from "./BlockEditorContext";
import { ACCEPTED_IMAGE_TYPES, processImageFile } from "./imageProcessing";
import { BlockViewProps } from "./types";
import { figureLabel } from "./figures";

export const captionSx = {
  fontStyle: "italic",
  fontSize: "0.8rem",
  color: "#616161",
} as const;

export const imageAlt = (block: ImageBlock): string => block.alt || block.caption || block.fileName || "";

/**
 * Caption input shared by image and data blocks
 */
export const CaptionField: React.FC<{ value?: string; onSave: (caption: string) => void }> = ({
  value,
  onSave,
}) => {
  const [caption, setCaption] = useState(value ?? "");
  useEffect(() => setCaption(value ?? ""), [value]);
  return (
    <InputBase
      fullWidth
      multiline
      value={caption}
      placeholder="Add a caption"
      onChange={(e) => setCaption(e.target.value)}
      onBlur={() => caption !== (value ?? "") && onSave(caption)}
      inputProps={{ "aria-label": "Caption" }}
      sx={{ ...captionSx, "& textarea": { p: 0 } }}
    />
  );
};

export const ImageBlockView: React.FC<BlockViewProps<ImageBlock>> = ({
  block,
  index,
  expanded,
  onToggle,
  onHeaderKeyDown,
}) => {
  const { state } = useReportBuilder();
  const { report, updateBlock } = useBlockEditor();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const label = figureLabel(report.sections, block.reportSectionId);
  const title = `${label} · ${block.caption || block.fileName || "Image"}`;

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const { src, fileName } = await processImageFile(file);
      // Check the storage budget before writing; fail at the block, not globally
      if (!fitsStorageBudget(state.reports, src.length - block.src.length)) {
        setError(
          "This image won't fit in the browser's report storage. Try a smaller image or remove other large blocks."
        );
        return;
      }
      updateBlock(block.reportSectionId, { src, fileName });
    } catch (e) {
      setError(e instanceof Error ? e.message : "This image couldn't be added.");
    } finally {
      setBusy(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const file = Array.from(event.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      event.preventDefault();
      handleFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const editAlt = () => {
    const alt = window.prompt(
      "Alt text (describes the image for screen readers and export)",
      imageAlt(block)
    );
    if (alt !== null) updateBlock(block.reportSectionId, { alt: alt.trim() });
  };

  return (
    <CollapsibleBlockRow
      reportSectionId={block.reportSectionId}
      index={index}
      title={title}
      expanded={expanded}
      onToggle={onToggle}
      onHeaderKeyDown={onHeaderKeyDown}
      menuItems={[
        { label: "Edit alt text", onClick: editAlt, disabled: !block.src },
        { label: "Replace image", onClick: () => fileInput.current?.click() },
      ]}
      // The file input lives in the (always mounted) actions slot so "Replace" works while collapsed
      actions={
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          hidden
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      }
      header={
        <>
          <Box
            sx={{
              width: 26,
              height: 26,
              flexShrink: 0,
              border: "1px solid",
              borderColor: "grey.300",
              borderRadius: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "grey.500",
              fontSize: 12,
              overflow: "hidden",
              bgcolor: "grey.50",
            }}
          >
            {block.src ? (
              <img src={block.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <FontAwesomeIcon icon={faImage} />
            )}
          </Box>
          <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: "#616161", minWidth: 0 }}>
            {title}
          </Typography>
        </>
      }
    >
      <Box onPaste={handlePaste} sx={{ p: "14px" }}>
        {!block.src ? (
          <ButtonBase
            {...{ [FOCUS_TARGET_ATTR]: "" }}
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            aria-label="Add an image: drop, paste, or browse"
            sx={{
              width: "100%",
              minHeight: 140,
              flexDirection: "column",
              gap: 0.5,
              border: "2px dashed",
              borderColor: dragOver ? "primary.main" : "grey.400",
              bgcolor: dragOver ? "#f2f8fd" : "transparent",
              borderRadius: "2px",
              color: "text.secondary",
              "&.Mui-focusVisible": { borderColor: "primary.main" },
            }}
          >
            {busy ? (
              <CircularProgress size={20} />
            ) : (
              <>
                <Typography sx={{ fontSize: 14 }}>
                  Drop an image here · or{" "}
                  <Box component="span" sx={{ color: "primary.main", textDecoration: "underline" }}>
                    browse
                  </Box>
                </Typography>
                <Typography sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: 11, color: "grey.500" }}>
                  png · jpg · svg
                </Typography>
              </>
            )}
          </ButtonBase>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                {...{ [FOCUS_TARGET_ATTR]: "" }}
                sx={{ height: 28, textTransform: "none" }}
              >
                {busy ? "Processing…" : "Replace"}
              </Button>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={block.width}
                onChange={(_, width: ImageBlock["width"] | null) =>
                  width && updateBlock(block.reportSectionId, { width })
                }
                aria-label="Image width"
                sx={{ "& .MuiToggleButton-root": { py: 0.25, textTransform: "none", fontSize: 12 } }}
              >
                <ToggleButton value="column">Column</ToggleButton>
                <ToggleButton value="full">Full width</ToggleButton>
              </ToggleButtonGroup>
              {!imageAlt(block) && (
                <Button
                  size="small"
                  onClick={editAlt}
                  sx={{ ml: "auto", textTransform: "none", color: "#ff6350" }}
                >
                  Add alt text
                </Button>
              )}
            </Box>
            <Box
              component="figure"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              sx={{ maxWidth: block.width === "column" ? 680 : "none", mx: "auto", my: 0 }}
            >
              <Box
                component="img"
                src={block.src}
                alt={imageAlt(block)}
                sx={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  border: "1px solid",
                  borderColor: "grey.300",
                }}
              />
              <Box component="figcaption" sx={{ mt: 0.75, display: "flex", alignItems: "baseline", gap: 0.5 }}>
                <Box component="span" sx={{ ...captionSx, fontWeight: 700, flexShrink: 0 }}>
                  {label}.
                </Box>
                <CaptionField
                  value={block.caption}
                  onSave={(caption) => updateBlock(block.reportSectionId, { caption })}
                />
              </Box>
            </Box>
          </>
        )}
        {error && (
          <Typography role="alert" sx={{ mt: 1, fontSize: 13, color: "#ff6350" }}>
            {error}
          </Typography>
        )}
      </Box>
    </CollapsibleBlockRow>
  );
};

export default ImageBlockView;
