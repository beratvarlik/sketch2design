"use client";

import { useEffect, useRef } from "react";
import type { Answer } from "@/lib/scenario";
import s from "./question.module.css";

interface QuestionModalProps {
  hint: string;
  onAnswer: (value: Answer, skipped?: boolean) => void;
}

export default function QuestionModal({ hint, onAnswer }: QuestionModalProps) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
  }, []);

  return (
    <div className={s.wrap}>
      <div className={s.card} role="dialog" aria-modal="true" aria-labelledby="s2d-q-title">
        <svg className={s.frame} aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M1.2 2 Q30 0.6 60 1.6 T98.6 1.4 Q99.6 30 98.8 62 T98.4 98.4 Q70 99.6 40 98.6 T1.6 98.8 Q0.4 70 1.4 40 T1.2 2 Z" />
        </svg>
        <span className={s.who} id="s2d-q-title">
          Okuyucu soruyor:
        </span>
        <div className={s.body}>
          <svg aria-hidden="true" width="170" height="104" viewBox="0 0 150 90" className={s.thumb}>
            <path className={s.thumbBox} d="M18 22 Q75 18 132 21 Q136 45 132 70 Q75 73 18 69 Q14 45 18 22 Z" />
            <path className={s.thumbBox} d="M38 46 q7 -8 14 0 t14 0 t14 0 t14 0 t14 0" />
            <rect className={s.thumbFocus} x="8" y="10" width="134" height="70" rx="6" />
          </svg>
          <p className={s.question}>Bu kutu bir buton mu, görsel mi?</p>
        </div>
        <div className={s.opts}>
          <button ref={first} type="button" className={s.opt} onClick={() => onAnswer("Buton")}>
            Buton
          </button>
          <button type="button" className={`${s.opt} ${s.alt}`} onClick={() => onAnswer("Görsel")}>
            Görsel
          </button>
        </div>
        <div className={s.foot}>
          <span className={s.hint}>{hint}</span>
          <button type="button" className={s.skip} onClick={() => onAnswer("Buton", true)}>
            Atla
          </button>
        </div>
      </div>
    </div>
  );
}
