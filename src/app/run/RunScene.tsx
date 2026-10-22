"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CharacterId } from "@/components/character/faces";
import ScaledOutput from "@/components/output/ScaledOutput";
import SketchPreview from "@/components/sketch/SketchPreview";
import AgentPanel from "@/components/scene/AgentPanel";
import AgentSlot from "@/components/scene/AgentSlot";
import JsonDrawer from "@/components/scene/JsonDrawer";
import LoopArrow from "@/components/scene/LoopArrow";
import QuestionModal from "@/components/scene/QuestionModal";
import SpecCard from "@/components/scene/SpecCard";
import Timeline from "@/components/scene/Timeline";
import { createEventSource } from "@/lib/sources";
import { deriveAgentDetail, deriveScene } from "@/lib/sceneView";
import { BRIEF_KEY, PALETTES, type StudioBrief } from "@/lib/studio";
import { useScenario } from "@/lib/useScenario";
import s from "./run.module.css";

const STAGE_W = 1920;
const STAGE_H = 1080;

// Sahne 1920×1080 tasarlandı; pencereye sığacak şekilde ölçeklenir.
function useFit() {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ k: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calc = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const k = Math.min(w / STAGE_W, h / STAGE_H);
      setFit({ k, x: (w - STAGE_W * k) / 2, y: (h - STAGE_H * k) / 2 });
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, fit };
}

// Stüdyo'dan gelen seçimler (sessionStorage); sunucuda boş, tarayıcıda dolu
const subscribeNone = () => () => {};
function readBriefRaw(): string | null {
  try {
    return sessionStorage.getItem(BRIEF_KEY);
  } catch {
    return null;
  }
}

