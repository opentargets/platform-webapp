import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { gql, useQuery } from "@apollo/client";
import * as Plot from "@observablehq/plot";
import dataSourcesAssoc from "../../static_datasets/dataSourcesAssoc";

export const NOVELTY_TIME_SERIES_QUERY = gql`
  query NoveltyTimeSeriesDetail($efoId: String!, $ensemblId: String!, $isDirect: Boolean!) {
    target(ensemblId: $ensemblId) {
      approvedSymbol
    }
    disease(efoId: $efoId) {
      name
      associationTimeSeries(ensemblId: $ensemblId, isDirect: $isDirect, page: { index: 0, size: 2000 }) {
        rows {
          novelty
          year
          aggregationType
          aggregationValue
          associationScore
        }
      }
    }
  }
`;

export const CATEGORICAL_COLORS = [
  "#6929c4", // Purple
  "#005d5d", // Teal
  "#9f1853", // Magenta
  "#fa4d56", // Red
  "#570408", // Dark red
  "#198038", // Green
  "#002d9c", // Blue
  "#ee538b", // Magenta light
  "#b28600", // Yellow
  "#009d9a", // Teal light
  "#8a3800", // Orange
  "#a56eff", // Purple light
];

export const DATASOURCE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  dataSourcesAssoc.map(d => [d.id, d.label])
);

export const DATASOURCE_COLOR_MAP: Record<string, string> = Object.fromEntries(
  dataSourcesAssoc.map((d, i) => [d.label, CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]])
);

export const CHART_MARGIN = { left: 52, right: 16, top: 8, bottom: 36 };

export type RawRow = {
  novelty: number;
  year: number;
  aggregationType: string;
  aggregationValue: string;
  associationScore?: number;
};

export type LabeledRow = RawRow & { label: string };

export function injectGradient(plot: SVGSVGElement, id: string, color: string) {
  const ns = "http://www.w3.org/2000/svg";
  const defs = document.createElementNS(ns, "defs");
  const gradient = document.createElementNS(ns, "linearGradient");
  gradient.setAttribute("id", id);
  gradient.setAttribute("x1", "0"); gradient.setAttribute("y1", "0");
  gradient.setAttribute("x2", "0"); gradient.setAttribute("y2", "1");
  const s1 = document.createElementNS(ns, "stop");
  s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", color); s1.setAttribute("stop-opacity", "0.25");
  const s2 = document.createElementNS(ns, "stop");
  s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", color); s2.setAttribute("stop-opacity", "0");
  gradient.appendChild(s1); gradient.appendChild(s2);
  defs.appendChild(gradient);
  plot.prepend(defs);
}

function sharedAxis() {
  return {
    x: { label: "Year", tickFormat: (d: number) => String(d), line: true },
    y: { label: "Score", labelAnchor: "center", domain: [0, 1] as [number, number], tickFormat: ".1f" },
    style: { width: "100%", background: "none" } as React.CSSProperties,
    marginLeft: CHART_MARGIN.left,
    marginRight: CHART_MARGIN.right,
    marginTop: CHART_MARGIN.top,
    marginBottom: CHART_MARGIN.bottom,
  };
}

