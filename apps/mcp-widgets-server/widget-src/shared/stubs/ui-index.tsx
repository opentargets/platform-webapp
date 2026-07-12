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
import { Box } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightToBracket } from "@fortawesome/free-solid-svg-icons";
import { getConfig } from "@ot/config";

/**
 * Link: `@ot/ui/components/Link/Link` (the real component's own module path) is
 * intercepted at the Vite-plugin level (createPlatformStubsPlugin, widget.config.base.ts)
 * to force external-only, openLink()-routed navigation — that covers this barrel import
 * AND the several real components that import Link via a relative path instead
 * (PublicationWrapper.tsx, Footer.tsx), which would otherwise bypass a stub living only
 * in this file. Re-exported here just to satisfy the "ui" barrel surface.
 */
import Link from "@ot/ui/components/Link/Link";
export { Link };

/**
 * Navigate: mirrors packages/ui/src/components/Navigate.tsx exactly, but composed
 * with the Link above instead of importing the real component directly — the real
 * Navigate.tsx imports Link via a relative path ("./Link"), which (before the
 * plugin-level interception above) would have bypassed a stub living only in this file.
 */
export function Navigate({ to }: { to?: string }) {
  return (
    <Link asyncTooltip to={to}>
      <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
        View
        <FontAwesomeIcon size="sm" icon={faArrowRightToBracket} />
      </Box>
    </Link>
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

// ClinvarStars is a pure presentational component (no navigation/routing
// dependency), so it's reused directly — no adapter needed.
export { default as ClinvarStars } from "@ot/ui/components/ClinvarStars";

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

/**
 * usePlatformApi: in the real app, calling this with no fragment (as MolecularInteractions
 * Body.tsx does — the only live caller across all migrated sections, confirmed via
 * repo-wide grep) returns the raw PlatformApiContext: the *entire* already-fetched target
 * profile page query, cached by a page-level provider the widget has no equivalent of
 * (that whole-page prefetch architecture was removed — see [[project-mcp-server-review]]).
 *
 * MolecularInteractions passes this straight through as SectionItem's `request` prop.
 * SectionItem gates ALL rendering on `definition.hasData(data[entity])`, which for this
 * section checks `data.interactions?.count > 0` — an empty/null data object makes
 * SectionItem decide there's "no data" and return null, so the section would never
 * render for any target. Returning a truthy `interactions.count` here just lets the
 * *real* per-tab gating take over: each of the 4 tabs (Intact/Signor/Reactome/String)
 * independently re-fetches and checks its own real count via client.query. The only
 * cost is a target with truly zero interactions across all 4 sources shows an
 * all-disabled-tabs section instead of no section at all — a minor degradation, not
 * a correctness bug for the vast majority of targets that do have some data.
 *
 * If usePlatformApi() ever gets a second caller with a different `hasData` shape,
 * this hardcoded shape will need revisiting — it's tailored to this one call site.
 */
export function usePlatformApi() {
  return {
    loading: false,
    error: undefined,
    data: { target: { interactions: { count: 1 } } },
  };
}

/** useApolloClient: standard Apollo client from the widget's ApolloProvider */
export { useApolloClient } from "@apollo/client";

// ── Real components (direct paths, bypass barrel) ────────────────────────────
export { default as ChipList } from "@ot/ui/components/ChipList";
export { default as SectionLoader } from "@ot/ui/components/Section/SectionLoader";
export { default as OtGenomicLocation } from "@ot/ui/components/GenomicLocation";
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
/**
 * useConfigContext: the widget has no <OTConfigurationProvider> ancestor (that provider
 * throws without a real Config object, and also wires up a second Apollo client/theme/API
 * metadata provider the widget doesn't need). Real config is still available via getConfig()
 * from @ot/config — the same window.configProfile-based resolution createWidgetEntry.tsx
 * already uses for `theme` — so components reading config.profile.* (PartnerLockIcon,
 * SwissbioViz) get real values. urlAiApi resolves empty (no AI backend wired for the widget),
 * which keeps AI-summary features (PublicationWrapper/Publication) off rather than crashing.
 */
export function useConfigContext() {
  return { config: getConfig() };
}

// ── Viewer stubs ───────────────────────────────────────────────────────────────
// ViewerProvider/useViewerState etc. only carry real shared state in the manual
// molecular-structure widget, which uses its own ui-ms-index.tsx stub with the real
// versions instead of these. Sections that reference these hooks without that
// provider (e.g. target/MolecularStructure's Viewer.tsx, which manages its own local
// state and doesn't need shared viewer context) get inert values here — their own
// code already handles the "no provider" case gracefully (see ViewerLegend.tsx).
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
