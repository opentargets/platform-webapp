import { useRef, useEffect } from "react";

interface CrosshairOverlayProps {
  width: number;
  height: number;
  containerRef: React.RefObject<HTMLElement | null>;
}

/**
 * Renders full-width vertical and full-height horizontal crosshair lines
 * that track the cursor position over the canvas. Listens for mouse events
 * on the provided containerRef so it doesn't need its own pointer-events layer.
 */
export function CrosshairOverlay({ width, height, containerRef }: CrosshairOverlayProps) {
  const vLineRef = useRef<HTMLDivElement>(null);
  const hLineRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = clipRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (vLineRef.current) {
        vLineRef.current.style.transform = `translateX(${x}px)`;
        vLineRef.current.style.opacity = "1";
      }
      if (hLineRef.current) {
        hLineRef.current.style.transform = `translateY(${y}px)`;
        hLineRef.current.style.opacity = "1";
      }
    };

    const handleMouseLeave = () => {
      if (vLineRef.current) vLineRef.current.style.opacity = "0";
      if (hLineRef.current) hLineRef.current.style.opacity = "0";
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [containerRef]);

  return (
    <div
      ref={clipRef}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width,
        height,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 2,
      }}
    >
      {/* Vertical line */}
      <div
        ref={vLineRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1,
          height,
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          opacity: 0,
          willChange: "transform",
        }}
      />
      {/* Horizontal line */}
      <div
        ref={hLineRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height: 1,
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          opacity: 0,
          willChange: "transform",
        }}
      />
    </div>
  );
}
