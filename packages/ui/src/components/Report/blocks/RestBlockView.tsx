import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputBase,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faLockOpen, faXmark } from "@fortawesome/free-solid-svg-icons";
import { json as jsonLanguage } from "@codemirror/lang-json";
import { KeyValue, OnOpenMode, RestBlock } from "../../../types/report";
import { useBlockEditor } from "./BlockEditorContext";
import { CodeEditor } from "./CodeEditor";
import { DataBlockShell, monoSx, RunStatusPill } from "./DataBlockShell";
import { dataResultsStore, useDataBlockResult } from "./dataResultsStore";
import { columnLabelSx, displayedResult, ResponsePanel } from "./ResponsePanel";
import { BlockViewProps } from "./types";

const TIMEOUT_MS = 30_000;
const JSON_EXTENSIONS = [jsonLanguage()];
const CORS_MESSAGE =
  "The server didn't allow a request from this site (CORS). Try the platform API, or an endpoint that allows browser requests.";

const fieldSx = {
  ...monoSx,
  border: "1px solid",
  borderColor: "grey.300",
  borderRadius: "2px",
  px: 1,
  py: 0.25,
} as const;

const splitUrl = (url: string): { base: string; params: KeyValue[] } => {
  const [base, ...rest] = url.split("?");
  const search = rest.join("?");
  const params = search
    ? Array.from(new URLSearchParams(search).entries()).map(([key, value]) => ({ key, value }))
    : [];
  return { base, params };
};

const joinUrl = (base: string, params: KeyValue[]): string => {
  const search = new URLSearchParams(params.filter((p) => p.key).map((p) => [p.key, p.value])).toString();
  return search ? `${base}?${search}` : base;
};

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

const isTrustedHost = (host: string) => host === "opentargets.org" || host.endsWith(".opentargets.org");

// In-flight requests, so Cancel works even if the row re-mounts
const inFlight = new Map<string, AbortController>();

interface KeyValueTableProps {
  label: string;
  rows: (KeyValue & { secret?: boolean })[];
  onChange: (rows: (KeyValue & { secret?: boolean })[]) => void;
  allowSecret?: boolean;
}

