import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  InputBase,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  buildClientSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  parse,
  TypeNode,
} from "graphql";
import { graphql as graphqlLanguage } from "cm6-graphql";
import { json as jsonLanguage } from "@codemirror/lang-json";
import { type GraphqlExecution, normalizeEndpoint, shouldIntrospect, useReportConfig } from "../../react";
import { GraphqlBlock, OnOpenMode } from "../../core";
import { useBlockEditor } from "./BlockEditorContext";
import { CodeEditor } from "./CodeEditor";
import { DataBlockShell, monoSx, RunStatusPill } from "./DataBlockShell";
import { dataResultsStore, useDataBlockResult } from "./dataResultsStore";
import { columnLabelSx, displayedResult, ResponsePanel } from "./ResponsePanel";
import { BlockViewProps } from "./types";

const SAVE_DEBOUNCE_MS = 400;
const JSON_EXTENSIONS = [jsonLanguage()];

// Report entity type → the variable name platform queries use for it
const ENTITY_VARIABLES: Record<string, string> = {
  target: "ensemblId",
  disease: "efoId",
  drug: "chemblId",
  variant: "variantId",
  study: "studyId",
};

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, "");

/**
 * Schema per endpoint, loaded once per session via introspection
 */
const schemaCache = new Map<string, Promise<GraphQLSchema | null>>();
const loadSchema = (endpoint: string): Promise<GraphQLSchema | null> => {
  const key = normalizeUrl(endpoint);
  if (!schemaCache.has(key)) {
    schemaCache.set(
      key,
      fetch(key, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: getIntrospectionQuery() }),
      })
        .then((res) => res.json())
        .then((body) => (body?.data ? buildClientSchema(body.data) : null))
        .catch(() => {
          schemaCache.delete(key);
          return null;
        })
    );
  }
  return schemaCache.get(key)!;
};

const isRequiredString = (type: TypeNode) =>
  type.kind === Kind.NON_NULL_TYPE &&
  type.type.kind === Kind.NAMED_TYPE &&
  (type.type.name.value === "String" || type.type.name.value === "ID");

interface QueryInfo {
  error: string | null;
  // Declared String!/ID! variables (candidates for entity binding)
  stringVariables: string[];
  // Non-null variables without a default (must be supplied to run)
  requiredVariables: string[];
}

const analyseQuery = (query: string): QueryInfo => {
  try {
    const doc = parse(query);
    const op = doc.definitions.find(
      (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION
    );
    const defs = op?.variableDefinitions ?? [];
    return {
      error: null,
      stringVariables: defs.filter((d) => isRequiredString(d.type)).map((d) => d.variable.name.value),
      requiredVariables: defs
        .filter((d) => d.type.kind === Kind.NON_NULL_TYPE && !d.defaultValue)
        .map((d) => d.variable.name.value),
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Invalid query",
      stringVariables: [],
      requiredVariables: [],
    };
  }
};

const parseVariables = (text: string): { value: Record<string, unknown> | null; error: string | null } => {
  if (!text.trim()) return { value: {}, error: null };
  try {
    const value = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { value: null, error: "Variables must be a JSON object" };
    }
    return { value, error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
};

type HostExecute = (args: { endpoint: string; query: string; variables: Record<string, unknown> }) => Promise<GraphqlExecution>;

const executeGraphql = async (
  block: GraphqlBlock,
  variables: Record<string, unknown>,
  hostExecute: HostExecute | null
) => {
  const started = performance.now();
  if (hostExecute) {
    // The host's own client (cache, auth) for its own API
    const res = await hostExecute({ endpoint: block.endpoint, query: block.query, variables });
    return { ...res, durationMs: Math.round(performance.now() - started) };
  }
  const response = await fetch(block.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: block.query, variables }),
  });
  const body = await response.json().catch(() => null);
  return {
    data: body,
    errors: body?.errors,
    httpStatus: response.status,
    durationMs: Math.round(performance.now() - started),
    httpError: !response.ok && !body?.errors ? `Request failed with status ${response.status}` : undefined,
  };
};

