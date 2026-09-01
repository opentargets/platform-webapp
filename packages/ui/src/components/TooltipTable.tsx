import type { ReactElement } from "react";

type TooltipTableProps = {
  children: ReactElement;
};

function TooltipTable({ children }: TooltipTableProps) {
  return (
    <div style={{ width: "100%" }}>
      <table style={{ borderSpacing: "0 0.4rem", border: "1" }}>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default TooltipTable;
