import OutputFrame from "./OutputFrame";
import OutputPreview from "./OutputPreview";

interface ScaledOutputProps {
  level: number;
  /** Küçültülmüş genişlik (px); oran korunur. */
  width: number;
  /** Çerçeve köşe yarıçapı (px) */
  radius?: number;
  /** Gerçek koşuda üretilen HTML tasarım; yoksa demo önizlemesi (OutputPreview, 300×520) çizilir. */
  frame?: { html: string; width: number; height: number } | null;
}

export default function ScaledOutput({ level, width, radius = 6, frame }: ScaledOutputProps) {
  if (frame) return <OutputFrame html={frame.html} width={frame.width} height={frame.height} displayWidth={width} radius={radius} />;
  const k = width / 300;
  return (
    <div
      style={{
        width,
        height: Math.round(520 * k),
        overflow: "hidden",
        borderRadius: radius,
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
