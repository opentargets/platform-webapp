import { useEffect, useRef } from "react";
import { Box, Skeleton, useTheme } from "@mui/material";
import * as Plot from "@observablehq/plot";
import AssocTooltip from "./AssocTooltip";
import { useAotfQueryState } from "../../context/AssociationsQueryContext";
import {
  FocusActionType,
  FocusElementTable,
  useAssociationsFocus,
  useAssociationsFocusDispatch,
} from "../../context/AssociationsFocusContext";

type TimeSeriesPoint = { year: number; novelty: number };

type NoveltySparklineProps = {
  data: TimeSeriesPoint[];
};

function NoveltySparkline({ data }: NoveltySparklineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  useEffect(() => {
    if (!ref.current || !data.length) return;

    const color = theme.palette.primary.main;
    const gradientId = "novelty-sparkline-gradient";

    const plot = Plot.plot({
      width: 60,
      height: 32,
      margin: 2,
      style: { width: "100%", overflow: "visible", background: "none" },
      x: { axis: null },
      y: { axis: null, domain: [0, 1] },
      marks: [
        Plot.areaY(data, {
          x: "year",
          y: "novelty",
          fill: `url(#${gradientId})`,
        }),
        Plot.line(data, {
          x: "year",
          y: "novelty",
          stroke: color,
          strokeWidth: 2,
        }),
      ],
    });

    // Vertical gradient: opaque at top → transparent at baseline
    const ns = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(ns, "defs");
    const gradient = document.createElementNS(ns, "linearGradient");
    gradient.setAttribute("id", gradientId);
    gradient.setAttribute("x1", "0");
    gradient.setAttribute("y1", "0");
    gradient.setAttribute("x2", "0");
    gradient.setAttribute("y2", "1");
    const stop1 = document.createElementNS(ns, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", color);
    stop1.setAttribute("stop-opacity", "0.3");
    const stop2 = document.createElementNS(ns, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", color);
    stop2.setAttribute("stop-opacity", "0");
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    plot.prepend(defs);

    ref.current.appendChild(plot);

    // Draw-in animation
    const paths = plot.querySelectorAll<SVGPathElement>("path");
    if (paths.length >= 2) {
      const linePath = paths[paths.length - 1];
      const areaPath = paths[0];
      const length = linePath.getTotalLength();

      linePath.style.strokeDasharray = `${length}`;
      linePath.style.strokeDashoffset = `${length}`;
      areaPath.style.opacity = "0";

      requestAnimationFrame(() => {
        linePath.style.transition = "stroke-dashoffset 0.8s ease-in-out";
        linePath.style.strokeDashoffset = "0";
        areaPath.style.transition = "opacity 0.4s ease-in 0.4s";
        areaPath.style.opacity = "1";
      });
    }

    return () => plot.remove();
  }, [data, theme.palette.primary.main]);

  if (!data.length) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          color: "text.disabled",
          fontSize: 12,
        }}
      >
        —
      </Box>
    );
  }

  return <div ref={ref} style={{ width: "100%", height: 32 }} />;
}

type NoveltyGaugeCellProps = {
  value: number | null | undefined;
  row: Record<string, unknown>;
  loading?: boolean;
  table?: string;
};

export function NoveltyGaugeCell({ value, row, loading = false, table = "" }: NoveltyGaugeCellProps) {
  const { entity } = useAotfQueryState();
  const dispatch = useAssociationsFocusDispatch();
  const focusState = useAssociationsFocus();

  const timeSeries: TimeSeriesPoint[] =
    entity === "target"
      ? ((row.disease as any)?.associationTimeSeries?.rows ?? [])
      : ((row.target as any)?.associationTimeSeries?.rows ?? []);

  const hasData = timeSeries.length > 0;

  if (loading) {
    return (
      <Box sx={{ px: 0.5, height: "100%", display: "flex", alignItems: "center" }}>
        <Skeleton variant="rounded" width="100%" height={32} animation="wave" />
      </Box>
    );
  }

  const rowId = row.id as string;
  const isNoveltyOpen = focusState.some(
    e => e.table === (table as FocusElementTable) && e.row === rowId && e.noveltyPanelOpen
  );

  const handleClick = () => {
    dispatch({
      type: FocusActionType.TOGGLE_NOVELTY_PANEL,
      focus: { table: table as FocusElementTable, row: rowId },
    });
  };

  return (
    <AssocTooltip
      title={hasData ? `Novelty: ${value != null ? (value as number).toFixed(2) : "—"}` : ""}
      arrow
      placement="bottom"
    >
      <Box
        onClick={handleClick}
        sx={{
          cursor: "pointer",
          height: "100%",
          width: "100%",
          px: 0.5,
          outline: isNoveltyOpen ? "2px solid" : "none",
          outlineColor: "primary.main",
          borderRadius: "2px",
        }}
      >
        <NoveltySparkline data={timeSeries} />
      </Box>
    </AssocTooltip>
  );
}
