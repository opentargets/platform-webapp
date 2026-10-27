/**
 * Hook: useGraphController
 * Builds the imperative `GraphController` (zoom/fit) exposed to the
 * CanvasControls, operating on the SVG/zoom/simulation refs
 * owned by `useForceGraph`.
 */

import { useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { GraphController, GraphNodeDatum, GraphLinkDatum } from '../types';
import { computeFitTransform } from '../utils/fitTransform';

interface UseGraphControllerOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>;
  zoomRef: React.RefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>;
  simulationRef: React.RefObject<d3.Simulation<GraphNodeDatum, GraphLinkDatum> | null>;
}

export const useGraphController = ({
  containerRef,
  svgRef,
  zoomRef,
  simulationRef,
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

  const controllerFit = useCallback(() => {
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
  }, [containerRef, simulationRef, svgRef, zoomRef]);

  return useMemo<GraphController>(
    () => ({
      zoomIn: () => applyZoomScale(1.3),
      zoomOut: () => applyZoomScale(1 / 1.3),
      fit: controllerFit,
      fitTo: (ids) => {
        const svg = svgRef.current;
        const zoom = zoomRef.current;
        const container = containerRef.current;
        const simNodes = simulationRef.current?.nodes();
        if (!svg || !zoom || !container || !simNodes?.length) return;

        const wanted = new Set(ids);
        const subset = simNodes.filter((n) => wanted.has(n.id));
        if (!subset.length) {
          controllerFit();
          return;
        }

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        const { scale, translateX, translateY } = computeFitTransform(subset, width, height);

        (svg.transition().duration(300) as any).call(
          zoom.transform,
          d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        );
      },
    }),
    [applyZoomScale, containerRef, controllerFit, simulationRef, svgRef]
  );
};
