import { useId } from "react";
import s from "./sketch.module.css";

export type SketchAsk = "pending" | "asking" | "answered";
export type SketchAnswer = "Buton" | "Görsel";

interface SketchProps {
  w?: number;
  reveal?: number;
  ask?: SketchAsk;
  answer?: SketchAnswer;
  grid?: boolean;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  tag: number;
  label: string;
}

// b4 (belirsiz kutu) ayrı çizilir: durumuna göre etiket ve renk değişir.
const BOXES: Record<number, Box> = {
  0: { x: 10, y: 10, w: 240, h: 40, tag: 78, label: "menü 0.97" },
  1: { x: 16, y: 70, w: 210, h: 40, tag: 78, label: "başlık 0.95" },
  2: { x: 16, y: 115, w: 190, h: 18, tag: 72, label: "metin 0.88" },
  3: { x: 16, y: 137, w: 228, h: 130, tag: 78, label: "görsel 0.93" },
  5: { x: 15, y: 333, w: 80, h: 92, tag: 66, label: "kart 0.90" },
  6: { x: 90, y: 333, w: 80, h: 92, tag: 66, label: "kart 0.89" },
  7: { x: 165, y: 333, w: 80, h: 92, tag: 66, label: "kart 0.91" },
  8: { x: 16, y: 434, w: 228, h: 16, tag: 78, label: "alt bilgi 0.84" },
};

const COLS = [16, 35.5, 55, 74.5, 94, 113.5, 133, 152.5, 172, 191.5, 211, 230.5];

export default function Sketch({ w = 260, reveal = 9, ask = "pending", answer = "Buton", grid = false }: SketchProps) {
  const patternId = useId();
  const h = Math.round((w * 460) / 260);
  const answered = ask === "answered";
  const isImg = answer === "Görsel";
  const btnLabel = answered ? (isImg ? "görsel 0.95" : "buton 0.96") : ask === "asking" ? "? soruldu · 0.52" : "? 0.52";
  const btnLabelW = answered ? (isImg ? 78 : 72) : ask === "asking" ? 104 : 46;
  const shown = (i: number) => reveal > i;

  return (
    <div className={s.wrap}>
      <svg
        viewBox="0 0 260 460"
        width={w}
        height={h}
        role="img"
        aria-label="Elle çizilmiş kroki: üst menü, başlık, görsel, buton ve üç kart"
      >
        <defs>
          <pattern id={patternId} width="13" height="13" patternUnits="userSpaceOnUse">
            <path d="M13 0 H0 V13" className={s.square} />
          </pattern>
        </defs>
        <rect x="0" y="0" width="260" height="460" className={s.paper} />
        <rect x="0" y="0" width="260" height="460" fill={`url(#${patternId})`} />
        <path d="M22 0 V460" className={s.margin} />

        <g className={`${s.pencil} ${s.ghost}`} transform="translate(0.9 0.7)">
          <path d="M14 16 Q70 13 130 15 T246 16 L247 46 Q130 48 13 45 Z" />
          <path d="M20 142 L240 140 L241 262 L19 263 Z" />
          <path d="M22 282 Q70 279 118 281 Q121 296 118 312 Q70 314 22 311 Q19 296 22 282 Z" />
          <path d="M20 338 L90 337 L91 420 L19 421 Z M95 338 L165 337 L166 420 L94 421 Z M170 338 L240 337 L241 420 L169 421 Z" />
        </g>
        <g className={`${s.pencil} ${s.line}`}>
          <path d="M14 16 Q70 13 130 15 T246 16 L247 46 Q130 48 13 45 Z" />
          <circle cx="30" cy="31" r="8" />
          <path d="M150 31 q11 -2 22 0 M184 31 q11 2 22 0 M218 31 q10 -2 20 0" />
          <path d="M20 84 q5 -9 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0" />
          <path d="M20 102 q5 -9 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0" />
          <path d="M20 124 Q100 121 200 125" strokeWidth="1.7" />
          <path d="M20 142 L240 140 L241 262 L19 263 Z" />
          <path d="M22 144 L238 260 M238 143 L22 260" strokeWidth="1.5" opacity="0.6" />
          <path d="M22 282 Q70 279 118 281 Q121 296 118 312 Q70 314 22 311 Q19 296 22 282 Z" />
          <path d="M38 297 q6 -6 12 0 t12 0 t12 0 t12 0 t12 0" />
          <path d="M20 338 L90 337 L91 420 L19 421 Z M95 338 L165 337 L166 420 L94 421 Z M170 338 L240 337 L241 420 L169 421 Z" />
          <path d="M28 348 h20 v20 h-20 Z M103 348 h20 v20 h-20 Z M178 348 h20 v20 h-20 Z" strokeWidth="1.9" />
          <path d="M28 398 h44 M28 409 h32 M103 398 h44 M103 409 h32 M178 398 h44 M178 409 h32" strokeWidth="1.9" />
          <path d="M20 442 Q130 439 240 443" strokeWidth="1.7" strokeDasharray="4 5" />
        </g>
        <g className={s.note}>
          <text x="180" y="66" transform="rotate(-4 180 66)">logo + menü</text>
          <text x="150" y="300" transform="rotate(-3 150 300)">tıklanınca?</text>
          <path d="M146 296 Q134 292 124 296" className={s.noteArrow} />
        </g>

        {grid && (
          <g>
            {COLS.map((x) => (
              <rect key={x} x={x} y="6" width="13.5" height="448" className={s.col} />
            ))}
            <path d="M4 50 H256 M4 137 H256 M4 276 H256 M4 332 H256 M4 426 H256" className={s.guide} strokeDasharray="6 4" />
            <path d="M16 6 V454 M244 6 V454" className={s.guide} />
          </g>
        )}

        {Object.entries(BOXES).map(([key, b]) => {
          const i = Number(key);
          if (!shown(i)) return null;
          return (
            <g key={i}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="3" className={s.box} />
              <rect x={b.x} y={b.y} width={b.tag} height="15" rx="2" className={s.tag} />
              <text x={b.x + 4} y={b.y + 11} className={s.tagText}>{b.label}</text>
            </g>
          );
        })}

        {shown(4) && (
          <g>
            <rect
              x="17"
              y="277"
              width="106"
              height="40"
              rx="3"
              style={{ strokeWidth: 2.2 }}
              strokeDasharray={answered ? undefined : "6 4"}
              className={answered ? s.box : s.boxUnsure}
            />
            <rect x="17" y="277" width={btnLabelW} height="15" rx="2" className={answered ? s.tag : s.tagUnsure} />
            <text x="21" y="288" className={s.tagText}>{btnLabel}</text>
          </g>
        )}
      </svg>
    </div>
  );
}
