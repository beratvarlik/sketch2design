import type { CSSProperties } from "react";
import type { SceneView } from "@/lib/scenario";
import s from "./timeline.module.css";

interface TimelineProps {
  segs: SceneView["segs"];
  note: string;
}

export default function Timeline({ segs, note }: TimelineProps) {
  return (
    <footer className={s.foot}>
      <div className={s.meta}>
        <span>{note}</span>
        <span>~40 sn · 5 agent</span>
      </div>
      <div className={s.row}>
        {segs.map((t) => (
          <div
            key={t.id}
            className={`ag-${t.id} ${t.current ? s.cur : ""} ${s.item}`}
            style={{ flex: `${t.flex} 1 0` } as CSSProperties}
          >
            <div className={s.seg} role="progressbar" aria-label={`${t.name} ilerlemesi`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(t.fill)}>
              <div className={s.fill} style={{ width: `${t.fill}%` }} />
              {t.divs.map((x) => (
                <span key={x} className={s.dv} style={{ left: `${x}%` }} />
              ))}
            </div>
            <div className={s.lbl}>
              <span>
                <span className={s.dot} aria-hidden="true" />
                {t.name}
              </span>
              <span className={s.dur}>{t.dur}</span>
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
