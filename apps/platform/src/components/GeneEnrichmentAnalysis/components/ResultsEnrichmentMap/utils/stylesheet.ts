import type cytoscape from "cytoscape";

/**
 * Cytoscape stylesheet for enrichment map visualization
 */
export function createStylesheet(): cytoscape.StylesheetCSS[] {
  return [
    {
      selector: "node",
      css: {
        "background-color": "data(color)",
        "border-color": "data(borderColor)",
        "border-width": 2,
        width: "data(size)",
        height: "data(size)",
        label: "data(displayLabel)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": 10,
        color: "#000",
        "text-outline-width": 0,
      },
    },
    {
      selector: "node:selected",
      css: {
        "background-color": "#ffb300",
        "border-width": 4,
        "border-color": "#ff8f00",
        "box-shadow": "0 0 15px rgba(255, 179, 0, 0.8)",
      },
    },
    {
      selector: "edge[edgeWidth]",
      css: {
        "line-color": "#90caf9",
        width: "data(edgeWidth)",
        opacity: "data(edgeOpacity)",
        "curve-style": "straight",
        "target-arrow-color": "#90caf9",
        "target-arrow-fill": "filled",
      },
    },
    {
      selector: "edge:selected",
      css: {
        "line-color": "#ff6f00",
        width: 4,
        "target-arrow-color": "#ff6f00",
      },
    },
    {
      selector: "node.highlighted",
      css: {
        "border-width": 3,
        "border-color": "#ff9800",
        "box-shadow": "0 0 12px rgba(255, 152, 0, 0.6)",
        opacity: 1,
      },
    },
    {
      selector: "node.dimmed",
      css: {
        opacity: 0.2,
      },
    },
    {
      selector: "edge.highlighted",
      css: {
        "line-color": "#ff9800",
        width: 3,
        "target-arrow-color": "#ff9800",
        opacity: 1,
      },
    },
    {
      selector: "edge.dimmed",
      css: {
        opacity: 0.1,
      },
    },
    {
      selector: "node.shortestPath",
      css: {
        "border-width": 4,
        "border-color": "#d32f2f",
        "box-shadow": "0 0 15px rgba(211, 47, 47, 0.7)",
        opacity: 1,
      },
    },
    {
      selector: "edge.shortestPath",
      css: {
        "line-color": "#d32f2f",
        width: 4,
        "target-arrow-color": "#d32f2f",
        opacity: 1,
      },
    },
    {
      selector: "node.geneSource",
      css: {
        "border-width": 3,
        "border-color": "#1976d2",
        "box-shadow": "0 0 12px rgba(25, 118, 210, 0.6)",
        opacity: 1,
      },
    },
  ] as unknown as cytoscape.StylesheetCSS[];
}
