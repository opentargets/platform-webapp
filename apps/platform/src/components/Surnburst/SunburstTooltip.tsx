import React from "react";
import type { PartitionNode } from "./types";

interface SunburstTooltipProps {
  node: PartitionNode | null;
  x: number;
  y: number;
}

export const SunburstTooltip: React.FC<SunburstTooltipProps> = ({ node, x, y }) => {
  if (!node) return null;

  const d = node.data;
  const gsea = d.data; // Full GSEA result if present

  return (
    <div
      style={{
        position: "fixed",
        left: x + 14,
        top: y + 14,
        zIndex: 1000,
        background: "rgba(20,20,20,0.92)",
        color: "#fff",
        borderRadius: 6,
        padding: "10px 14px",
        fontSize: 12,
        maxWidth: 300,
        pointerEvents: "none",
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        lineHeight: 1.7,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
        {d.name}
      </div>

      {gsea ? (
        <>
          {gsea.ID && (
            <div>
              <span style={{ color: "#aaa" }}>ID: </span>
              {gsea.ID}
            </div>
          )}
          {gsea.NES !== undefined && (
            <div>
              <span style={{ color: "#aaa" }}>NES: </span>
              {gsea.NES.toFixed(3)}
            </div>
          )}
          {gsea["p-value"] !== undefined && (
            <div>
              <span style={{ color: "#aaa" }}>p-value: </span>
              {gsea["p-value"].toExponential(2)}
            </div>
          )}
          {gsea.FDR !== undefined && (
            <div>
              <span style={{ color: "#aaa" }}>FDR: </span>
              {gsea.FDR.toExponential(2)}
            </div>
          )}
          {gsea["Pathway size"] !== undefined && (
            <div>
              <span style={{ color: "#aaa" }}>Pathway size: </span>
              {gsea["Pathway size"]}
            </div>
          )}
          {gsea["Number of input genes"] !== undefined && (
            <div>
              <span style={{ color: "#aaa" }}>Overlap genes: </span>
              {gsea["Number of input genes"]}
            </div>
          )}
          {Array.isArray(gsea["Leading edge genes"]) && gsea["Leading edge genes"].length > 0 && (
            <div style={{ marginTop: 4 }}>
              <span style={{ color: "#aaa" }}>Leading genes: </span>
              {gsea["Leading edge genes"].slice(0, 5).join(", ")}
              {gsea["Leading edge genes"].length > 5 ? "…" : ""}
            </div>
          )}
        </>
      ) : (
        d.NES !== undefined && (
          <div>
            <span style={{ color: "#aaa" }}>NES: </span>
            {d.NES.toFixed(3)}
          </div>
        )
      )}
    </div>
  );
};
