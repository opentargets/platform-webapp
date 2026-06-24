import { useEffect, useMemo, useRef } from "react";
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
        }
      }
    }
  }
`;

export const DATASOURCE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  dataSourcesAssoc.map(d => [d.id, d.label])
);

export const CATEGORICAL_COLORS = [
  "#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951",
  "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0",
];

export const CHART_MARGIN = { left: 52, right: 16, top: 8, bottom: 36 };

export type RawRow = {
  novelty: number;
  year: number;
  aggregationType: string;
  aggregationValue: string;
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
    y: { label: "Novelty", domain: [0, 1] as [number, number], tickFormat: ".1f" },
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
}: {
  rows: LabeledRow[];
  color: string;
  height?: number;
  plotWidth?: number;
  showArea?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !rows.length) return;
    const gradientId = "novelty-overall-gradient";

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
        Plot.ruleX(rows, Plot.pointerX({ x: "year", stroke: "#999", strokeWidth: 1, strokeDasharray: "4,2" })),
      ],
    });

    if (showArea) injectGradient(plot, gradientId, color);
    ref.current.appendChild(plot);
    return () => plot.remove();
  }, [rows, color, height, plotWidth, showArea]);

  return <div ref={ref} style={{ width: "100%" }} />;
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const plot = Plot.plot({
      width: plotWidth,
      height,
      ...sharedAxis(),
      color: {
        legend: showLegend,
        domain: dsLabels,
        range: CATEGORICAL_COLORS.slice(0, dsLabels.length),
      },
      marks: [
        Plot.ruleY([0], { stroke: "#e0e0e0" }),
        Plot.line(rows, { x: "year", y: "novelty", stroke: "label", strokeWidth: 1.5, strokeOpacity: 0.8 }),
        Plot.ruleX(rows, Plot.pointerX({ x: "year", stroke: "#999", strokeWidth: 1, strokeDasharray: "4,2" })),
      ],
    });

    (plot as HTMLElement).style.margin = "0";
    ref.current.appendChild(plot);
    return () => plot.remove();
  }, [rows, dsLabels, height, plotWidth, showLegend]);

  return <div ref={ref} style={{ width: "100%" }} />;
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
