type ColorEntry = {
  name: string;
  hex: string;
};

type ColorPaletteProps = {
  title?: string;
  description?: string;
  colors: ColorEntry[];
  compact?: boolean;
};

function ColorSwatch({ name, hex, compact }: ColorEntry & { compact?: boolean }) {
  const size = compact ? 48 : 72;
  return (
    <div style={{ textAlign: "center", minWidth: compact ? 64 : 80 }}>
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: hex,
          borderRadius: 6,
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          margin: "0 auto 6px",
        }}
      />
      <div style={{ fontSize: 11, fontFamily: "monospace", color: "#5A5F5F", lineHeight: 1.4 }}>
        {hex}
      </div>
      {name && (
        <div style={{ fontSize: 11, color: "#5A5F5F", marginTop: 2, lineHeight: 1.3 }}>{name}</div>
      )}
    </div>
  );
}

export function ColorPalette({ title, description, colors, compact = false }: ColorPaletteProps) {
  return (
    <div style={{ marginBottom: 32 }}>
      {title && <h4 style={{ color: "#18405e", margin: "0 0 6px", fontSize: 15 }}>{title}</h4>}
      {description && (
        <p style={{ color: "#5A5F5F", fontSize: 13, margin: "0 0 14px", lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 10 : 14 }}>
        {colors.map((c) => (
          <ColorSwatch key={`${c.hex}-${c.name}`} {...c} compact={compact} />
        ))}
      </div>
    </div>
  );
}
