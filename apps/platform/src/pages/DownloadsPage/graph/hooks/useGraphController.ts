/**
 * Hook: useGraphController
 * Builds the imperative `GraphController` (zoom/fit/center/reset/export)
 * exposed to `GraphControls`, operating on the SVG/zoom/simulation refs
 * owned by `useForceGraph`.
 */

import { useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { GraphController, GraphNodeDatum, GraphLinkDatum, GraphCallbacks } from '../types';
import { computeFitTransform } from '../utils/fitTransform';
import { exportSvgAsPng, downloadSvgFile } from '../utils/svgExport';

interface UseGraphControllerOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>;
  zoomRef: React.RefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>;
  simulationRef: React.RefObject<d3.Simulation<GraphNodeDatum, GraphLinkDatum> | null>;
  initialFitTransformRef: React.RefObject<d3.ZoomTransform | null>;
  callbacksRef: React.RefObject<GraphCallbacks>;
}

export const useGraphController = ({
  containerRef,
  svgRef,
  zoomRef,
  simulationRef,
  initialFitTransformRef,
  callbacksRef,
}: UseGraphControllerOptions): GraphController => {
  const applyZoomScale = useCallback(
    (factor: number) => {
      const svg = svgRef.current;
      const zoom = zoomRef.current;
      if (!svg || !zoom) return;
      (svg.transition().duration(200) as any).call(zoom.scaleBy, factor);
    },
    [svgRef, zoomRef]
  );

  return useMemo<GraphController>(
    () => ({
      zoomIn: () => applyZoomScale(1.3),
      zoomOut: () => applyZoomScale(1 / 1.3),
      fit: () => {
        const svg = svgRef.current;
        const zoom = zoomRef.current;
        const container = containerRef.current;
        const simNodes = simulationRef.current?.nodes();
        if (!svg || !zoom || !container || !simNodes?.length) return;

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        const { scale, translateX, translateY } = computeFitTransform(simNodes, width, height);

        (svg.transition().duration(300) as any).call(
          zoom.transform,
          d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        );
      },
      center: () => {
        const svg = svgRef.current;
        const zoom = zoomRef.current;
        const container = containerRef.current;
        const simNodes = simulationRef.current?.nodes();
        if (!svg || !zoom || !container || !simNodes?.length) return;

        const xs = simNodes.map((n) => n.x ?? 0);
        const ys = simNodes.map((n) => n.y ?? 0);
        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        const currentTransform = d3.zoomTransform(svg.node() as SVGSVGElement);
        const k = currentTransform.k;

        (svg.transition().duration(200) as any).call(
          zoom.transform,
          d3.zoomIdentity.translate(width / 2 - k * centerX, height / 2 - k * centerY).scale(k)
        );
      },
      reset: () => {
        const svg = svgRef.current;
        const zoom = zoomRef.current;
        const simulation = simulationRef.current;
        if (!svg || !zoom) return;

        (svg.transition().duration(200) as any).call(
          zoom.transform,
          initialFitTransformRef.current ?? d3.zoomIdentity
        );
        simulation?.nodes().forEach((n) => {
          n.fx = null;
          n.fy = null;
        });
        callbacksRef.current?.onNodeDeselect?.();
      },
      exportPNG: () => {
        const svgEl = svgRef.current?.node();
        if (svgEl) exportSvgAsPng(svgEl);
      },
      exportSVG: () => {
        const svgEl = svgRef.current?.node();
        if (svgEl) downloadSvgFile(svgEl);
      },
    }),
    [applyZoomScale, callbacksRef, containerRef, initialFitTransformRef, simulationRef, svgRef]
  );
};
