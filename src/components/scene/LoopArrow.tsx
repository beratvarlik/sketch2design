import type { SceneView } from "@/lib/sceneView";
import s from "./loop.module.css";

interface LoopArrowProps {
  loop: SceneView["loop"];
  chips: SceneView["scoreChips"];
}

// Üretici ⇄ Eleştirmen arasındaki geri dönüş oku ve skor geçmişi.
export default function LoopArrow({ loop, chips }: LoopArrowProps) {
  return (
    <div className={`${s.loop} ${loop.on ? s.on : ""} ${loop.hot ? s.hot : ""}`}>
      <svg aria-hidden="true" width="1060" height="150" className={s.svg}>
        <path className={s.main} d="M742 6 C746 70 690 96 636 94 C582 92 528 74 530 10" />
        <path className={s.head} d="M520 24 L530 8 L541 23" />
      </svg>
      <span className={s.label}>bir tur daha!</span>
      <div className={s.scores}>
        {chips.map((c, i) => (
          <span key={i} className={s.chipWrap}>
            <span className={`${s.sc} ${c.tone === "pass" ? s.pass : c.tone === "fail" ? s.fail : ""} ${c.cur ? s.cur : ""}`}>{c.v}</span>
            <span className={s.arrow}>{c.arrow}</span>
          </span>
        ))}
        <span className={s.threshold}>eşik 0.85</span>
      </div>
    </div>
  );
}
