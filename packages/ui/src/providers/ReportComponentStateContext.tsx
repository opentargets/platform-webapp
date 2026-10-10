/**
 * The widget state bag binding now lives in report-builder; re-exported so the
 * `ui` import paths sections and the app use keep working.
 */
export {
  ReportComponentStateContext,
  ReportComponentStateProvider,
  useReportComponentState,
  useReportState,
} from "report-builder";
export type { ReportComponentStateContextValue } from "report-builder";
