import mermaid from "mermaid";
import { useEffect, useState } from "react";

mermaid.initialize({ startOnLoad: false, theme: "default" });

let uid = 0;

function Mermaid({ children }: { children: string }) {
  const [id] = useState(() => `mermaid-${++uid}`);
  const [svg, setSvg] = useState("");

  useEffect(() => {
    mermaid
      .render(id, children.trim())
      .then(({ svg }) => setSvg(svg))
      .catch(console.error);
  }, [id, children]);

  if (!svg) return null;

  return (
    <div
      style={{ margin: "24px 0", textAlign: "center" }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid renders trusted SVG
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default Mermaid;