export function OverallChart({
  rows,
  color,
  height = 180,
  plotWidth = 500,
  showArea = true,
  scoreColor = "#9e9e9e",
}: {
  rows: LabeledRow[];
  color: string;
  height?: number;
  plotWidth?: number;
  showArea?: boolean;
  scoreColor?: string;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredRow, setHoveredRow] = useState<LabeledRow | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!plotRef.current || !rows.length) return;
    const gradientId = "novelty-overall-gradient";
    const scoreRows = rows.filter(r => r.associationScore != null);

    const plot = Plot.plot({
      width: plotWidth,
      height,
      ...sharedAxis(),
      marks: [
        Plot.ruleY([0], { stroke: "#e0e0e0" }),
        ...(showArea
          ? [Plot.areaY(rows, { x: "year", y: "novelty", fill: `url(#${gradientId})` })]
          : []),
        Plot.line(rows, { x: "year", y: "novelty", stroke: color, strokeWidth: 2.5 }),
        ...(scoreRows.length
          ? [Plot.line(scoreRows, { x: "year", y: "associationScore", stroke: scoreColor, strokeWidth: 1.5, strokeDasharray: "5,3" })]
          : []),
        Plot.ruleX(rows, Plot.pointerX({ x: "year", stroke: "#999", strokeWidth: 1, strokeDasharray: "4,2" })),
      ],
    });

    if (showArea) injectGradient(plot, gradientId, color);

    const onInput = () => setHoveredRow(((plot as any).value as LabeledRow) ?? null);
    plot.addEventListener("input", onInput);

    plotRef.current.appendChild(plot);
    return () => { plot.removeEventListener("input", onInput); plot.remove(); };
  }, [rows, color, height, plotWidth, showArea, scoreColor]);

  const hasScore = rows.some(r => r.associationScore != null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => { setMousePos(null); setHoveredRow(null); };

  return (
    <Box ref={containerRef} sx={{ position: "relative" }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <Box sx={{ display: "flex", gap: 2, mb: 0.75, mr: `${CHART_MARGIN.right}px`, alignItems: "center", justifyContent: "flex-end" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 20, height: 2.5, bgcolor: color, borderRadius: 1 }} />
          <Typography variant="caption">Novelty</Typography>
        </Box>
        {hasScore && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <svg width="20" height="4" style={{ display: "block" }}>
              <line x1="0" y1="2" x2="20" y2="2" stroke={scoreColor} strokeWidth="1.5" strokeDasharray="5,3" />
            </svg>
            <Typography variant="caption">Association score</Typography>
          </Box>
        )}
      </Box>
      <div ref={plotRef} style={{ width: "100%" }} />
      {mousePos && hoveredRow && (
        <Box sx={{
          position: "absolute",
          left: mousePos.x > (containerRef.current?.offsetWidth ?? 0) / 2 ? mousePos.x - 8 : mousePos.x + 12,
          transform: mousePos.x > (containerRef.current?.offsetWidth ?? 0) / 2 ? "translateX(-100%)" : undefined,
          top: mousePos.y - 12,
          pointerEvents: "none",
          zIndex: 10,
          bgcolor: "white",
          border: "1px solid",
          borderColor: "grey.300",
          borderRadius: 1,
          boxShadow: 3,
          p: 1,
          minWidth: 148,
        }}>
          <Typography variant="caption" sx={{ fontWeight: "bold", display: "block", mb: 0.5 }}>
            {hoveredRow.year}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            <Typography variant="caption" color="text.secondary">Novelty</Typography>
            <Typography variant="caption">{hoveredRow.novelty != null ? hoveredRow.novelty.toFixed(3) : "—"}</Typography>
          </Box>
          {hoveredRow.associationScore != null && (
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
              <Typography variant="caption" color="text.secondary">Assoc. score</Typography>
              <Typography variant="caption">{hoveredRow.associationScore.toFixed(3)}</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export function SourcesChart({
  rows,
  dsLabels,
  height = 200,
  plotWidth = 500,
  showLegend = true,
}: {
  rows: LabeledRow[];
  dsLabels: string[];
  height?: number;
  plotWidth?: number;
  showLegend?: boolean;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!plotRef.current) return;

    const plot = Plot.plot({
      width: plotWidth,
      height,
      ...sharedAxis(),
      color: {
        legend: showLegend,
        domain: dsLabels,
        range: dsLabels.map(l => DATASOURCE_COLOR_MAP[l] ?? "#bdbdbd"),
      },
      marks: [
        Plot.ruleY([0], { stroke: "#e0e0e0" }),
        Plot.line(rows, { x: "year", y: "novelty", stroke: "label", strokeWidth: 1.5, strokeOpacity: 0.8 }),
        Plot.ruleX(rows, Plot.pointerX({ x: "year", stroke: "#999", strokeWidth: 1, strokeDasharray: "4,2" })),
      ],
    });

    const onInput = () => {
      const datum = (plot as any).value as LabeledRow | null;
      setHoveredYear(datum?.year ?? null);
    };
    plot.addEventListener("input", onInput);

    (plot as HTMLElement).style.margin = "0";
    plotRef.current.appendChild(plot);
    return () => { plot.removeEventListener("input", onInput); plot.remove(); };
  }, [rows, dsLabels, height, plotWidth, showLegend]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => { setMousePos(null); setHoveredYear(null); };

  const points = hoveredYear != null
    ? rows.filter(r => r.year === hoveredYear).sort((a, b) => (b.novelty ?? 0) - (a.novelty ?? 0))
    : [];

  return (
    <Box ref={containerRef} sx={{ position: "relative" }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div ref={plotRef} style={{ width: "100%" }} />
      {mousePos && points.length > 0 && (
        <Box sx={{
          position: "absolute",
          left: mousePos.x > (containerRef.current?.offsetWidth ?? 0) / 2 ? mousePos.x - 8 : mousePos.x + 12,
          transform: mousePos.x > (containerRef.current?.offsetWidth ?? 0) / 2 ? "translateX(-100%)" : undefined,
          top: mousePos.y - 12,
          pointerEvents: "none",
          zIndex: 10,
          bgcolor: "white",
          border: "1px solid",
          borderColor: "grey.300",
          borderRadius: 1,
          boxShadow: 3,
          p: 1,
          minWidth: 180,
        }}>
          <Typography variant="caption" sx={{ fontWeight: "bold", display: "block", mb: 0.5 }}>
            {hoveredYear}
          </Typography>
          {points.map(p => (
            <Box key={p.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: DATASOURCE_COLOR_MAP[p.label] ?? "#bdbdbd", flexShrink: 0 }} />
              <Typography variant="caption" sx={{ flex: 1 }}>{p.label}</Typography>
              <Typography variant="caption" sx={{ ml: 1 }}>{p.novelty != null ? p.novelty.toFixed(3) : "—"}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export function useNoveltyTimeSeries({
  targetId,
  diseaseId,
  isDirect,
  skip,
}: {
  targetId: string;
  diseaseId: string;
  isDirect: boolean;
  skip: boolean;
}) {
  const { data, loading, error } = useQuery(NOVELTY_TIME_SERIES_QUERY, {
    variables: { efoId: diseaseId, ensemblId: targetId, isDirect },
    skip: skip || !targetId || !diseaseId,
  });

  const rows: LabeledRow[] = useMemo(
    () =>
      (data?.disease?.associationTimeSeries?.rows ?? []).map((r: RawRow) => ({
        ...r,
        label:
          r.aggregationType === "overall"
            ? "Overall"
            : (DATASOURCE_LABEL_MAP[r.aggregationValue] ?? r.aggregationValue),
      })),
    [data]
  );

  const overallRows = useMemo(() => rows.filter(r => r.aggregationType === "overall"), [rows]);
  const dsRows = useMemo(() => rows.filter(r => r.aggregationType === "datasourceId"), [rows]);
  const dsLabels = useMemo(() => [...new Set(dsRows.map(r => r.label))].sort(), [dsRows]);

  return {
    rows,
    overallRows,
    dsRows,
    dsLabels,
    loading,
    error,
    targetName: data?.target?.approvedSymbol as string | undefined,
    diseaseName: data?.disease?.name as string | undefined,
  };
}
