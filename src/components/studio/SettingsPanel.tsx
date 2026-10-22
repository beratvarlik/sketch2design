"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { FORMATS, PALETTES, type FormatId } from "@/lib/studio";
import s from "./settings.module.css";

interface SettingsPanelProps {
  format: FormatId | null;
  onFormat: (f: FormatId) => void;
  palette: string;
  onPalette: (p: string) => void;
  customColors: string[];
  onCustomColors: (c: string[]) => void;
  description: string;
  onDescription: (d: string) => void;
  hasContent: boolean;
  onGo: () => void | Promise<void>;
}

const XICON = (size: number) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
    <path d="M6.2 6.6 Q12 12.3 17.8 17.6 M17.5 6.3 Q12.2 11.8 6.4 17.9" />
  </svg>
);

export default function SettingsPanel({
  format, onFormat, palette, onPalette, customColors, onCustomColors, description, onDescription, hasContent, onGo,
}: SettingsPanelProps) {
  const colorRef = useRef<HTMLInputElement>(null);
  const customsRef = useRef(customColors);
  const onCustomRef = useRef(onCustomColors);
  useEffect(() => {
    customsRef.current = customColors;
    onCustomRef.current = onCustomColors;
  });

  // Renk seçici kapanınca (native "change") ekle; sürüklerken her ara rengi ekleme.
  useEffect(() => {
    const el = colorRef.current;
    if (!el) return;
    const add = () => {
      const hex = el.value.toUpperCase();
      if (!hex || customsRef.current.includes(hex)) return;
      onCustomRef.current([...customsRef.current, hex].slice(-4));
    };
    el.addEventListener("change", add);
    return () => el.removeEventListener("change", add);
  }, []);

  const canGo = !!format && hasContent;
  const missing: string[] = [];
  if (!format) missing.push("ne tasarladığımızı seç");
  if (!hasContent) missing.push("bir şey çiz ya da fotoğraf yükle");

  return (
    <aside className={s.panel} aria-label="Tasarım ayarları">
      <section className={`${s.psec} ${s.fmtSec}`}>
        <h2 className={s.ptitle}>
          <span className={s.pnum}>1</span>Ne tasarlıyoruz?
          <span className={`${s.pnote} ${format ? s.ok : s.req}`}>{format ? "tamam" : "bunu seçmen lazım"}</span>
        </h2>
        <div className={s.fmtGrid} role="radiogroup" aria-label="Tasarım tipi">
          {FORMATS.map((f, i) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={format === f.id}
              className={`${s.fcard} ${format === f.id ? s.on : ""} ${i === 4 ? s.span2 : ""}`}
              onClick={() => onFormat(f.id)}
            >
              <span className={s.fbox} aria-hidden="true">
                <span className={s.fshape} style={{ width: f.w, height: f.h }} />
              </span>
              <span className={s.fname}>
                <span className={s.fnameMain}>{f.name}</span>
                <span className={s.fratio}>{f.ratioLabel}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={s.psec}>
        <h2 className={s.ptitle}>
          <span className={s.pnum}>2</span>Hangi renkler?<span className={s.pnote}>boş geçebilirsin</span>
        </h2>
        <div className={s.palGrid} role="radiogroup" aria-label="Renk paleti">
          <button type="button" role="radio" aria-checked={palette === "auto"} className={`${s.pal} ${s.wide} ${palette === "auto" ? s.on : ""}`} onClick={() => onPalette("auto")}>
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
              <path d="M12 3.6 Q12.6 9.4 18.4 11.8 Q12.6 13.6 12 19.8 Q11.2 13.6 5.4 12 Q11.2 10 12 3.6 Z" />
            </svg>
            <span className={s.palAuto}>
              <span className={s.palAutoMain}>Tasarımcı seçsin</span>
              <span className={s.palAutoSub}>krokiye bakıp karar verir</span>
            </span>
          </button>
          {PALETTES.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={palette === p.id} className={`${s.pal} ${palette === p.id ? s.on : ""}`} onClick={() => onPalette(p.id)}>
              <span className={s.palName}>{p.name}</span>
              <span className={s.sw} aria-hidden="true">
                {p.c.map((hex) => (
                  <span key={hex} style={{ background: hex }} />
                ))}
              </span>
            </button>
          ))}
        </div>
        <div className={s.customs}>
          <label className={s.customLabel}>
            <input ref={colorRef} className={s.colorIn} type="color" defaultValue="#6E54FF" />
            Kendi rengini ekle
          </label>
          {customColors.map((hex) => (
            <span key={hex} className={s.cchip}>
              <span className={s.cdot} style={{ background: hex }} />
              {hex}
              <button type="button" className={s.x} onClick={() => onCustomColors(customColors.filter((c) => c !== hex))} aria-label={`${hex} rengini kaldır`}>
                {XICON(12)}
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className={s.psec}>
        <h2 className={s.ptitle}>
          <label htmlFor="s2d-desc" className={s.descLabel}>
            <span className={s.pnum}>3</span>Tek cümleyle anlat
          </label>
          <span className={s.pnote}>boş geçebilirsin</span>
        </h2>
        <input
          id="s2d-desc"
          className={s.field}
          type="text"
          maxLength={80}
          placeholder="Kulüp etkinliği afişi"
          value={description}
          onChange={(e) => onDescription(e.target.value)}
        />
        <span className={s.count}>{description.length}/80</span>
      </section>

      <section className={`${s.psec} ${s.go}`}>
        {canGo ? (
          <Link className={`${s.btn} ${s.btnXl}`} href="/run"
            onClick={(e) => {
              e.preventDefault();
              void onGo();
            }} aria-describedby="s2d-why">
            Tasarla
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.6 12.3 Q11 11.6 18.6 12.1 M13.8 7 Q16.6 9.6 19 12.1 Q16.4 14.6 13.9 17.2" />
            </svg>
          </Link>
        ) : (
          <button type="button" className={`${s.btn} ${s.btnXl}`} disabled aria-describedby="s2d-why">
            Tasarla
          </button>
        )}
        <span id="s2d-why" className={s.why}>
          {canGo ? "Beş kişilik ekip hazır, yaklaşık 40 saniye sürer." : `Önce ${missing.join(", sonra ")}.`}
        </span>
      </section>
    </aside>
  );
}