export const GraphqlBlockView: React.FC<BlockViewProps<GraphqlBlock>> = (props) => {
  const { block, expanded } = props;
  const { report, updateBlock } = useBlockEditor();
  const config = useReportConfig();
  const result = useDataBlockResult(block.reportSectionId);

  const [query, setQuery] = useState(block.query);
  const [varsText, setVarsText] = useState(() => JSON.stringify(block.variables, null, 2));
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setQuery(block.query), [block.query]);

  const queryInfo = useMemo(() => analyseQuery(query), [query]);
  const vars = useMemo(() => parseVariables(varsText), [varsText]);

  const hostExecute = config.graphql.execute ?? null;
  const usesHostClient =
    !!hostExecute &&
    !!config.graphql.appEndpoint &&
    normalizeEndpoint(block.endpoint) === normalizeEndpoint(config.graphql.appEndpoint);
  // Schema for autocomplete + lint is only fetched from endpoints the host vouches for
  const isPlatformEndpoint = shouldIntrospect(config, block.endpoint);

  const entityId = report.entityContext?.id;
  const entityVariable = block.bindEntity?.variable;
  const boundVariables = {
    ...(vars.value ?? {}),
    ...(entityVariable && entityId ? { [entityVariable]: entityId } : {}),
  };
  const missingVariables = queryInfo.requiredVariables.filter(
    (name) =>
      boundVariables[name] === undefined || boundVariables[name] === null || boundVariables[name] === ""
  );
  const runBlocked = !!queryInfo.error || !!vars.error;

  // Schema for autocomplete + lint, platform endpoint only, once expanded
  useEffect(() => {
    if (!expanded || !isPlatformEndpoint) return undefined;
    let cancelled = false;
    loadSchema(block.endpoint).then((s) => !cancelled && setSchema(s));
    return () => {
      cancelled = true;
    };
  }, [expanded, isPlatformEndpoint, block.endpoint]);

  const queryExtensions = useMemo(() => [graphqlLanguage(schema ?? undefined)], [schema]);

  const saveQuery = useCallback(
    (value: string) => {
      clearTimeout(saveTimer.current);
      if (value !== block.query) updateBlock(block.reportSectionId, { query: value });
    },
    [block.query, block.reportSectionId, updateBlock]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveQuery(value), SAVE_DEBOUNCE_MS);
  };

  const handleVarsChange = (value: string) => {
    setVarsText(value);
    const parsed = parseVariables(value);
    if (parsed.value) updateBlock(block.reportSectionId, { variables: parsed.value });
  };

  const run = useCallback(async () => {
    if (runBlocked) return;
    saveQuery(query);
    const id = block.reportSectionId;
    dataResultsStore.set(id, { status: "running", at: Date.now() });
    try {
      const res = await executeGraphql({ ...block, query }, boundVariables, usesHostClient ? hostExecute : null);
      const graphqlErrors = res.errors?.map(
        (e: { message: string; path?: readonly (string | number)[] }) => ({
          message: e.message,
          path: e.path ? [...e.path] : undefined,
        })
      );
      const failed = !!res.httpError || (graphqlErrors?.length ?? 0) > 0;
      dataResultsStore.set(id, {
        status: failed ? "error" : "success",
        data: res.data,
        error: res.httpError ?? (failed ? "The query returned errors." : undefined),
        graphqlErrors,
        httpStatus: res.httpStatus,
        at: Date.now(),
        durationMs: res.durationMs,
      });
    } catch (e) {
      const networkError = e as { networkError?: { statusCode?: number }; message?: string };
      const status = networkError?.networkError?.statusCode;
      dataResultsStore.set(id, {
        status: "error",
        error:
          e instanceof TypeError
            ? "Network error: the endpoint couldn't be reached (it may not allow requests from this site)."
            : `${status ? `${status} · ` : ""}${networkError?.message ?? "Request failed"}`,
        httpStatus: status,
        at: Date.now(),
      });
    }
    // boundVariables is derived each render; the latest values are what we want
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runBlocked, saveQuery, query, block, usesHostClient, hostExecute, JSON.stringify(boundVariables)]);

  // Re-run live on report open, when it can run without more input
  useEffect(() => {
    if (
      block.onOpen === "rerun" &&
      !dataResultsStore.get(block.reportSectionId) &&
      !runBlocked &&
      missingVariables.length === 0
    ) {
      run();
    }
    // Only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleBinding = (checked: boolean) => {
    if (!checked) {
      updateBlock(block.reportSectionId, { bindEntity: undefined });
      return;
    }
    const preferred = ENTITY_VARIABLES[report.entityContext?.type ?? ""];
    const variable = queryInfo.stringVariables.includes(preferred) ? preferred : queryInfo.stringVariables[0];
    if (variable) updateBlock(block.reportSectionId, { bindEntity: { variable } });
  };

  const shown = displayedResult(block, result);
  const bindDisabled = !entityId || queryInfo.stringVariables.length === 0;
  const bindCheckbox = (
    <FormControlLabel
      disabled={bindDisabled}
      control={
        <Checkbox
          size="small"
          checked={!!block.bindEntity && !bindDisabled}
          onChange={(e) => toggleBinding(e.target.checked)}
        />
      }
      label={<Typography sx={{ fontSize: 13 }}>Use this narrative's entity</Typography>}
    />
  );

  return (
    <DataBlockShell
      {...props}
      status={
        <RunStatusPill result={result} snapshot={block.snapshot} showingSnapshot={shown.fromSnapshot} />
      }
      onRun={run}
      running={result?.status === "running"}
      runDisabled={runBlocked}
      downloadData={shown.data}
    >
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            md: "minmax(0,1.2fr) minmax(0,1fr)",
            xl: "minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.4fr)",
          },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={columnLabelSx}>Query</Typography>
          <CodeEditor
            value={query}
            onChange={handleQueryChange}
            onBlur={() => saveQuery(query)}
            onRun={run}
            extensions={queryExtensions}
            ariaLabel="GraphQL query"
            minHeight={220}
          />
          {queryInfo.error && (
            <Typography role="alert" sx={{ ...monoSx, color: "#ff6350", mt: 0.5 }}>
              {queryInfo.error}
            </Typography>
          )}
        </Box>

        <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box>
            <Typography component="label" htmlFor={`endpoint-${block.reportSectionId}`} sx={columnLabelSx}>
              Endpoint
            </Typography>
            <InputBase
              id={`endpoint-${block.reportSectionId}`}
              key={block.endpoint}
              fullWidth
              defaultValue={block.endpoint}
              onBlur={(e) => {
                const endpoint = e.target.value.trim() || config.graphql.defaultEndpoint;
                if (endpoint !== block.endpoint) updateBlock(block.reportSectionId, { endpoint });
              }}
              sx={{
                ...monoSx,
                border: "1px solid",
                borderColor: "grey.300",
                borderRadius: "2px",
                px: 1,
                py: 0.25,
              }}
            />
            <Typography sx={{ fontSize: 11, color: "grey.600", mt: 0.25 }}>
              {usesHostClient
                ? "Runs through the app's API client"
                : isPlatformEndpoint
                  ? config.endpointLabel(block.endpoint)
                  : "Custom endpoint"}
            </Typography>
          </Box>

          <Box>
            <Typography sx={columnLabelSx}>Variables</Typography>
            <CodeEditor
              value={varsText}
              onChange={handleVarsChange}
              onRun={run}
              extensions={JSON_EXTENSIONS}
              ariaLabel="Query variables (JSON)"
              minHeight={80}
              maxHeight={200}
            />
            {vars.error && (
              <Typography role="alert" sx={{ ...monoSx, color: "#ff6350", mt: 0.5 }}>
                {vars.error}
              </Typography>
            )}
            {!vars.error && missingVariables.length > 0 && (
              <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>
                Needs: {missingVariables.map((v) => `$${v}`).join(", ")}
              </Typography>
            )}
          </Box>

          <Box>
            {entityId ? (
              bindCheckbox
            ) : (
              <Tooltip title="This narrative has no entity to bind to">
                <span>{bindCheckbox}</span>
              </Tooltip>
            )}
            {block.bindEntity && !bindDisabled && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 3.5 }}>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {report.entityContext?.id} →
                </Typography>
                <Select
                  size="small"
                  value={
                    queryInfo.stringVariables.includes(block.bindEntity.variable)
                      ? block.bindEntity.variable
                      : ""
                  }
                  displayEmpty
                  onChange={(e) =>
                    updateBlock(block.reportSectionId, { bindEntity: { variable: e.target.value } })
                  }
                  inputProps={{ "aria-label": "Variable to bind" }}
                  sx={{ ...monoSx, height: 28 }}
                >
                  <MenuItem value="" disabled sx={monoSx}>
                    choose variable
                  </MenuItem>
                  {queryInfo.stringVariables.map((v) => (
                    <MenuItem key={v} value={v} sx={monoSx}>
                      ${v}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}
          </Box>

          <Box>
            <Typography sx={columnLabelSx}>On narrative open</Typography>
            <RadioGroup
              value={block.onOpen}
              onChange={(e) => updateBlock(block.reportSectionId, { onOpen: e.target.value as OnOpenMode })}
            >
              <FormControlLabel
                value="rerun"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: 13 }}>Re-run live</Typography>}
              />
              <FormControlLabel
                value="snapshot"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: 13 }}>Keep the saved snapshot</Typography>}
              />
            </RadioGroup>
          </Box>
        </Box>

        <Box sx={{ minWidth: 0, gridColumn: { md: "1 / -1", xl: "auto" } }}>
          <ResponsePanel block={block} result={result} onRetry={run} />
        </Box>
      </Box>
    </DataBlockShell>
  );
};

export default GraphqlBlockView;
