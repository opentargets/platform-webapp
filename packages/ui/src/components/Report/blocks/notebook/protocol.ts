/**
 * Message types shared with the sandbox runtime (packages/notebook-runtime).
 * The runtime bundle is built separately; only types cross this boundary.
 */
export type {
  HostMessage,
  SandboxMessage,
  NotebookColumn,
  NotebookError,
  NotebookErrorKind,
  NotebookOutputType,
  NotebookTheme,
  NotebookGlobal,
} from "notebook-runtime/src/protocol";
export {
  PROTOCOL_VERSION,
  NOTEBOOK_GLOBALS,
  isSandboxMessage,
  WATCHDOG_MS,
  LOOP_BUDGET_MS,
  MAX_AUTO_HEIGHT,
} from "notebook-runtime/src/protocol";

export const RUNTIME_URL = "/notebook-runtime/index.html";

/** Height of the code and output panes (px); taller content scrolls inside them. */
export const PANE_HEIGHT = 400;
/** Min height of the pane header rows (Code / Output), so the two pane bodies start level. */
export const PANE_HEADER_HEIGHT = 28;
