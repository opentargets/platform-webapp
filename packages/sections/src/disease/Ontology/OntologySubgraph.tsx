/// <reference path="../../react-measure.d.ts" />
import { styled } from "@mui/material/styles";
import { curveMonotoneX, line as d3Line, max } from "d3";
import {
  coordCenter,
  type DagNode,
  dagStratify,
  decrossTwoLayer,
  layeringLongestPath,
  type StratifyOperator,
  sugiyama,
} from "d3-dag";
import { type MeasuredComponentProps, withContentRect } from "react-measure";
import { Link } from "react-router";
import { MuiTooltip } from "ui";
import type { OntologyAncestorsQuery, OntologyQuery } from "@ot/constants";

type OntologyDisease = NonNullable<OntologyQuery["disease"]>;
type OntologyAncestor = OntologyAncestorsQuery["diseases"]["rows"][number];
/** the disease of the ontology query with its ancestors resolved by a second request */
export type OntologyGraphData = OntologyDisease & { resolvedAncestors: OntologyAncestor[] };

type NodeType = "anchor" | "child" | "ancestor";
type DagNodeData = {
  id: string;
  name: string;
  parentIds: string[];
  isTerapeuticArea: boolean;
  nodeType: NodeType;
};
type Point = { x: number; y: number };
// the sugiyama layout assigns the layer and the coordinates to the nodes and the
// bend points to the links; d3-dag 0.5 does not declare them on its types
type LayoutNode = DagNode<DagNodeData, undefined> & Point & { layer: number };
type LayoutLink = { source: LayoutNode; target: LayoutNode; points: Point[] };

const StyledLink = styled(Link)({
  "&:hover": { fontWeight: "700" },
});


const buildDag = (data: OntologyGraphData): DagNodeData[] => {
  const nodes: DagNodeData[] = [
    {
      id: data.id,
      name: data.name,
      parentIds: data.parents.map(parent => parent.id),
      isTerapeuticArea: data.isTherapeuticArea,
      nodeType: "anchor" as const,
    },
    ...data.children.map(child => ({
      id: child.id,
      name: child.name,
      parentIds: [data.id],
      isTerapeuticArea: data.isTherapeuticArea,
      nodeType: "child" as const,
    })),
    ...data.resolvedAncestors.map(ancestor => ({
      id: ancestor.id,
      name: ancestor.name,
      parentIds: ancestor.parents.map(parent => parent.id),
      isTerapeuticArea: data.isTherapeuticArea,
      nodeType: "ancestor" as const,
    })),
  ];
  // the ancestors are resolved in a separate request; drop links to any term
  // that is not part of the graph so that the stratification does not fail
  const nodeIds = new Set(nodes.map(node => node.id));
  return nodes.map(node => ({
    ...node,
    parentIds: node.parentIds.filter(parentId => nodeIds.has(parentId)),
  }));
};

type Dag = ReturnType<StratifyOperator<DagNodeData, undefined>>;

const getMaxLayerCount = (dag: Dag): number => {
  helperLayout(dag);

  const layerCounts: Record<number, number> = {};

  const addToLayer = (layer: number) => {
    layerCounts[layer] = (layerCounts[layer] || 0) + 1;
  };

  (dag.descendants() as LayoutNode[]).forEach(n => addToLayer(n.layer));
  (dag.links() as unknown as LayoutLink[]).forEach(l =>
    l.points.forEach((_, i) => addToLayer(l.source.layer + i + 1))
  );

  return Math.max(...Object.values(layerCounts));
};

const textWithEllipsis = (text: string, threshold: number) =>
  text.length <= threshold ? text : `${text.slice(0, threshold)}...`;

const colorMap: Record<NodeType, string> = {
  anchor: "#ff6350",
  ancestor: "#3489ca",
  child: "#85b8df",
};
const coord = coordCenter();
const decross = decrossTwoLayer();
const diameter = 12;
const layering = layeringLongestPath();
const helperLayout = sugiyama().layering(layering).decross(decross).coord(coord);
const line = d3Line<Point>().curve(curveMonotoneX);
const radius = diameter / 2;
const yOffset = 100;

type OntologySubgraphProps = MeasuredComponentProps & {
  name: string;
  data: OntologyGraphData;
};

