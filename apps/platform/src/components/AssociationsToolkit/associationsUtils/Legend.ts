/* eslint-disable */
import {
  interpolate,
  quantize,
  interpolateRound,
  quantile,
  format,
  range,
  create,
  scaleLinear,
  scaleBand,
  axisBottom,
} from "d3";

interface LegendOptions {
  title?: string;
  tickSize?: number;
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  ticks?: number;
  tickFormat?: string | ((d: any, i: number) => string);
  tickValues?: any[];
}

function ramp(color: (t: number) => string, n = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = n;
  canvas.height = 1;
  const context = canvas.getContext("2d")!;
  for (let i = 0; i < n; ++i) {
    context.fillStyle = color(i / (n - 1));
    context.fillRect(i, 0, 1, 1);
  }
  return canvas;
}

function Legend(color: any, options: LegendOptions = {}): SVGSVGElement | null {
  const {
    title,
    tickSize = 6,
    width = 320,
    height = 44 + tickSize,
    marginTop = 18,
    marginRight = 0,
    marginBottom = 16 + tickSize,
    marginLeft = 0,
    ticks = width / 64,
    tickFormat,
    tickValues,
  } = options;

  const svg = create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("overflow", "visible")
    .style("display", "block");

  let tickAdjust: (g: any) => void = g =>
    g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
  let x: any;
  let resolvedTickFormat = tickFormat;
  let resolvedTickValues = tickValues;

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length);

    x = color.copy().rangeRound(quantize(interpolate(marginLeft, width - marginRight), n));

    svg
      .append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(color.copy().domain(quantize(interpolate(0, 1), n))).toDataURL());
  }

  // Sequential
  else if (color.interpolator) {
    x = Object.assign(
      color.copy().interpolator(interpolateRound(marginLeft, width - marginRight)),
      {
        range() {
          return [marginLeft, width - marginRight];
        },
      }
    );

    svg
      .append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(color.interpolator()).toDataURL());

    // scaleSequentialQuantile doesn't implement ticks or tickFormat.
    if (!x.ticks) {
      if (resolvedTickValues === undefined) {
        const n = Math.round(ticks + 1);
        resolvedTickValues = range(n).map(i => quantile(color.domain(), i / (n - 1)));
      }
      if (typeof resolvedTickFormat !== "function") {
        resolvedTickFormat = format(resolvedTickFormat === undefined ? ",f" : resolvedTickFormat);
      }
    }
  }

  // Threshold
  else if (color.invertExtent) {
    const thresholds = color.thresholds
      ? color.thresholds() // scaleQuantize
      : color.quantiles
      ? color.quantiles() // scaleQuantile
      : color.domain(); // scaleThreshold

    const thresholdFormat =
      resolvedTickFormat === undefined
        ? (d: any) => d
        : typeof resolvedTickFormat === "string"
        ? format(resolvedTickFormat)
        : resolvedTickFormat;

    x = scaleLinear()
      .domain([-1, color.range().length - 1])
      .rangeRound([marginLeft, width - marginRight]);

    svg
      .append("g")
      .selectAll("rect")
      .data(color.range())
      .join("rect")
      .attr("x", (d: any, i: number) => x(i - 1))
      .attr("y", marginTop)
      .attr("width", (d: any, i: number) => x(i) - x(i - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", (d: any) => d);

    resolvedTickValues = range(thresholds.length);
    resolvedTickFormat = (i: number) => thresholdFormat(thresholds[i], i);
  }

  // Ordinal
  else {
    x = scaleBand()
      .domain(color.domain())
      .rangeRound([marginLeft, width - marginRight]);

    svg
      .append("g")
      .selectAll("rect")
      .data(color.domain())
      .join("rect")
      .attr("x", x)
      .attr("y", marginTop)
      .attr("width", Math.max(0, x.bandwidth() - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", color);

    tickAdjust = () => {};
  }

  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .attr("class", "ticks")
    .call(
      axisBottom(x)
        .ticks(ticks, typeof resolvedTickFormat === "string" ? resolvedTickFormat : undefined)
        .tickFormat(typeof resolvedTickFormat === "function" ? resolvedTickFormat : undefined)
        .tickSize(tickSize)
        .tickValues(resolvedTickValues)
    )
    .call(tickAdjust)
    .call(g => g.select(".domain").remove())
    .call(g =>
      g
        .append("text")
        .attr("x", marginLeft)
        .attr("y", marginTop + marginBottom - height - 6)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("class", "title")
        .text(title)
    );

  svg.selectAll(".ticks line").attr("stroke", "none");
  svg.selectAll(".ticks text").attr("font-weight", "bold").attr("font-size", "10px");

  return svg.node();
}

export default Legend;
