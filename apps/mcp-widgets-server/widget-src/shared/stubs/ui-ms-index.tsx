import React from "react";

// ---- Viewer providers and hooks (real — context must be shared across all components) ----
export {
  ViewerProvider,
  useViewerState,
  useViewerDispatch,
} from "@ot/ui/providers/ViewerProvider";
export {
  ViewerInteractionProvider,
  useViewerInteractionState,
  useViewerInteractionDispatch,
} from "@ot/ui/providers/ViewerInteractionProvider";

// ---- Real viewer components (direct path imports) ----
export { default as Viewer } from "@ot/ui/components/Viewer/Viewer";
export { default as ViewerRadios } from "@ot/ui/components/Viewer/ViewerRadios";
export { default as ViewerDropdown } from "@ot/ui/components/Viewer/ViewerDropdown";
export { default as ViewerLegend } from "@ot/ui/components/Viewer/ViewerLegend";
export { default as DetailPopover } from "@ot/ui/components/DetailPopover";
export { default as CompactAlphaFoldLegend } from "@ot/ui/components/Viewer/CompactAlphaFoldLegend";
export { default as CompactAlphaFoldPathogenicityLegend } from "@ot/ui/components/Viewer/CompactAlphaFoldPathogenicityLegend";
export { default as CompactAlphaFoldDomainLegend } from "@ot/ui/components/Viewer/CompactAlphaFoldDomainLegend";
export { default as CompactAlphaFoldHydrophobicityLegend } from "@ot/ui/components/Viewer/CompactAlphaFoldHydrophobicityLegend";

// ---- Shared widget stubs (reused from the main ui stub) ----
export { SectionItem, SummaryItem, DisplayVariantId, usePlatformApi, useBatchQuery } from "./ui-index";

// ---- Stubs ----

export function Link({ children, to }: { children: React.ReactNode; to: string }) {
  return (
    <a href={to} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function DataDownloader() {
  return null;
}
export function ObsPlot() {
  return null;
}
export function ObsChart() {
  return null;
}
export function ObsTooltip() {
  return null;
}
export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function OtAsyncTooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Sequence track — not needed in the standalone widget
export function ViewerTrack() {
  return null;
}
