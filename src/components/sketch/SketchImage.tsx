import type { CSSProperties } from "react";
import type { FoundElement } from "@/lib/events";
import s from "./sketchImage.module.css";

interface SketchImageProps {
  /** Kullanıcının krokisi (PNG data URL) */
  src: string;
  w?: number;
  /** Okuyucunun bulduğu öğeler; boşsa yalnızca görsel gösterilir */
  elements?: FoundElement[];
}

// Gerçek koşuda <Sketch /> yerine: kullanıcının krokisi + Okuyucu'nun bulduğu kutular (0–1000 koordinat).
export default function SketchImage({ src, w = 296, elements = [] }: SketchImageProps) {
  return (
    <div className={s.wrap} style={{ width: w }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.img} src={src} alt="Senin krokin" />
      {elements.map((el, i) => {
        const [x1, y1, x2, y2] = el.box;
        const unsure = el.confidence < 0.7 && !el.confirmed;
        return (
          <div
            key={el.id}
            className={`${s.box} ${unsure ? s.unsure : ""}`}
            style={{ left: `${x1 / 10}%`, top: `${y1 / 10}%`, width: `${(x2 - x1) / 10}%`, height: `${(y2 - y1) / 10}%`, "--i": i } as CSSProperties}
          >
            <span className={s.tag}>
              {unsure ? "? " : ""}
              {el.type} {el.confidence.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
