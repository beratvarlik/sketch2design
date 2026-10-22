"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, AgentEventSource, Answer } from "./events";
import { INITIAL_STATE, reduceScene, type SceneState, type ScenarioStatus } from "./sceneState";

// Olay kaynağını (demo ya da gerçek) dinler, olayları sahne durumuna indirger ve
// gerçek zamanı (T) tutar. Ekran `deriveScene(state, T)` ile çizilir.

export type { ScenarioStatus };

export interface Scenario {
  status: ScenarioStatus;
  state: SceneState;
  /** Çalışmanın başından beri geçen gerçek süre (sn) */
  T: number;
  start: () => void;
  reset: () => void;
  /** Okuyucunun sorusunu cevapla (skipped: "Atla" → varsayılan cevap). */
  answer: (value: Answer, skipped?: boolean) => void;
}

export function useScenario(makeSource: () => AgentEventSource): Scenario {
  const [state, setState] = useState<SceneState>(INITIAL_STATE);
  const [T, setT] = useState(0);
  const stateRef = useRef<SceneState>(INITIAL_STATE);
  const t0 = useRef(0);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const source = useRef<AgentEventSource | null>(null);
  const disconnect = useRef<(() => void) | null>(null);

  const elapsed = () => (Date.now() - t0.current) / 1000;

  const teardown = useCallback(() => {
    if (tickTimer.current) clearInterval(tickTimer.current);
    tickTimer.current = null;
    disconnect.current?.();
    disconnect.current = null;
    source.current = null;
  }, []);

  const dispatch = useCallback(
    (e: AgentEvent) => {
      const next = reduceScene(stateRef.current, e);
      stateRef.current = next;
      setState(next);
      if (e.type === "run_finished") {
        setT(elapsed());
        teardown();
      }
    },
    [teardown],
  );

  const answer = useCallback(
    (value: Answer, skipped = false, auto = false) => {
      const q = stateRef.current.question;
      if (!q || stateRef.current.status !== "running") return;
      dispatch({ type: "user_answer", t: q.at + 0.01, answer: value, auto, skipped, waited: elapsed() - q.at });
      source.current?.respond?.(value, skipped);
    },
    [dispatch],
  );

  const tick = useCallback(() => {
    const T = elapsed();
    setT(T);
    // Süre dolunca varsayılan cevap
    const { question: q, wait } = stateRef.current;
    if (q && T - (q.at + wait) >= q.timeoutSec) answer(q.defaultAnswer, false, true);
  }, [answer]);

  const start = useCallback(() => {
    teardown();
    stateRef.current = INITIAL_STATE;
    setState(INITIAL_STATE);
    setT(0);
    t0.current = Date.now();
    const src = makeSource();
    source.current = src;
    // Script zamanı: soru bekliyorsa sorunun anında durur, yoksa gerçek zaman − toplam bekleme
    const scriptNow = () => {
      const st = stateRef.current;
      return st.question ? st.question.at : elapsed() - st.wait;
    };
    disconnect.current = src.connect(dispatch, scriptNow);
    tickTimer.current = setInterval(tick, 100);
  }, [teardown, makeSource, dispatch, tick]);

  const reset = useCallback(() => {
    teardown();
    stateRef.current = INITIAL_STATE;
    setState(INITIAL_STATE);
    setT(0);
  }, [teardown]);

  useEffect(() => teardown, [teardown]);

  return {
    status: state.status,
    state,
    T,
    start,
    reset,
    answer: (value, skipped) => answer(value, skipped),
  };
}
