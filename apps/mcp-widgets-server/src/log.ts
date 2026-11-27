/**
 * Structured logging. Each entry is one JSON line on stdout, which Cloud Logging parses
 * into jsonPayload (with `severity` and `message` mapped to the entry's own fields), so
 * log-based metrics can count and time tool calls per tool and per client.
 *
 * Never log tool arguments or entity IDs: only which tool ran, for which client, how long
 * it took and whether it worked.
 *
 * Locally (LOG_FORMAT unset and stdout a TTY) entries print as readable text instead.
 */

type Severity = "DEBUG" | "INFO" | "WARNING" | "ERROR";

const json = process.env.LOG_FORMAT === "json" || !process.stdout.isTTY;

export function log(severity: Severity, message: string, fields: Record<string, unknown> = {}) {
  if (json) {
    process.stdout.write(`${JSON.stringify({ severity, message, ...fields })}\n`);
    return;
  }
  const extra = Object.keys(fields).length ? ` ${JSON.stringify(fields)}` : "";
  const line = `[${severity.toLowerCase()}] ${message}${extra}`;
  (severity === "ERROR" ? console.error : console.log)(line);
}

/** For Error Reporting to group an error, its stack trace has to be in `message`. */
export function logError(message: string, err: unknown, fields: Record<string, unknown> = {}) {
  const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);
  log("ERROR", `${message}\n${stack}`, fields);
}
