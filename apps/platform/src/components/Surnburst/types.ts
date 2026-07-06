import type { HierarchyNode } from "d3";

export interface DataNode {
  name: string;
  children?: DataNode[];
  value?: number;
}

export interface ArcData {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export type PartitionNode = HierarchyNode<DataNode> & {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  current: ArcData;
  target?: ArcData;
  children?: PartitionNode[];
  parent?: PartitionNode | null;
};

export interface ZoomableSunburstProps {
  data: DataNode;
  width?: number;
  height?: number;
  colors?: string[];
  centerLabel?: boolean;
  fontFamily?: string;
}
