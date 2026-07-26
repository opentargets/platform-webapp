import * as PlotLib from "@observablehq/plot";

export function renderWaterfallPlot({
  data,
  otherData: { margins, xDomain, xTicks, labelBase },
  width,
  height,
}) {
  const { features, shapBaseValue } = data;
  const posColor = "#528b78";
  const negColor = "#d65a1f";
  const dxName = -100;
  const dxValue = -45;
  const dyHeader = -20;
  const textFontSize = 12;

  return PlotLib.plot({
    width,
    height,
    marginLeft: margins.left,
    marginRight: margins.right,
    marginTop: margins.top,
    marginBottom: margins.bottom,
    style: { fontSize: 11.5 },
    x: {
      axis: "bottom",
      line: true,
      label: "",
      labelArrow: false,
      domain: xDomain,
      ticks: xTicks,
      tickFormat: (v) => (Number.isInteger(v) ? String(v) : v),
    },
    y: {
      type: "band",
      domain: features.map((d) => d.name),
      reverse: true,
      axis: null,
      grid: true,
      inset: -1, // force x-axis upwards to correct position
    },
    marks: [
      // column headers
      PlotLib.text(features.slice(-1), {
        x: xDomain[0],
        y: "name",
        dx: dxName,
        dy: dyHeader,
        text: (d) => "Feature",
        fontWeight: 500,
        textAnchor: "end",
        fontSize: textFontSize,
        lineAnchor: "bottom",
      }),
      PlotLib.text(features.slice(-1), {
        x: xDomain[0],
        y: "name",
        dx: dxValue,
        dy: dyHeader,
        text: (d) => "Value",
        fontWeight: 500,
        fontSize: textFontSize,
        textAnchor: "end",
        lineAnchor: "bottom",
      }),
      PlotLib.text(features.slice(-1), {
        x: "_end",
        y: "name",
        text: (d) => `Shapley\n(sum: ${d._end.toFixed(3)})`,
        lineHeight: 1.2,
        dy: dyHeader,
        fontWeight: 500,
        fontSize: textFontSize,
        lineAnchor: "bottom",
      }),

      // feature names
      PlotLib.text(features, {
        x: xDomain[0],
        y: "name",
        text: "name",
        dx: dxName,
        textAnchor: "end",
        fontSize: textFontSize,
      }),

      // feature values
      PlotLib.text(features, {
        x: xDomain[0],
        y: "name",
        text: (d) => d.value.toFixed(3),
        dx: dxValue,
        textAnchor: "end",
        fontSize: 11.5,
        fontVariant: "common-ligatures tabular-nums",
      }),

      // vertical line at total score
      PlotLib.ruleX(features.slice(-1), {
        x: "_end",
        stroke: "#000",
        strokeOpacity: 0.3,
        strokeDasharray: "4,3",
      }),

      // vertical line at base score - and label at bottom
      PlotLib.tickX(labelBase ? features.slice(0, 1) : [], {
        x: shapBaseValue,
        y: "name",
        dy: 24,
        strokeOpacity: 0.3,
        strokeDasharray: "4,3",
      }),
      PlotLib.text(labelBase ? features.slice(0, 1) : [], {
        x: shapBaseValue,
        y: "name",
        text: (d) => `Base: ${shapBaseValue.toFixed(3)}`,
        dy: 40,
        fontSize: textFontSize,
      }),

      // bars
      PlotLib.ruleY(
        features.filter((d) => Math.abs(d.shapValue) > 0.0005),
        {
          x1: "_start",
          x2: "_end",
          y: "name",
          stroke: (d) => (d.shapValue < 0 ? negColor : posColor),
          strokeWidth: 10,
        }
      ),

      // vertical ticks at current score
      PlotLib.tickX(features.slice(0, -1), {
        x: "_end",
        y: "name",
        stroke: "#000",
        strokeOpacity: 0.2,
        dy: -10.5,
      }),

      // extra vertical bar at bottom
      PlotLib.tickX(features.slice(0, 1), {
        x: "_start",
        y: "name",
        stroke: "#000",
        strokeOpacity: 0.2,
        dy: 10.5,
      }),

      // show shap values in or next to bars
      PlotLib.text(
        features.filter((d) => d.shapValue > 0.0005),
        {
          x: "_end",
          y: "name",
          text: (d) => `+${d.shapValue.toFixed(3)}`,
          textAnchor: "start",
          dx: 3,
          fontSize: 11,
          fontVariant: "common-ligatures tabular-nums",
        }
      ),
      PlotLib.text(
        features.filter((d) => d.shapValue < -0.0005),
        {
          x: "_end",
          y: "name",
          text: (d) => d.shapValue.toFixed(3),
          textAnchor: "end",
          dx: -3,
          fontSize: 11,
          fontVariant: "common-ligatures tabular-nums",
        }
      ),
    ],
  });
}
