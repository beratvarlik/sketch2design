import OutputPreview from "./OutputPreview";

interface ScaledOutputProps {
  level: number;
  /** Küçültülmüş genişlik (px); orijinal 300×520 oranı korunur. */
  width: number;
}

export default function ScaledOutput({ level, width }: ScaledOutputProps) {
  const k = width / 300;
  return (
    <div
      style={{
        width,
        height: Math.round(520 * k),
        overflow: "hidden",
        borderRadius: 6,
        lineHeight: 0,
        flex: "none",
        boxShadow: "0 0 0 1px var(--line-strong)",
      }}
    >
      <div style={{ width: 300, height: 520, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        <OutputPreview level={level} />
      </div>
    </div>
  );
}
