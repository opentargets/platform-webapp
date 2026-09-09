import { useEffect, useRef } from "react";

function ColorRamp({ interpolator, n = 256, width = 100, height = 11 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    for (let i = 0; i < n; ++i) {
      ctx.fillStyle = interpolator(i / (n - 1));
      ctx.fillRect(i, 0, 1, 1);
    }
  }, [interpolator, n, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={n}
      height={1}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
}

export default ColorRamp;
