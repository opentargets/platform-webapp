import React from "react";

interface SunburstBreadcrumbProps {
  trail: string;
}

export const SunburstBreadcrumb: React.FC<SunburstBreadcrumbProps> = ({
  trail,
}) => {
  return (
    <div
      style={{
        marginTop: 8,
        fontSize: 12,
        color: "#666",
        textAlign: "center",
        minHeight: 16,
      }}
    >
      {trail}
    </div>
  );
};
