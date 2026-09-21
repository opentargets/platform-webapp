/**
 * Serializing the graph's SVG element to a downloadable SVG file.
 */

/**
 * Serialize an SVG element and trigger a direct .svg file download
 */
export const downloadSvgFile = (svgEl: SVGSVGElement, filename = 'graph-visualization.svg') => {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const { width, height } = svgEl.getBoundingClientRect();
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  // The invisible wide edge strokes exist only to catch pointer events
  clone.querySelectorAll('.graph-edge-hit').forEach((el) => el.remove());

  // Solid background, so the file doesn't render on transparent/black in viewers
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', '#ffffff');
  clone.insertBefore(background, clone.firstChild);

  const svgString = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
