import React, { useRef, useState } from "react";
import { Box, Button, ButtonBase, FormControlLabel, Switch, TextField, Typography } from "@mui/material";
import { fitsStorageBudget, useReportBuilder } from "../../../providers/ReportBuilderProvider";
import { TableBlock, TableColumnType } from "../../../types/report";
import { useBlockEditor } from "./BlockEditorContext";
import { DataBlockShell, monoSx, StatusPill } from "./DataBlockShell";
import { RowsTable } from "./DataResultView";
import { downloadCsv, cellText } from "./dataPaths";
import {
  buildTable,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_ROWS_STORED,
  parseCells,
  sourceTypeFor,
} from "./parseDelimited";
import { BlockViewProps } from "./types";

const TYPE_CYCLE: TableColumnType[] = ["string", "number", "boolean"];
const PREVIEW_ROWS = 8;

interface Draft {
  cells: unknown[][];
  delimiter: string;
  fileName?: string;
  header: boolean;
  types?: TableColumnType[];
}

export const TableBlockView: React.FC<BlockViewProps<TableBlock>> = (props) => {
  const { block } = props;
  const { state } = useReportBuilder();
  const { updateBlock } = useBlockEditor();
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const hasData = block.rows.length > 0;
  const preview = draft ? buildTable(draft.cells, draft.header, draft.types, draft.delimiter) : null;

  const startDraft = (text: string, fileName?: string) => {
    setError(null);
    const { cells, delimiter, error: parseError } = parseCells(text);
    if (parseError || cells.length === 0) {
      setError(parseError ?? "No rows found in that data.");
      return;
    }
    setPasting(false);
    setPasteText("");
    setDraft({ cells, delimiter, fileName, header: true });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(csv|tsv|txt)$/i.test(file.name) && !/^text\//.test(file.type)) {
      setError("Choose a .csv, .tsv or .txt file.");
      return;
    }
    startDraft(await file.text(), file.name);
  };

  const cycleType = (i: number) => {
    if (!draft || !preview) return;
    const types = preview.columns.map((c) => c.type);
    types[i] = TYPE_CYCLE[(TYPE_CYCLE.indexOf(types[i]) + 1) % TYPE_CYCLE.length];
    setDraft({ ...draft, types });
  };

  const confirm = () => {
    if (!draft || !preview) return;
    const patch: Partial<TableBlock> = {
      columns: preview.columns,
      rows: preview.rows,
      truncated: preview.truncated,
      dataUpdatedAt: Date.now(),
      source: { type: sourceTypeFor(draft.fileName, draft.delimiter), fileName: draft.fileName },
      ...(draft.fileName && block.title === "Table" ? { title: draft.fileName.replace(/\.[^.]+$/, "") } : {}),
    };
    const addedBytes = JSON.stringify(patch.rows).length - JSON.stringify(block.rows).length;
    if (!fitsStorageBudget(state.reports, addedBytes)) {
      setError(
        "This table won't fit in the browser's report storage. Try fewer rows, or remove other large blocks."
      );
      return;
    }
    updateBlock(block.reportSectionId, patch);
    setDraft(null);
  };

  const status = hasData ? (
    <StatusPill tone="neutral">
      {block.rows.length.toLocaleString()} rows{block.source.fileName ? ` · ${block.source.fileName}` : ""}
    </StatusPill>
  ) : (
    <StatusPill tone="neutral">no data</StatusPill>
  );

  const fileInputEl = (
    <input
      ref={fileInput}
      type="file"
      accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
      hidden
      onChange={(e) => {
        handleFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  const renderEmpty = () =>
    pasting ? (
      <Box>
        <TextField
          autoFocus
          multiline
          minRows={6}
          fullWidth
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste rows copied from a spreadsheet, or comma/tab-separated text"
          inputProps={{ "aria-label": "Pasted data", style: { ...monoSx } }}
        />
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <Button
            variant="contained"
            onClick={() => startDraft(pasteText)}
            disabled={!pasteText.trim()}
            sx={{ textTransform: "none", boxShadow: "none" }}
          >
            Preview
          </Button>
          <Button onClick={() => setPasting(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
        </Box>
      </Box>
    ) : (
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "stretch", flexWrap: "wrap" }}>
        <ButtonBase
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          aria-label="Add a CSV or TSV file: drop or browse"
          sx={{
            flex: "1 1 260px",
            minHeight: 110,
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
          <Typography sx={{ fontSize: 14 }}>
            Drop a file here · or{" "}
            <Box component="span" sx={{ color: "primary.main", textDecoration: "underline" }}>
              browse
            </Box>
          </Typography>
          <Typography sx={{ ...monoSx, fontSize: 11, color: "grey.500" }}>csv · tsv · txt</Typography>
        </ButtonBase>
        <Button
          variant="outlined"
          onClick={() => setPasting(true)}
          sx={{ textTransform: "none", flex: "0 0 auto" }}
        >
          Paste data
        </Button>
      </Box>
    );

  const renderPreview = () =>
    preview && draft ? (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap" }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={draft.header}
                onChange={(e) => setDraft({ ...draft, header: e.target.checked, types: undefined })}
              />
            }
            label={<Typography sx={{ fontSize: 13 }}>First row is a header</Typography>}
          />
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            {preview.totalRows.toLocaleString()} rows · {preview.columns.length} columns
            {draft.fileName ? ` · ${draft.fileName}` : ""}
          </Typography>
        </Box>
        {preview.truncated && (
          <Typography sx={{ fontSize: 12, color: "#ff6350", mb: 1 }}>
            Only the first {MAX_TABLE_ROWS_STORED.toLocaleString()} rows and {MAX_TABLE_COLUMNS} columns will
            be kept.
          </Typography>
        )}
        <Box sx={{ overflowX: "auto", border: "1px solid", borderColor: "grey.300", mb: 1 }}>
          <Box component="table" sx={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
            <thead>
              <tr>
                {preview.columns.map((column, i) => (
                  <Box
                    component="th"
                    key={column.key}
                    sx={{
                      textAlign: "left",
                      p: "6px 8px",
                      borderBottom: "1px solid",
                      borderColor: "grey.300",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Box sx={{ fontWeight: 700, mb: 0.5 }}>{column.label}</Box>
                    <ButtonBase
                      onClick={() => cycleType(i)}
                      aria-label={`${column.label} type: ${column.type}. Change type`}
                      sx={{
                        ...monoSx,
                        fontSize: 11,
                        px: 0.75,
                        borderRadius: 10,
                        border: "1px solid",
                        borderColor: "#7bb3de",
                        bgcolor: "#e3f0fa",
                        color: "primary.dark",
                      }}
                    >
                      {column.type}
                    </ButtonBase>
                  </Box>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.slice(0, PREVIEW_ROWS).map((row, r) => (
                <tr key={r}>
                  {preview.columns.map((column) => (
                    <Box
                      component="td"
                      key={column.key}
                      sx={{
                        p: "4px 8px",
                        borderBottom: "1px solid",
                        borderColor: "grey.200",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cellText(row[column.key])}
                    </Box>
                  ))}
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="contained" onClick={confirm} sx={{ textTransform: "none", boxShadow: "none" }}>
            {hasData ? "Replace data" : "Add table"}
          </Button>
          <Button onClick={() => setDraft(null)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
        </Box>
      </Box>
    ) : null;

  return (
    <DataBlockShell
      {...props}
      status={status}
      downloadData={hasData ? block.rows : undefined}
      onDownloadCsv={() =>
        downloadCsv(
          block.rows.map((row) => Object.fromEntries(block.columns.map((c) => [c.label, row[c.key]]))),
          block.ref || "table",
          block.columns.map((c) => c.label)
        )
      }
      hiddenInputs={fileInputEl}
      menuItems={[
        {
          label: "Replace data",
          onClick: () => {
            // The preview renders in the body, so open the row first
            if (!props.expanded) props.onToggle(block.reportSectionId);
            fileInput.current?.click();
          },
        },
      ]}
    >
      {draft ? (
        renderPreview()
      ) : hasData ? (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => fileInput.current?.click()}
              sx={{ height: 28, textTransform: "none" }}
            >
              Replace data
            </Button>
          </Box>
          <RowsTable rows={block.rows} columns={block.columns} />
          {block.truncated && (
            <Typography sx={{ fontSize: 12, fontStyle: "italic", color: "text.secondary", mt: 0.5 }}>
              Truncated to the first {MAX_TABLE_ROWS_STORED.toLocaleString()} rows / {MAX_TABLE_COLUMNS}{" "}
              columns of the source.
            </Typography>
          )}
        </Box>
      ) : (
        renderEmpty()
      )}
      {error && (
        <Typography role="alert" sx={{ mt: 1, fontSize: 13, color: "#ff6350" }}>
          {error}
        </Typography>
      )}
    </DataBlockShell>
  );
};

export default TableBlockView;