function OntologySubgraph({ name, data, measureRef, contentRect }: OntologySubgraphProps) {
  const dagData = buildDag(data);
  const dag = dagStratify<DagNodeData>()(dagData);
  const width = contentRect.bounds.width;
  const height = getMaxLayerCount(dag) * 6;
  const layout = sugiyama()
    .layering(layering)
    .decross(decross)
    .coord(coord)
    .nodeSize(() => {
      const base = diameter + 3;
      return [base, base];
    })
    .size([height, width]);
  layout(dag);
  const nodes = dag.descendants() as LayoutNode[];
  const links = dag.links() as unknown as LayoutLink[];
  const separation = width / ((max(nodes, d => d.layer) ?? 0) + 1);
  const xOffset = separation / 2 - radius;
  const textLimit = separation / 8;
  line.x(d => d.y - xOffset).y(d => d.x);

  return (
    <div ref={measureRef}>
      {width ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          width={width}
          height={height + yOffset}
        >
          <defs>
            <marker
              id="arrowhead"
              orient="auto"
              markerWidth="2"
              markerHeight="4"
              refX="0.1"
              refY="2"
            >
              <path d="M0,0 V4 L2,2 Z" fill="#5a5f5f" />
            </marker>
          </defs>
          <g transform="translate(0, 10)">
            <rect
              x="4"
              y="11"
              width={diameter}
              height={diameter}
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="2"
            />
            <text x="20" y="17" fill="#5a5f5f" dominantBaseline="middle" fontSize="12">
              therapeutic area
            </text>
            <circle cx="10" cy="34" r={radius} fill="none" stroke="#e0e0e0" strokeWidth="2" />
            <text fill="#5a5f5f" x="20" y="34" dominantBaseline="middle" fontSize="12">
              disease
            </text>
            <circle cx="150" cy="0" r={radius} fill={colorMap.child} stroke="#e0e0e0" />
            <text fill="#5a5f5f" x="160" y="0" dominantBaseline="middle" fontSize="12">
              descendants
            </text>
            <circle cx="150" cy="17" r={radius} fill={colorMap.ancestor} stroke="#e0e0e0" />
            <text fill="#5a5f5f" x="160" y="17" dominantBaseline="middle" fontSize="12">
              ancestors
            </text>
            <circle cx="150" cy="34" r={radius} fill={colorMap.anchor} stroke="#e0e0e0" />
            <text fill="#5a5f5f" x="160" y="34" dominantBaseline="middle" fontSize="12">
              {name}
            </text>
          </g>
          <g transform={`translate(${width / 2}, 70)`}>
            <text x="-160" fontWeight="bold" fontSize="14" fill="#5a5f5f" dominantBaseline="middle">
              GENERAL
            </text>
            <text x="100" fontWeight="bold" fontSize="14" fill="#5a5f5f" dominantBaseline="middle">
              SPECIFIC
            </text>
            <path
              markerEnd="url(#arrowhead)"
              strokeWidth="2"
              fill="none"
              stroke="#5a5f5f"
              d="M-80,0 L80,0"
            />
          </g>
          <g transform={`translate(0, ${yOffset})`}>
            {links.map(({ points, source, target }) => (
              <path
                key={`${source.id}-${target.id}`}
                d={line(points) ?? undefined}
                fill="none"
                strokeWidth="2"
                stroke="#eeeeee"
              />
            ))}
          </g>
          <g transform={`translate(0, ${yOffset})`}>
            {nodes.map(node => (
              <StyledLink to={`/disease/${node.data.id}`} key={node.id}>
                <MuiTooltip placement="top" title={`${node.data.name || "No name"} | ID: ${node.id}`}>
                  <g>
                    <text
                      x={node.y - xOffset}
                      y={node.x}
                      dx="9"
                      fontSize="12"
                      dominantBaseline="middle"
                      fill="#5a5f5f"
                      style={{ cursor: "pointer" }}
                    >
                      <title>{node.data.name}</title>
                      {textWithEllipsis(node.data.name || "No name", textLimit)}
                    </text>

                    {node.data.parentIds.length === 0 ? (
                      <rect
                        x={node.y - radius - xOffset}
                        y={node.x - radius}
                        width={diameter}
                        height={diameter}
                        fill={colorMap[node.data.nodeType]}
                        stroke="#e0e0e0"
                      />
                    ) : (
                      <circle
                        cx={node.y - xOffset}
                        cy={node.x}
                        r={radius}
                        fill={colorMap[node.data.nodeType]}
                        stroke="#e0e0e0"
                      />
                    )}
                  </g>
                </MuiTooltip>
              </StyledLink>
            ))}
          </g>
        </svg>
      ) : null}
    </div>
  );
}

export default withContentRect("bounds")(OntologySubgraph);