const KeyValueTable: React.FC<KeyValueTableProps> = ({ label, rows, onChange, allowSecret }) => {
  const update = (i: number, patch: Partial<KeyValue & { secret?: boolean }>) =>
    onChange(rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <Box>
      <Typography sx={columnLabelSx}>{label}</Typography>
      {rows.map((row, i) => (
        <Box key={i} sx={{ display: "flex", gap: 0.5, alignItems: "center", mb: 0.5 }}>
          <InputBase
            value={row.key}
            placeholder="key"
            onChange={(e) => update(i, { key: e.target.value })}
            inputProps={{ "aria-label": `${label} ${i + 1} key` }}
            sx={{ ...fieldSx, flex: 1, minWidth: 0 }}
          />
          <InputBase
            value={row.value}
            placeholder={row.secret ? "secret (not saved)" : "value"}
            type={row.secret ? "password" : "text"}
            onChange={(e) => update(i, { value: e.target.value })}
            inputProps={{ "aria-label": `${label} ${i + 1} value` }}
            sx={{ ...fieldSx, flex: 1.4, minWidth: 0 }}
          />
          {allowSecret && (
            <Tooltip title={row.secret ? "Secret: kept in memory only, never saved" : "Mark as secret"}>
              <IconButton
                size="small"
                aria-label={row.secret ? "Unmark secret" : "Mark as secret"}
                aria-pressed={!!row.secret}
                onClick={() => update(i, { secret: !row.secret })}
                sx={{ fontSize: 12, color: row.secret ? "primary.dark" : "grey.500" }}
              >
                <FontAwesomeIcon icon={row.secret ? faLock : faLockOpen} />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            size="small"
            aria-label={`Remove ${label.toLowerCase()} ${row.key || i + 1}`}
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            sx={{ fontSize: 12, color: "grey.500" }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </IconButton>
        </Box>
      ))}
      <Button
        size="small"
        onClick={() => onChange([...rows, { key: "", value: "" }])}
        sx={{ textTransform: "none", px: 0.5 }}
      >
        + Add {label.toLowerCase().replace(/s$/, "")}
      </Button>
    </Box>
  );
};

export const RestBlockView: React.FC<BlockViewProps<RestBlock>> = (props) => {
  const { block } = props;
  const { updateBlock } = useBlockEditor();
  const result = useDataBlockResult(block.reportSectionId);
  const [url, setUrl] = useState(block.url);
  const [body, setBody] = useState(block.body ?? "");
  const [secretPrompt, setSecretPrompt] = useState<Record<number, string> | null>(null);
  const latest = useRef(block);
  latest.current = block;

  useEffect(() => setUrl(block.url), [block.url]);

  const commitUrl = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === block.url) return;
    updateBlock(block.reportSectionId, { url: trimmed, params: splitUrl(trimmed).params });
  };

  const setParams = (params: KeyValue[]) => {
    const next = joinUrl(splitUrl(url).base, params);
    setUrl(next);
    updateBlock(block.reportSectionId, { params, url: next });
  };

  const execute = useCallback(async (target: RestBlock) => {
    const id = target.reportSectionId;
    const controller = new AbortController();
    inFlight.get(id)?.abort();
    inFlight.set(id, controller);
    const timeout = setTimeout(() => controller.abort("timeout"), TIMEOUT_MS);
    const started = performance.now();
    dataResultsStore.set(id, { status: "running", at: Date.now() });

    try {
      const headers = new Headers();
      target.headers.filter((h) => h.key).forEach((h) => headers.set(h.key, h.value));
      if (target.method === "POST" && target.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      const response = await fetch(target.url, {
        method: target.method,
        headers,
        body: target.method === "POST" ? target.body || undefined : undefined,
        signal: controller.signal,
      });
      const durationMs = Math.round(performance.now() - started);
      const contentType = response.headers.get("content-type") ?? "";
      const text = await response.text();
      let data: unknown;
      let rawText: string | undefined;
      if (/json/i.test(contentType)) {
        try {
          data = JSON.parse(text);
        } catch {
          rawText = text;
        }
      } else {
        rawText = text;
      }
      dataResultsStore.set(id, {
        status: response.ok ? "success" : "error",
        data,
        rawText,
        error: response.ok
          ? undefined
          : `The server responded ${response.status} ${response.statusText}`.trim(),
        httpStatus: response.status,
        at: Date.now(),
        durationMs,
      });
    } catch (e) {
      const aborted = controller.signal.aborted;
      dataResultsStore.set(id, {
        status: "error",
        error: aborted
          ? controller.signal.reason === "timeout"
            ? "The request timed out after 30 seconds."
            : "Request cancelled."
          : // A fetch that fails with no response is almost always CORS
            e instanceof TypeError
            ? CORS_MESSAGE
            : e instanceof Error
              ? e.message
              : "Request failed",
        at: Date.now(),
      });
    } finally {
      clearTimeout(timeout);
      if (inFlight.get(id) === controller) inFlight.delete(id);
    }
  }, []);

  /**
   * Run after the checks: valid URL, host confirmed, secrets supplied
   */
  const run = useCallback(
    (options: { interactive?: boolean } = { interactive: true }) => {
      const current = latest.current;
      const host = hostOf(current.url);
      if (!host) {
        dataResultsStore.set(current.reportSectionId, {
          status: "error",
          error: "Enter a full URL, e.g. https://api.example.org/items",
          at: Date.now(),
        });
        return;
      }
      if (!isTrustedHost(host) && !current.confirmedHost?.includes(host)) {
        if (!options.interactive) return;
        if (!window.confirm(`Send a request to ${host}? The report will store this URL.`)) return;
        updateBlock(current.reportSectionId, { confirmedHost: [...(current.confirmedHost ?? []), host] });
      }
      const missingSecrets = current.headers
        .map((h, i) => (h.secret && h.key && !h.value ? i : -1))
        .filter((i) => i !== -1);
      if (missingSecrets.length > 0) {
        if (options.interactive) setSecretPrompt(Object.fromEntries(missingSecrets.map((i) => [i, ""])));
        return;
      }
      execute(current);
    },
    [execute, updateBlock]
  );

  // Re-run on report open only when set to, and only if no prompt would be needed
  useEffect(() => {
    if (block.onOpen === "rerun" && !dataResultsStore.get(block.reportSectionId)) run({ interactive: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitSecrets = () => {
    if (!secretPrompt) return;
    const headers = block.headers.map((h, i) => (i in secretPrompt ? { ...h, value: secretPrompt[i] } : h));
    setSecretPrompt(null);
    // Secret values stay in memory: serializeReports blanks them before saving
    updateBlock(block.reportSectionId, { headers });
    execute({ ...block, headers });
  };

  const shown = displayedResult(block, result);
  const running = result?.status === "running";
  const host = hostOf(block.url);

  return (
    <DataBlockShell
      {...props}
      status={
        <RunStatusPill result={result} snapshot={block.snapshot} showingSnapshot={shown.fromSnapshot} />
      }
      onRun={() => run()}
      onCancel={() => inFlight.get(block.reportSectionId)?.abort("cancel")}
      running={running}
      runDisabled={!block.url}
      downloadData={shown.data ?? shown.rawText}
      // Mounted even when collapsed, so Run from the header can still prompt
      hiddenInputs={
        <Dialog open={!!secretPrompt} onClose={() => setSecretPrompt(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Secret header values</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Secret values aren't saved with the report. Enter them for this session.
            </Typography>
            {secretPrompt &&
              Object.keys(secretPrompt).map((key) => {
                const i = Number(key);
                return (
                  <TextField
                    key={i}
                    autoFocus={i === Number(Object.keys(secretPrompt)[0])}
                    type="password"
                    size="small"
                    label={block.headers[i]?.key}
                    value={secretPrompt[i]}
                    onChange={(e) => setSecretPrompt({ ...secretPrompt, [i]: e.target.value })}
                  />
                );
              })}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSecretPrompt(null)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={submitSecrets}
              disabled={!secretPrompt || Object.values(secretPrompt).some((v) => !v)}
            >
              Run
            </Button>
          </DialogActions>
        </Dialog>
      }
    >
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "minmax(0,1fr)", xl: "minmax(0,1.3fr) minmax(0,1.4fr)" },
        }}
      >
        <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box>
            <Typography sx={columnLabelSx}>Request</Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Select
                size="small"
                value={block.method}
                onChange={(e) =>
                  updateBlock(block.reportSectionId, { method: e.target.value as RestBlock["method"] })
                }
                inputProps={{ "aria-label": "HTTP method" }}
                sx={{ ...monoSx, height: 30, flexShrink: 0 }}
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
              </Select>
              <InputBase
                fullWidth
                value={url}
                placeholder="https://api.example.org/items?limit=10"
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => commitUrl(url)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    commitUrl(url);
                    setTimeout(() => run());
                  }
                }}
                inputProps={{ "aria-label": "Request URL" }}
                sx={{ ...fieldSx, height: 30 }}
              />
            </Box>
            {host && !isTrustedHost(host) && (
              <Typography sx={{ fontSize: 11, color: "grey.600", mt: 0.25 }}>
                External host
                {block.confirmedHost?.includes(host)
                  ? " · confirmed"
                  : " · you'll be asked to confirm on first run"}
              </Typography>
            )}
          </Box>

          <KeyValueTable label="Params" rows={block.params} onChange={setParams} />
          <KeyValueTable
            label="Headers"
            rows={block.headers}
            allowSecret
            onChange={(headers) => updateBlock(block.reportSectionId, { headers })}
          />

          {block.method === "POST" && (
            <Box>
              <Typography sx={columnLabelSx}>Body</Typography>
              <CodeEditor
                value={body}
                onChange={setBody}
                onBlur={() => body !== (block.body ?? "") && updateBlock(block.reportSectionId, { body })}
                onRun={() => {
                  updateBlock(block.reportSectionId, { body });
                  setTimeout(() => run());
                }}
                extensions={JSON_EXTENSIONS}
                ariaLabel="Request body (JSON)"
                minHeight={100}
                maxHeight={240}
              />
            </Box>
          )}

          <Box>
            <Typography sx={columnLabelSx}>On report open</Typography>
            <RadioGroup
              value={block.onOpen}
              onChange={(e) => updateBlock(block.reportSectionId, { onOpen: e.target.value as OnOpenMode })}
            >
              <FormControlLabel
                value="snapshot"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: 13 }}>Keep the saved snapshot</Typography>}
              />
              <FormControlLabel
                value="rerun"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: 13 }}>Re-run live</Typography>}
              />
            </RadioGroup>
          </Box>
        </Box>

        <ResponsePanel block={block} result={result} onRetry={() => run()} />
      </Box>
    </DataBlockShell>
  );
};

export default RestBlockView;
