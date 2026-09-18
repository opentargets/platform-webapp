import { useRef, useEffect, RefObject } from "react";
import { ScalesRef } from "./ScalesContext";
import { XAxisHandle } from "../../components/GeneVis/XAxis";

interface NestedXInfoProps {
  data: any;
  scalesRef: RefObject<ScalesRef>;
  XInfo: React.ComponentType<{ data: any; start: number; end: number; isInner: boolean; canvasWidth: number; ref?: React.Ref<XAxisHandle> }>;
  isInner: boolean;
  canvasWidth: number;
  onHandleReady?: (handle: XAxisHandle) => void;
}

function NestedXInfo({ data, scalesRef, XInfo, isInner, canvasWidth, onHandleReady }: NestedXInfoProps) {
  const xAxisRef = useRef<XAxisHandle | null>(null);

  const initialStart = scalesRef.current?.viewStart ?? scalesRef.current?.xMin ?? 0;
  const initialEnd = scalesRef.current?.viewEnd ?? scalesRef.current?.xMax ?? 100;

  useEffect(() => {
    if (xAxisRef.current && onHandleReady) {
      onHandleReady(xAxisRef.current);
    }
  }, [onHandleReady]);

  return <XInfo data={data} start={initialStart} end={initialEnd} isInner={isInner} canvasWidth={canvasWidth} ref={xAxisRef} />;
}

export default NestedXInfo;