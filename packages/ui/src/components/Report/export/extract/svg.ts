const SVG_NS = "http://www.w3.org/2000/svg";

// Presentation properties that usually come from CSS (MUI theme, chart libs) and are lost on serialize
const INLINED_PROPERTIES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "alignment-baseline",
  "letter-spacing",
  "visibility",
];

// Icons (FontAwesome, MUI) are svgs too; ignore anything smaller than this
const MIN_CHART_PX = 80;

const area = (el: Element) => {
  const { width, height } = el.getBoundingClientRect();
  return width * height;
};

/**
 * The chart svg inside a widget, if the widget is essentially one svg: the
 * largest <svg> covering at least `minCoverage` of the root and no <canvas>.
 * Otherwise the caller should rasterize (HTML legends, canvas charts).
 */
export const findChartSvg = (root: HTMLElement, minCoverage = 0.4): SVGSVGElement | undefined => {
  if (root.querySelector("canvas")) return undefined;
  const svgs = Array.from(root.querySelectorAll("svg")).filter((svg) => {
    const { width, height } = svg.getBoundingClientRect();
    return width >= MIN_CHART_PX && height >= MIN_CHART_PX && !svg.parentElement?.closest("svg");
  });
  if (svgs.length === 0) return undefined;
  const largest = svgs.reduce((a, b) => (area(b) > area(a) ? b : a));
  const rootArea = area(root);
  return rootArea > 0 && area(largest) / rootArea >= minCoverage ? largest : undefined;
};

const inlineStyles = (source: Element, target: Element) => {
  const computed = window.getComputedStyle(source);
  if (computed.display === "none") {
    target.setAttribute("display", "none");
    return;
  }
  const style = INLINED_PROPERTIES.map((prop) => {
    const value = computed.getPropertyValue(prop);
    return value ? `${prop}:${value}` : "";
  })
    .filter(Boolean)
    .join(";");
  const existing = target.getAttribute("style");
  target.setAttribute("style", existing ? `${existing};${style}` : style);
  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i += 1) {
    inlineStyles(sourceChildren[i], targetChildren[i]);
  }
};

/**
 * Serialize a live <svg>: clone it, inline computed fill/stroke/font styles, set
 * explicit width/height/viewBox so it renders the same outside the page.
 */
export const captureSvg = (svg: SVGSVGElement): { svg: string; width: number; height: number } => {
  const rect = svg.getBoundingClientRect();
  const width = Math.round(rect.width) || Number(svg.getAttribute("width")) || 800;
  const height = Math.round(rect.height) || Number(svg.getAttribute("height")) || 600;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);

  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  // Sized by the attributes above, not by the page's CSS
  clone.style.removeProperty("width");
  clone.style.removeProperty("height");
  clone.style.removeProperty("max-width");
  clone.removeAttribute("class");

  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", "#ffffff");
  clone.insertBefore(background, clone.firstChild);

  return { svg: new XMLSerializer().serializeToString(clone), width, height };
};

export const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** PNG fallback for an SVG asset (PPTX needs one); undefined if the browser can't draw it. */
export const svgToPng = (
  svg: string,
  width: number,
  height: number,
  pixelRatio: number
): Promise<string | undefined> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        const context = canvas.getContext("2d");
        if (!context) return resolve(undefined);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(undefined);
      }
    };
    image.onerror = () => resolve(undefined);
    image.src = svgDataUrl(svg);
  });
