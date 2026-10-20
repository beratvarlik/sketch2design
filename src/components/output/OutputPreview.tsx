import type { CSSProperties } from "react";
import s from "./output.module.css";

interface OutputPreviewProps {
  /** 0 boş · 1 tel kafes · 2 iskelet · 3 içerik · 4 taslak 1 · 5 taslak 2 · 6 taslak 3 · 7 mühürlü */
  level?: number;
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;

// Her seviyenin görünümü Output.dc.html renderVals() ile birebir aynı.
function varsFor(L: number): Vars {
  const wire = L <= 1;
  const skeleton = L <= 2;
  const primary = "var(--o-primary)";
  const tc = skeleton ? "transparent" : L === 4 ? "var(--o-ink-4)" : L === 5 ? "var(--o-ink-5)" : "var(--o-ink)";
  const sc = skeleton ? "transparent" : L === 4 ? "var(--o-sub-4)" : L === 5 ? "var(--o-sub-5)" : "var(--o-sub)";
  const btnBg = wire ? "transparent" : L === 4 ? "var(--o-btn-4)" : L === 5 ? "var(--o-btn-5)" : primary;
  return {
    "--bg": L === 0 ? "var(--o-empty-bg)" : "var(--o-bg)",
    "--show": L === 0 ? 0 : 1,
    "--grid-op": L === 1 ? 1 : L === 2 ? 0.7 : L === 3 ? 0.45 : 0,
    "--bord": wire ? "2px dashed var(--o-dash)" : "2px solid transparent",
    "--tb": L === 1 ? "var(--o-block-1)" : L === 2 ? "var(--o-block-2)" : "transparent",
    "--tc": tc,
    "--sc": sc,
    "--primary": wire ? "transparent" : primary,
    "--img-bg": wire ? "transparent" : primary,
    "--img-h": L === 4 ? "96px" : "132px",
    "--ill-op": L >= 3 ? 1 : 0,
    "--btn-bg": btnBg,
    "--btn-txt": skeleton ? "transparent" : "var(--o-bg)",
    "--card-bg": wire ? "transparent" : "var(--o-card)",
    "--ic1": wire ? "transparent" : "var(--o-accent-2)",
    "--ic2": wire ? "transparent" : primary,
    "--ic3": wire ? "transparent" : "var(--o-ink)",
    "--t-title": L === 4 ? "translate(16px, 6px) rotate(-1.5deg)" : "none",
    "--t-btn": L === 4 ? "translateX(92px)" : "none",
    "--t-card": L === 4 ? "translateY(10px)" : "none",
  };
}

const CARDS = [
  { title: "Çiz", sub: "Kağıda ya da ekrana", icon: "--ic1", move: false },
  { title: "Üret", sub: "Agent'lar tasarlar", icon: "--ic2", move: true },
  { title: "Mühürle", sub: "Monad'da kanıt", icon: "--ic3", move: false },
];

export default function OutputPreview({ level = 6 }: OutputPreviewProps) {
  const L = Number.isNaN(level) ? 6 : level;
  return (
    <div className={s.root} style={varsFor(L)}>
      <div className={s.grid} aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className={s.content}>
        <div className={s.nav}>
          <span className={s.dot} />
          <span className={s.brand}>Sketch2Design</span>
          <span className={s.menu}>
            <span>Ürün</span>
            <span>Fiyat</span>
            <span>Giriş</span>
          </span>
        </div>
        <div className={s.titleWrap}>
          <span className={s.title}>Fikrini çiz,</span>
          <span className={s.title}>tasarımı al.</span>
        </div>
        <span className={s.lead}>Krokiden canlı tasarıma, saniyeler içinde.</span>
        <div className={s.image}>
          <svg aria-hidden="true" width="264" height="132" viewBox="0 0 264 132">
            <path d="M34 96 Q60 40 96 70 T150 52" fill="none" stroke="var(--o-bg)" strokeWidth="5" strokeLinecap="round" />
            <rect x="164" y="28" width="66" height="76" rx="10" fill="var(--o-bg)" />
            <rect x="174" y="40" width="46" height="8" rx="4" fill="var(--o-primary)" />
            <rect x="174" y="54" width="32" height="6" rx="3" fill="var(--o-btn-4)" />
            <rect x="174" y="80" width="28" height="14" rx="5" fill="var(--o-accent-2)" />
            <circle cx="152" cy="52" r="7" fill="var(--o-accent-2)" />
          </svg>
        </div>
        <span className={s.cta}>Hemen dene →</span>
        <div className={s.cards}>
          {CARDS.map((c) => (
            <div key={c.title} className={`${s.card} ${c.move ? s.cardMove : ""}`}>
              <span className={s.icon} style={{ background: `var(${c.icon})` }} />
              <span className={s.cardTitle}>{c.title}</span>
              <span className={s.cardSub}>{c.sub}</span>
            </div>
          ))}
        </div>
        <span className={s.copy}>© Sketch2Design</span>
      </div>

      {L === 0 && (
        <div className={s.empty}>
          <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <span>Tasarım bekleniyor</span>
        </div>
      )}

      {L >= 7 && (
        <div className={s.sealed}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round">
            <path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" />
            <path d="M8 12l2.8 2.8L16.5 9" strokeLinecap="round" />
          </svg>
          Mühürlendi
        </div>
      )}
    </div>
  );
}
