/**
 * Message protocol between the Report Builder host and the notebook sandbox.
 * Shared (as types) by packages/ui and the runtime bundle.
 */

export const PROTOCOL_VERSION = 1 as const;

export type NotebookErrorKind = "syntax" | "runtime" | "timeout" | "input" | "output";

export interface NotebookError {
  kind: NotebookErrorKind;
  message: string;
  // Mapped back to the user's code (1-based)
  line?: number;
  column?: number;
  // For kind "input": the ref that could not be resolved
  inputRef?: string;
}

export type NotebookOutputType = "dom" | "data" | "value" | "both" | "none";

export interface NotebookTheme {
  fontFamily: string;
  text: string;
  primary: string;
  secondary: string;
  palette: string[];
}

export interface NotebookColumn {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "date" | "object";
}

interface Envelope {
  v: typeof PROTOCOL_VERSION;
  blockId: string;
  runId: number;
}

// ---------- host → sandbox ----------

export type HostMessage = Envelope &
  (
    | {
        type: "run";
        code: string;
        inputs: Record<string, unknown>;
        width: number;
        height: number;
        theme: NotebookTheme;
      }
    | { type: "resize"; width: number }
    | { type: "serialize"; format: "svg" | "png"; scale: number }
    | { type: "dispose" }
  );

// ---------- sandbox → host ----------

export type SandboxMessage = Envelope &
  (
    | { type: "ready"; runtimeVersion: string }
    | { type: "started" }
    | { type: "log"; level: "log" | "info" | "warn" | "error"; args: string[] }
    | { type: "rendered"; outputType: NotebookOutputType; contentHeight: number; readsWidth: boolean }
    | { type: "value"; value: unknown }
    | { type: "error"; error: NotebookError }
    | { type: "serialized"; format: "svg" | "png"; data: string | null; width: number; height: number }
    | { type: "height"; contentHeight: number }
  );

export const isSandboxMessage = (data: unknown): data is SandboxMessage =>
  typeof data === "object" &&
  data !== null &&
  (data as { v?: unknown }).v === PROTOCOL_VERSION &&
  typeof (data as { type?: unknown }).type === "string" &&
  typeof (data as { blockId?: unknown }).blockId === "string" &&
  typeof (data as { runId?: unknown }).runId === "number";

export const isHostMessage = (data: unknown): data is HostMessage => isSandboxMessage(data);

/** Names user code can rely on besides its inputs. Refs may not shadow these. */
export const NOTEBOOK_GLOBALS = [
  "d3",
  "Plot",
  "width",
  "height",
  "html",
  "svg",
  "invalidation",
  "log",
  "theme",
] as const;

export type NotebookGlobal = (typeof NOTEBOOK_GLOBALS)[number];

/** Synchronous budget per run slice before the loop guard trips. */
export const LOOP_BUDGET_MS = 2000;
/** The host expects `rendered` or `error` within this long of sending `run`. */
export const WATCHDOG_MS = 15000;
/** Data returns larger than this fail with kind "output". */
export const MAX_OUTPUT_ROWS = 50000;
export const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
/** Auto-sized output frames never grow past this. */
export const MAX_AUTO_HEIGHT = 900;
