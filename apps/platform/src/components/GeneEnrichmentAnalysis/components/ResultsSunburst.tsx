import { Box, Typography } from "@mui/material";
import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import type { GseaResult } from "../api/gseaApi";
import { mapToPrioritizationColor, ROOT_NODE_COLOR } from "../utils/colorPalettes";
import { buildHierarchyForD3, type HierarchyNode } from "../utils/pathwayHierarchy";

interface ResultsSunburstProps {
  results: GseaResult[];
}

function ResultsSunburst({ results }: ResultsSunburstProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Build hierarchy data
  const hierarchyData = useMemo(() => {
    if (results.length === 0) return null;
    return buildHierarchyForD3(results);
  }, [results]);

  // Get NES range for color scaling
  const nesRange = useMemo(() => {
    const nesValues = results.map((r) => r.NES || 0);
    return {
      min: Math.min(...nesValues),
      max: Math.max(...nesValues),
    };
  }, [results]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !hierarchyData) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    // Get dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;
    const radius = Math.min(width, height) / 2;

    // Create hierarchy
    const root = d3
      .hierarchy<HierarchyNode>(hierarchyData)
      .sum((d) => (d.children?.length ? 0 : d.value))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition<HierarchyNode>().size([2 * Math.PI, radius]);

    partition(root);

    // Create arc generator
    const arc = d3
      .arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1 - 1);

    // Create group and center it
    const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

    // Create tooltip
    const tooltip = d3
      .select(container)
      .append("div")
      .attr("class", "sunburst-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(0, 0, 0, 0.85)")
      .style("color", "white")
      .style("padding", "10px 14px")
      .style("border-radius", "6px")
      .style("font-size", "13px")
      .style("max-width", "300px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)");

    // Draw arcs
    g.selectAll("path")
      .data(root.descendants())
      .join("path")
      .attr("fill", (d) => {
        if (d.depth === 0) return ROOT_NODE_COLOR;
        const nes = d.data.data?.NES || 0;
        return mapToPrioritizationColor(nes, nesRange.min, nesRange.max);
      })
      .attr("d", arc as any)
      .style("cursor", "pointer")
      .style("stroke", "#fff")
      .style("stroke-width", "1px")
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 0.8);

        if (d.depth === 0) {
          tooltip
            .style("visibility", "visible")
            .html(`<strong>All Pathways</strong><br/>Total: ${results.length} pathways`);
        } else if (d.data.data) {
          const pathway = d.data.data;
          const genes = pathway["Leading edge genes"] || "";
          const geneList = genes
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean);

          tooltip.style("visibility", "visible").html(`
            <strong>${pathway.Pathway}</strong><br/>
            <span style="color: #aaa; font-size: 11px;">${pathway.ID || ""}</span><br/><br/>
            <strong>NES:</strong> ${pathway.NES?.toFixed(3) || "N/A"}<br/>
            <strong>p-value:</strong> ${pathway["p-value"]?.toExponential(2) || "N/A"}<br/>
            <strong>FDR:</strong> ${pathway.FDR?.toExponential(2) || "N/A"}<br/>
            <strong>Pathway size:</strong> ${pathway["Pathway size"] || "N/A"}<br/>
            <strong>Overlap genes:</strong> ${pathway["Number of input genes"] || "N/A"}<br/>
            ${geneList.length > 0 ? `<strong>Leading genes:</strong> ${geneList.slice(0, 5).join(", ")}${geneList.length > 5 ? "..." : ""}` : ""}
          `);
        }
      })
      .on("mousemove", (event) => {
        const containerRect = container.getBoundingClientRect();
        tooltip
          .style("left", `${event.clientX - containerRect.left + 15}px`)
          .style("top", `${event.clientY - containerRect.top - 10}px`);
      })
      .on("mouseout", function () {
        d3.select(this).style("opacity", 1);
        tooltip.style("visibility", "hidden");
      });

    // Add labels for larger segments
    g.selectAll("text")
      .data(
        root.descendants().filter((d) => {
          // Only show labels for segments that are large enough
          return d.depth > 0 && d.x1 - d.x0 > 0.1 && d.y1 - d.y0 > 30;
        })
      )
      .join("text")
      .attr("transform", (d) => {
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#333")
      .style("pointer-events", "none")
      .text((d) => {
        const name = d.data.name;
        const maxLength = 15;
        return name.length > maxLength ? name.slice(0, maxLength) + "..." : name;
      });

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [hierarchyData, nesRange, results.length]);

  if (results.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">No pathways to display.</Typography>
      </Box>
    );
  }

  // Check if hierarchy data exists
  const hasHierarchy = results.some((r) => r["Parent pathway"]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {!hasHierarchy && (
        <Box sx={{ p: 1, backgroundColor: "warning.light", borderRadius: 1, mb: 1 }}>
          <Typography variant="body2" color="warning.dark">
            No hierarchy data available. Displaying flat structure.
          </Typography>
        </Box>
      )}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 500,
          position: "relative",
        }}
      >
        <svg
          ref={svgRef}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </Box>
      {/* Color legend */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          NES: {nesRange.min.toFixed(2)}
        </Typography>
        <Box
          sx={{
            width: 150,
            height: 12,
            background: "linear-gradient(to right, #a01813, #eceada, #2e5943)",
            borderRadius: 1,
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {nesRange.max.toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );
}

export default ResultsSunburst;
