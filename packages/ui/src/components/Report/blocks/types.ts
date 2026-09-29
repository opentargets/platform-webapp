import React from "react";
import { ReportBlock } from "../../../types/report";

export interface BlockViewProps<B extends ReportBlock> {
  block: B;
  index: number;
  // Collapsible kinds only (image, data blocks)
  expanded: boolean;
  onToggle: (reportSectionId: string) => void;
  onHeaderKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
}
