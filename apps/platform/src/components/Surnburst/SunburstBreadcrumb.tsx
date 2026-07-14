import React from "react";
import type { PartitionNode } from "./types";

interface SunburstBreadcrumbProps {
  trail: PartitionNode[];
  onNavigate: (node: PartitionNode) => void;
}

export const SunburstBreadcrumb: React.FC<SunburstBreadcrumbProps> = ({
  trail,
  onNavigate,
}) => {
  return (
    <div
      style={{
        padding: "4px 8px",
        fontSize: 12,
        color: "#666",
        minHeight: 24,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      {trail.map((node, i) => {
        const isLast = i === trail.length - 1;
        const name = node.data.name;
        if (!name) return null;
        return (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {i > 0 && <span style={{ color: "#bbb" }}>›</span>}
            <span
              onClick={() => !isLast && onNavigate(node)}
              style={{
                cursor: isLast ? "default" : "pointer",
                color: isLast ? "#333" : "#1976d2",
                fontWeight: isLast ? 600 : 400,
                textDecoration: isLast ? "none" : "underline",
              }}
            >
              {name}
            </span>
          </span>
        );
      })}
    </div>
  );
};