export default function RunScene() {
  // ?demo=1 her zaman tamamen demo senaryosunu kullanır
  const demo = useSearchParams().get("demo") === "1";
  const briefRaw = useSyncExternalStore(subscribeNone, readBriefRaw, () => null);
  const brief = useMemo<StudioBrief | null>(() => {
    if (!briefRaw) return null;
    try {
      return JSON.parse(briefRaw) as StudioBrief;
    } catch {
      return null;
    }
  }, [briefRaw]);
  const sketchImage = !demo && brief?.image ? brief.image : null;
  const makeSource = useCallback(() => createEventSource({ demo, brief }), [demo, brief]);
  const { status, state, T, start, reset, answer } = useScenario(makeSource);
  const view = deriveScene(state, T);
  const { ref, fit } = useFit();

  const [pid, setPid] = useState<CharacterId>("reader");
  const [panelOpen, setPanelOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const detail = deriveAgentDetail(pid, state, T);
  const startLabel = status === "running" ? "Baştan al" : status === "finished" ? "Bir daha" : "Başlat";

  return (
    <div ref={ref} className={s.viewport}>
      <div
        className={s.stage}
        style={fit ? { transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.k})` } : { visibility: "hidden" }}
      >
        <div className={s.gridpaper} aria-hidden="true" />

        <header className={s.header}>
          <Link href="/" className={s.logo} aria-label="Sketch2Design ana sayfa">
            <svg aria-hidden="true" width="46" height="36" viewBox="0 0 46 36">
              <path d="M3 28 Q6 21 9.5 25 T16 22.5" fill="none" stroke="var(--chalk)" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M27.5 8.5 C31 8 33.5 13 35 18 C36.5 23.5 37 28 36 30 C35 31.6 32 31.8 27.5 31.6 C23 31.8 20 31.6 19.2 30 C18.4 28 19 23.5 20.6 18 C22.2 13 24 8.8 27.5 8.5 Z" fill="none" stroke="var(--chalk)" strokeWidth="1.8" strokeDasharray="3 2.6" strokeLinecap="round" />
              <path d="M32 6 C35.5 6 37.5 11 39 16 C40.6 21.5 41.5 26 40.5 28 C39.5 29.6 36.6 29.8 32 29.8 C27.4 29.8 24.5 29.6 23.5 28 C22.5 26 23.4 21.5 25 16 C26.5 11 28.5 6 32 6 Z" fill="var(--text)" stroke="var(--ink)" strokeWidth="2" />
              <path d="M32 6 Q31 3 33 1.6" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="29.6" cy="17.5" r="2.4" fill="var(--ink)" />
              <circle cx="34.6" cy="17.5" r="2.4" fill="var(--ink)" />
            </svg>
            <span className={s.logoWord}>Sketch2Design</span>
          </Link>
          <span className={s.stepText} role="status">
            {view.stepText}
          </span>
          <div className={s.controls}>
            <span className={s.clock}>{view.clockText}</span>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={reset}>
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5.2 12.6 Q5 6.4 11.6 5.3 Q17.6 4.8 19 10.4 Q19.9 16.8 13.6 18.9 Q9.4 19.9 6.9 17.2" />
                <path d="M4.4 7.6 L5.3 12.8 L10 11.1" />
              </svg>
              Sıfırla
            </button>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={start}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M7.6 5 Q7.1 12 7.7 19.1 Q13.9 15.7 19.3 12.2 Q13.4 8.3 7.6 5 Z" />
              </svg>
              {startLabel}
            </button>
          </div>
        </header>

        <main className={s.main}>
          <svg aria-hidden="true" width="1824" height="760" className={s.mainArrows}>
            <path className={s.arrowA} d="M312 250 C328 232 340 262 352 236 S372 222 394 214" />
            <path className={s.arrowA} d="M380 206 L396 213 L386 226" />
            <path className={s.arrowZ} d="M1428 208 L1478 208" />
            <path className={s.arrowZ} d="M1469 202 L1479 208 L1469 214" />
          </svg>

          <section aria-label="Giriş: kroki" className={s.colSketch}>
            <div className={s.sketchTitle}>
              <span className={s.handTitle}>senin krokin</span>
              <svg aria-hidden="true" width="46" height="44" viewBox="0 0 46 44">
                <path d="M4 8 C18 4 30 10 32 24 S30 36 28 40" fill="none" stroke="var(--chalk)" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M21 33 L28 41 L35 33" fill="none" stroke="var(--chalk)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={s.sketchCard}>
              <span className={s.tape} aria-hidden="true" style={{ left: -14, top: -10, width: 74, transform: "rotate(-24deg)" }} />
              <span className={s.tape} aria-hidden="true" style={{ right: -16, top: -6, width: 70, transform: "rotate(18deg)" }} />
              <div className={s.sketchInner}>
                <SketchPreview w={296} reveal={view.reveal} ask={view.askMode} answer={view.answer} image={sketchImage} elements={view.elements} />
              </div>
            </div>
            <div className={s.found}>
              <span>{view.foundText}</span>
              <span className={s.hash}>sketchHash {view.sketchHashText}</span>
            </div>
          </section>

          <section aria-label="Agent'lar" className={s.colAgents}>
            <div className={s.slots}>
              <svg aria-hidden="true" width="1060" height="357" className={s.slotArrows}>
                <path className={s.arrowA} d="M192 212 C199 202 206 220 213 206 S226 214 232 207" />
                <path className={s.arrowA} d="M222 199 L233 207 L222 215" />
                <path className={s.arrowB} d="M404 210 C412 203 420 215 428 207 S438 210 444 207" />
                <path className={s.arrowB} d="M434 200 L445 207 L434 214" />
                <path className={s.arrowC} d="M616 208 C628 205 636 211 656 207" />
                <path className={s.arrowC} d="M646 200 L657 207 L646 214" />
                <path className={s.arrowZ} d="M828 208 L868 208" />
                <path className={s.arrowZ} d="M859 202 L869 208 L859 214" />
              </svg>
              {view.slots.map((slot) => (
                <AgentSlot
                  key={slot.id}
                  slot={slot}
                  onOpen={(id) => {
                    setPid(id);
                    setPanelOpen(true);
                  }}
                />
              ))}
            </div>

            <LoopArrow loop={view.loop} chips={view.scoreChips} />
            <SpecCard spec={view.spec} />

            <div className={s.bottomRow}>
              <ul aria-label="Son olaylar" className={s.events}>
                {view.events.length === 0 && <li className={s.noEvents}>Başlatınca olanlar burada akar.</li>}
                {view.events.map((e, i) => (
                  <li key={i} style={{ opacity: e.op }}>
                    <span className={s.evTime}>{e.time}</span>
                    <span>
                      <b>{e.who}</b> {e.t}
                    </span>
                  </li>
                ))}
              </ul>
              <div className={s.score}>
                <span className={s.scoreLabel}>Eleştirmen skoru</span>
                <span className={`${s.scoreBig} ${s[view.scoreTone]}`}>{view.scoreBig}</span>
              </div>
            </div>
          </section>

          <section aria-label="Çıkış: tasarım" className={s.colOut}>
            <div className={s.outHead}>
              <span className={s.outTitle}>Çıktı</span>
              <span className={s.outLabel}>{view.outLabel}</span>
            </div>
            <div className={`${s.outWrap} ${view.outBusy ? s.busy : ""}`}>
              <ScaledOutput level={view.outLevel} width={320} radius={8} frame={view.outFrame} />
            </div>
            <div className={s.palette} style={{ opacity: view.paletteDim ? 0.25 : 1 }}>
              {(view.palette?.colors ?? PALETTES[0].c).map((hex) => (
                <span key={hex} className={s.sw} style={{ background: hex }} />
              ))}
              <span className={s.swText}>{view.palette ? view.palette.font : "Bricolage · Geist"}</span>
            </div>
          </section>
        </main>

        <JsonDrawer lines={view.jsonLines} fields={view.jsonFields} open={jsonOpen} onToggle={() => setJsonOpen((o) => !o)} />
        <Timeline segs={view.segs} note={view.timelineNote} />

        {view.showAsk && view.question && (
          <QuestionModal text={view.question.text} options={view.question.options} defaultAnswer={view.question.defaultAnswer} hint={view.askHint} onAnswer={answer} />
        )}

        <AgentPanel detail={detail} open={panelOpen} onClose={closePanel} askMode={view.askMode} answer={view.answer} scoreChips={view.scoreChips} sketchImage={sketchImage} elements={view.elements} />
      </div>
    </div>
  );
}
