/**
 * Stubs for platform-specific ui package exports.
 *
 * HeatmapTable (and HeatmapLegend) import from the "ui" barrel index
 * which pulls in React Router, OtAsyncTooltip, and other platform deps
 * that don't make sense in a standalone iframe widget.
 *
 * This stub file replaces those imports at build time (via the stubUiBarrel
 * Vite plugin in vite.widget.config.ts).
 */
import type { ReactNode } from "react";

/** Link: opens OT platform pages in a new tab, or follows external URLs */
export function Link({
  to,
  children,
}: {
  to?: string;
  children?: ReactNode;
  external?: boolean;
  asyncTooltip?: boolean;
  newTab?: boolean;
  footer?: boolean;
  tooltip?: unknown;
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
}) {
  const href =
    !to ? "#" : to.startsWith("/") ? `https://platform.opentargets.org${to}` : to;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

/** DataDownloader: disabled in the widget (no export button) */
export function DataDownloader() {
  return null;
}

// Real ObsPlot / ObsChart / ObsTooltip — needed for waterfall charts in cell
// popovers and detail modals. Imported directly (bypass barrel).
export { default as ObsPlot } from "@ot/ui/components/ObsPlot/ObsPlot";
export { default as ObsChart } from "@ot/ui/components/ObsPlot/ObsChart";
export { default as ObsTooltip } from "@ot/ui/components/ObsPlot/ObsTooltip";

/** Tooltip: renders children only (no help icon / tooltip popup) */
export function Tooltip({ children }: { children?: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

/** OtAsyncTooltip: renders children only */
export function OtAsyncTooltip({ children }: { children?: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

/** TooltipTable: renders a table container for tooltip content */
export function TooltipTable({ children }: { children?: ReactNode }) {
  return (
    <table style={{ borderSpacing: "0 0.4rem", width: "100%" }}>
      <tbody>{children}</tbody>
    </table>
  );
}

/** TooltipRow: renders a labeled row for tooltip content */
export function TooltipRow({
  label,
  children,
}: {
  label?: string;
  children?: ReactNode;
  valueWidth?: number;
  truncateValue?: boolean;
}) {
  return (
    <tr>
      {label !== undefined && (
        <td
          style={{
            fontSize: 13,
            fontWeight: 600,
            paddingRight: 8,
            verticalAlign: "top",
            whiteSpace: "nowrap",
            color: "#718096",
          }}
        >
          {label}:
        </td>
      )}
      <td>{children}</td>
    </tr>
  );
}

/** ScientificNotation: renders a number in scientific notation */
export function ScientificNotation({
  number,
  dp = 2,
}: {
  number?: number | [number, number];
  dp?: number;
  [key: string]: unknown;
}) {
  if (number == null) return null;
  if (Array.isArray(number)) {
    const [mantissa, exponent] = number;
    return (
      <span>
        {mantissa.toFixed(dp)} × 10<sup>{exponent}</sup>
      </span>
    );
  }
  if (number === 0) return <span>0</span>;
  const exp = Math.floor(Math.log10(Math.abs(number)));
  const mant = (number / Math.pow(10, exp)).toFixed(dp);
  return (
    <span>
      {mant} × 10<sup>{exp}</sup>
    </span>
  );
}

/** DisplayVariantId: shows a short variant ID label */
export function DisplayVariantId({
  variantId,
  referenceAllele,
  alternateAllele,
  maxChars = 6,
}: {
  variantId?: string;
  referenceAllele?: string;
  alternateAllele?: string;
  expand?: boolean;
  maxChars?: number;
}) {
  if (!variantId) return null;
  const ref = referenceAllele && referenceAllele.length > maxChars ? "DEL" : referenceAllele;
  const alt = alternateAllele && alternateAllele.length > maxChars ? "INS" : alternateAllele;
  const display = ref && alt ? `${ref}/${alt}` : variantId;
  return <span>{display}</span>;
}

/** Navigate: renders a "View →" link to an OT platform page */
export function Navigate({ to }: { to?: string }) {
  const href = !to ? "#" : to.startsWith("/") ? `https://platform.opentargets.org${to}` : to;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      View →
    </a>
  );
}

/** ClinvarStars: renders a star rating (★ filled, ☆ empty) */
export function ClinvarStars({ num = 0, length = 4 }: { num?: number; length?: number }) {
  const stars = Array.from({ length }, (_, i) => (i < num ? "★" : "☆")).join("");
  return <span style={{ color: "#FFC107", letterSpacing: 1 }}>{stars}</span>;
}

/** L2GScoreIndicator: renders the L2G score as tabular text */
export function L2GScoreIndicator({
  score,
}: {
  score?: number;
  studyLocusId?: string;
  targetId?: string;
}) {
  if (score == null) return null;
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{score.toFixed(3)}</span>;
}

/** SummaryItem: not used in widget context — no-op stub */
export function SummaryItem() {
  return null;
}

/** SectionItem: real component — shows full section chrome (title, description, body) */
export { default as SectionItem } from "@ot/ui/components/Section/SectionItem";

/** HeatmapTable: real component from @ot/ui (direct path, bypassing barrel) */
export { default as HeatmapTable } from "@ot/ui/components/HeatmapTable/HeatmapTable";

/** OtTable: real component from @ot/ui (direct path, bypassing barrel) */
export { default as OtTable } from "@ot/ui/components/OtTable/OtTable";

/** useBatchQuery: real hook from @ot/ui (direct path, bypassing barrel) */
export { default as useBatchQuery } from "@ot/ui/hooks/useBatchQuery";

/** Clinical Indications components — direct paths bypass the ui barrel */
export { default as useClinicalReportsMasterDetail } from "@ot/ui/hooks/useClinicalReportsMasterDetail";
export { default as RecordsCards } from "@ot/ui/components/ClinicalReports/RecordsCards";
export { default as ClinicalReportsMasterDetailFrame } from "@ot/ui/components/ClinicalReports/ClinicalReportsMasterDetailFrame";
export { default as ClinicalRecordDrawer } from "@ot/ui/components/ClinicalReports/ClinicalRecordDrawer";

/** usePlatformApi: returns null — fragments are not needed inside the widget */
export function usePlatformApi() {
  return null;
}

/** useApolloClient: standard Apollo client from the widget's ApolloProvider */
export { useApolloClient } from "@apollo/client";

// ── Real components (direct paths, bypass barrel) ────────────────────────────
export { default as ChipList } from "@ot/ui/components/ChipList";
export { default as SectionLoader } from "@ot/ui/components/Section/SectionLoader";
export { default as DirectionOfEffectIcon } from "@ot/ui/components/DirectionOfEffectIcon";
export { default as DirectionOfEffectTooltip } from "@ot/ui/components/DirectionOfEffectTooltip";
export { default as OtTableSSP } from "@ot/ui/components/OtTable/OtTableSSP";
export { default as DataTable } from "@ot/ui/components/Table/DataTable";
export { default as Table } from "@ot/ui/components/Table/Table";
export { default as TableDrawer } from "@ot/ui/components/Table/TableDrawer";
export { default as DirectionalityDrawer } from "@ot/ui/components/DirectionalityDrawer";
export { default as EllsWrapper } from "@ot/ui/components/EllsWrapper";
export { default as ErrorBoundary } from "@ot/ui/components/ErrorBoundary";
/** FacetsSelect: no-op stub (only used in excluded sections) */
export function FacetsSelect() {
  return null;
}
export { default as useDebounce } from "@ot/ui/hooks/useDebounce";
export { default as LabelChip } from "@ot/ui/components/LabelChip";
export { default as Legend } from "@ot/ui/components/Legend";
export { default as LongText } from "@ot/ui/components/LongText";
export { default as MouseModelAllelicComposition } from "@ot/ui/components/MouseModelAllelicComposition";
export { default as TooltipStyledLabel } from "@ot/ui/components/TooltipStyledLabel";
export { PaginationActionsComplete } from "@ot/ui/components/Table/TablePaginationActions";
export { getPage } from "@ot/ui/components/Table/utils";
export { default as PublicationSummaryLabel } from "@ot/ui/components/PublicationsDrawer/PublicationSummaryLabel";
export { default as PublicationWrapper } from "@ot/ui/components/PublicationsDrawer/PublicationWrapper";
export { default as SummaryLoader } from "@ot/ui/components/PublicationsDrawer/SummaryLoader";
export { default as useBatchDownloader } from "@ot/ui/hooks/useBatchDownloader";
export { useConfigContext } from "@ot/ui/providers/ConfigurationProvider";

// ── Viewer stubs (3D viewer sections are excluded; these prevent missing-export errors) ─
export function ViewerProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; }
export function ViewerInteractionProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; }
export function useViewerState() { return {}; }
export function useViewerDispatch() { return () => {}; }
export function useViewerInteractionState() { return {}; }
export function useViewerInteractionDispatch() { return () => {}; }
export function ViewerLegend() { return null; }
export function DetailPopover({ children }: { children?: React.ReactNode }) { return <>{children}</>; }

/** DownloadSvgPlot: renders the plot content, omits download controls */
export function DownloadSvgPlot({
  children,
  center,
}: {
  children?: React.ReactNode;
  center?: React.ReactNode;
  [key: string]: unknown;
}) {
  return (
    <>
      {center}
      {children}
    </>
  );
}

/** PublicationsDrawer: renders a simple link to the first publication entry */
export function PublicationsDrawer({
  entries,
  customLabel,
}: {
  entries?: { name?: string; url?: string }[];
  customLabel?: string;
  [key: string]: unknown;
}) {
  const first = entries?.[0];
  if (!first?.url) return null;
  return (
    <a href={first.url} target="_blank" rel="noreferrer">
      {customLabel ?? first.name ?? first.url}
    </a>
  );
}
