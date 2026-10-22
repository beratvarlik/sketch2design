import type { SceneView } from "@/lib/sceneView";
import s from "./spec.module.css";

export default function SpecCard({ spec }: { spec: SceneView["spec"] }) {
  return (
    <div className={s.row}>
      <div
        className={`${s.spec} ${spec.visible ? "" : s.off} ${spec.returning ? s.ret : ""}`}
        style={{ left: spec.left }}
        role="status"
        aria-label="design-spec kartı"
      >
        <div className={s.head}>
          <span className={s.title}>design-spec</span>
          <span className={s.ver}>v{spec.version}</span>
        </div>
        <span className={s.meta}>
          {spec.fields} alan · {spec.owner}
        </span>
      </div>
    </div>
  );
}
