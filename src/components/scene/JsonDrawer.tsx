import type { SceneView } from "@/lib/sceneView";
import s from "./json.module.css";

interface JsonDrawerProps {
  lines: SceneView["jsonLines"];
  fields: number;
  open: boolean;
  onToggle: () => void;
}

export default function JsonDrawer({ lines, fields, open, onToggle }: JsonDrawerProps) {
  return (
    <>
      <button type="button" className={s.tab} onClick={onToggle} aria-expanded={open} aria-controls="s2d-json">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 4.8 Q6.4 5 6.7 8.6 Q6.9 11.3 4.8 12.1 Q6.9 12.9 6.7 15.6 Q6.5 19.1 9 19.3 M15 4.8 Q17.6 5 17.3 8.6 Q17.1 11.3 19.2 12.1 Q17.1 12.9 17.3 15.6 Q17.5 19.1 15 19.3" />
        </svg>
        <span>spec.json · {fields}</span>
      </button>
      <aside id="s2d-json" className={`${s.drawer} ${open ? s.open : ""}`} aria-label="design-spec.json" inert={!open}>
        <div className={s.head}>
          <h2 className={s.title}>design-spec.json</h2>
          <button type="button" className={s.x} onClick={onToggle} aria-label="Spec panelini kapat">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6.2 6.6 Q12 12.3 17.8 17.6 M17.5 6.3 Q12.2 11.8 6.4 17.9" />
            </svg>
          </button>
        </div>
        <div className={s.code}>
          {lines.map((ln, i) => (
            <div key={i} className={`${s.jl} ${ln.isNew ? s.isNew : ""}`}>
              <span style={{ paddingLeft: ln.pad }}>
                <span className={s.jk}>{ln.k}</span>
                <span className={s.jv}>{ln.v}</span>
              </span>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
