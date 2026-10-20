"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ASK_AT, AUTO, END, IDLE_CLOCK, scriptTime, type Answer, type SceneClock } from "./scenario";

// Demo zamanlayıcısı. Dışarıya yalnızca bir `SceneClock` verir; ekranın geri kalanı
// onu `deriveScene(clock)` ile görünüme çevirir. Gerçek backend bağlanınca bu hook'un
// yerine SSE/WebSocket olaylarından aynı `SceneClock`'u üreten bir hook gelir.

export type ScenarioStatus = "idle" | "running" | "finished";

interface Run {
  status: ScenarioStatus;
  /** Gerçek geçen süre */
  T: number;
  /** Soru cevaplandığındaki gerçek süre */
  answerAt: number | null;
  answer: Answer;
  auto: boolean;
  skipped: boolean;
}

const IDLE_RUN: Run = { status: "idle", T: 0, answerAt: null, answer: "Buton", auto: false, skipped: false };

export interface Scenario {
  status: ScenarioStatus;
  clock: SceneClock;
  start: () => void;
  reset: () => void;
  /** Okuyucunun sorusunu cevapla (skipped: "Atla" → varsayılan "Buton"). */
  answer: (value: Answer, skipped?: boolean) => void;
}

export function useScenario(): Scenario {
  const [run, setRun] = useState<Run>(IDLE_RUN);
  const runRef = useRef<Run>(IDLE_RUN);
  const t0 = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const apply = useCallback((next: Run) => {
    runRef.current = next;
    setRun(next);
  }, []);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const tick = useCallback(() => {
    const prev = runRef.current;
    if (prev.status !== "running") return;
    const T = (Date.now() - t0.current) / 1000;
    // Süre dolunca otomatik "Buton"
    if (prev.answerAt === null && T >= ASK_AT + AUTO) {
      apply({ ...prev, T, answerAt: T, answer: "Buton", auto: true });
      return;
    }
    if (scriptTime(T, prev.answerAt) >= END + 0.4) {
      stop();
      apply({ ...prev, T, status: "finished" });
      return;
    }
    apply({ ...prev, T });
  }, [apply, stop]);

  const start = useCallback(() => {
    stop();
    t0.current = Date.now();
    apply({ ...IDLE_RUN, status: "running" });
    timer.current = setInterval(tick, 100);
  }, [apply, stop, tick]);

  const reset = useCallback(() => {
    stop();
    apply(IDLE_RUN);
  }, [apply, stop]);

  const answer = useCallback(
    (value: Answer, skipped = false) => {
      const prev = runRef.current;
      if (prev.status !== "running" || prev.answerAt !== null) return;
      const T = (Date.now() - t0.current) / 1000;
      if (T < ASK_AT) return;
      apply({ ...prev, T, answerAt: T, answer: value, auto: false, skipped });
    },
    [apply],
  );

  useEffect(() => stop, [stop]);

  const clock = useMemo<SceneClock>(() => {
    if (run.status === "idle") return IDLE_CLOCK;
    const answered = run.answerAt !== null;
    return {
      s: scriptTime(run.T, run.answerAt),
      T: run.T,
      answered,
      answer: run.answer,
      auto: run.auto,
      skipped: run.skipped,
      wait: answered ? (run.answerAt as number) - ASK_AT : Math.max(0, run.T - ASK_AT),
      live: true,
    };
  }, [run]);

  return { status: run.status, clock, start, reset, answer };
}
