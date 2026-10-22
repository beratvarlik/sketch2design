interface OutputFrameProps {
  /** Üreticinin ürettiği, temizlenmiş tek dosyalık HTML */
  html: string;
  /** Tasarımın piksel boyutu */
  width: number;
  height: number;
  /** Ekranda kaplayacağı genişlik (px); oran korunur */
  displayWidth: number;
  radius?: number;
}

// Üretilen HTML'i sandbox'lı iframe'de gösterir: betik çalışmaz, aynı köken yok, dış kaynak yüklenmez.
export default function OutputFrame({ html, width, height, displayWidth, radius = 6 }: OutputFrameProps) {
  const k = displayWidth / width;
  return (
    <div
      style={{
        width: displayWidth,
        height: Math.round(height * k),
        overflow: "hidden",
        borderRadius: radius,
        lineHeight: 0,
        flex: "none",
        background: "var(--paper)",
        boxShadow: "0 0 0 1px var(--line-strong)",
      }}
    >
      <iframe
        title="Üretilen tasarım"
        sandbox=""
        srcDoc={html}
        referrerPolicy="no-referrer"
        scrolling="no"
        tabIndex={-1}
        style={{ width, height, border: 0, transform: `scale(${k})`, transformOrigin: "0 0", pointerEvents: "none", background: "white" }}
      />
    </div>
  );
}
