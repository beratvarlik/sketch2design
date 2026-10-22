// SceneState + gerçek zaman → ekranın görünümü. Saf fonksiyonlar; bileşenler yalnızca bunu bilir.

import { CHARACTER_IDS, STATE_NAMES, type CharacterId, type CharacterState } from "@/components/character/faces";
import type { Answer, FoundElement } from "./events";
import { AGENTS, AUTO, OUT_LABELS, SCORE_THRESHOLD, SLOT_W, SPEC_W, TIMELINE_PLAN, findAgent } from "./agents";
import { nowOf, type SceneState } from "./sceneState";
import { SPEC_LINES, SPEC_SECTIONS } from "./spec";

export type { Answer };
export type Tone = "pass" | "fail" | "warn" | "none";
export type StepDot = "done" | "active" | "idle";

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

export function fmt1(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");
}

export function clock(T: number) {
  const m = Math.floor(T / 60);
  const s = T - m * 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s.toFixed(1).replace(".", ",");
}

/** Agent'ın şimdiye kadar çalıştığı süre (sn). */
export function accrued(state: SceneState, id: CharacterId, now: number) {
  let sum = 0;
  state.agents[id].intervals.forEach(([start, end]) => {
    if (now > start) sum += Math.min(now, end ?? Infinity) - start;
  });
  return sum;
}

// ---------- görünüm tipleri ----------

export interface BubbleView {
  show: boolean;
  kind: "work" | "ask" | "done" | "err";
  text: string;
  steps?: StepDot[];
}

export interface SlotView {
  id: CharacterId;
  name: string;
  state: CharacterState;
  working: boolean;
  align: "l" | "c" | "r";
  bubble: BubbleView;
  chip: string;
  tone: "on" | "ok" | "bad" | "";
}

export interface ScoreChip {
  v: string;
  tone: Tone;
  cur: boolean;
  arrow: string;
}

export interface SegView {
  id: CharacterId;
  name: string;
  flex: number;
  fill: number;
  divs: number[];
  dur: string;
  current: boolean;
}

export interface SceneView {
  started: boolean;
  clockText: string;
  stepText: string;
  slots: SlotView[];
  states: Record<CharacterId, CharacterState>;
  askMode: "pending" | "asking" | "answered";
  answer: Answer;
  reveal: number;
  /** Okuyucunun gerçek sonuçları (boşsa demo kroki kutuları kullanılır) */
  elements: FoundElement[];
  question: { text: string; options: string[]; defaultAnswer: Answer } | null;
  foundText: string;
  sketchHashText: string;
  spec: { visible: boolean; returning: boolean; left: number; version: number; fields: number; owner: string };
  loop: { on: boolean; hot: boolean };
  scoreChips: ScoreChip[];
  scoreBig: string;
  scoreTone: Tone;
  events: { who: string; t: string; time: string; op: number }[];
  jsonLines: { k: string; v: string; pad: number; isNew: boolean }[];
  jsonFields: number;
  showAsk: boolean;
  askHint: string;
  outLevel: number;
  outLabel: string;
  outBusy: boolean;
  paletteDim: boolean;
  segs: SegView[];
  timelineNote: string;
}

const SPEC_ORDER: CharacterId[] = ["reader", "designer", "generator", "critic", "notary"];

function bubbleView(state: SceneState, id: CharacterId): BubbleView {
  const b = state.agents[id].bubble;
  if (!b) return { show: false, kind: "work", text: "" };
  const steps = b.step
    ? Array.from({ length: b.step.total }, (_, i): StepDot => (i < b.step!.index ? "done" : i === b.step!.index ? "active" : "idle"))
    : undefined;
  return { show: true, kind: b.kind, text: b.text, steps };
}

export function deriveScene(state: SceneState, T: number): SceneView {
  const now = nowOf(state, T);
  const started = state.status !== "idle";
  const answered = state.answer !== null;
  const answer: Answer = state.answer?.value ?? "Buton";
  const states = {} as Record<CharacterId, CharacterState>;
  CHARACTER_IDS.forEach((id) => {
    states[id] = state.agents[id].state;
  });

  const slots: SlotView[] = AGENTS.map((a, i) => {
    const st = states[a.id];
    let chip: string = STATE_NAMES[st];
    if (st === "done") chip = "bitti · " + fmt1(accrued(state, a.id, now)) + " sn";
    const tone = st === "working" || st === "asking" ? "on" : st === "done" ? "ok" : st === "error" ? "bad" : "";
    return { id: a.id, name: a.name, state: st, working: st === "working", align: i === 0 ? "l" : i === 4 ? "r" : "c", bubble: bubbleView(state, a.id), chip, tone };
  });

  const attempt = (state.spec.render as { attempts?: number } | undefined)?.attempts ?? 1;
  let stepText = "Hazır. Başlat’a bas, ekip işe koyulsun.";
  if (started) {
    if (states.reader === "working") stepText = "Okuyucu krokini okuyor";
    else if (states.reader === "asking") stepText = "Okuyucu sana bir şey soruyor";
    else if (states.designer !== "done") stepText = "Tasarımcı spec’i kuruyor";
    else if (state.owner !== "notary") stepText = "Üretici ile Eleştirmen pazarlıkta · deneme " + attempt;
    else if (!state.seal) stepText = "Noter mühür basıyor";
    else stepText = "Bitti. Tasarım zincirde.";
  }

  // JSON çekmecesi: şablon satırları, yamalar geldikçe görünür
  const jsonLines: SceneView["jsonLines"] = [];
  let fields = 0;
  SPEC_LINES.forEach((l) => {
    if (l.path && state.spec[l.path] === undefined) return;
    if (l.field) fields++;
    const at = l.path ? state.patchedAt[l.path] : undefined;
    jsonLines.push({ k: l.k, v: l.v(state.spec), pad: l.ind * 18, isNew: at !== undefined && started && now - at < 2.2 });
  });
  const sections = SPEC_SECTIONS.filter((s) => state.spec[s] !== undefined).length;

  // Spec kartı: en son görevi alan agent'ın hizasında
  const ownerId = state.owner ?? "reader";
  const idx = SPEC_ORDER.indexOf(ownerId);
  const returning = states.generator === "error";

  const lastScore = state.scores.length ? state.scores[state.scores.length - 1] : null;
  const scoreChips: ScoreChip[] = [0, 1, 2].map((i) => {
    const sc = state.scores[i];
    return {
      v: sc ? sc.score.toFixed(2) : "—",
      tone: sc ? (sc.score >= SCORE_THRESHOLD ? "pass" : "fail") : "none",
      cur: !!sc && sc === lastScore,
      arrow: i < 2 ? "→" : "",
    };
  });

  const loopOn = state.agents.critic.intervals.length > 0 && state.owner !== "notary";

  const events = state.log
    .map((l) => ({ who: l.agent === "user" ? "Sen" : findAgent(l.agent).name, t: l.text, time: clock(l.realT), op: 1 }))
    .reverse()
    .slice(0, 3);
  events.forEach((e, i) => {
    e.op = 1 - i * 0.25;
  });

  const segs: SegView[] = AGENTS.map((a) => {
    const tot = TIMELINE_PLAN[a.id];
    const acc = Math.max(0, accrued(state, a.id, now));
    const st = states[a.id];
    const divs = a.id === "generator" ? [38.4, 71.2] : a.id === "critic" ? [37.5, 68.75] : [];
    return {
      id: a.id,
      name: a.name,
      flex: tot,
      fill: r1(Math.min(100, (acc / tot) * 100)),
      divs,
      dur: fmt1(acc > 0 ? acc : tot) + " sn",
      current: started && (st === "working" || st === "asking" || st === "error"),
    };
  });

  const real = state.elements.length > 0;
  const reveal = real ? state.elements.length : now < 1.5 ? 0 : Math.min(9, Math.floor((now - 1.5) / 0.4) + 1);
  const avgConf = real ? state.elements.reduce((sum, el) => sum + el.confidence, 0) / state.elements.length : 0.89;
  const q = state.question;
  const remaining = q ? Math.max(0, Math.ceil(q.timeoutSec - (T - (q.at + state.wait)))) : AUTO;

  return {
    started,
    clockText: clock(T),
    stepText,
    slots,
    states,
    askMode: answered ? "answered" : q ? "asking" : "pending",
    answer,
    reveal,
    elements: state.elements,
    question: q ? { text: q.text, options: q.options, defaultAnswer: q.defaultAnswer } : null,
    foundText: reveal > 0 ? `${reveal} öğe · ort. güven ${avgConf.toFixed(2)}` : "henüz okunmadı",
    sketchHashText: (state.spec["provenance.sketchHash"] as string | undefined) ?? "—",
    spec: {
      visible: started,
      returning,
      left: r1(SLOT_W * idx + (SLOT_W - SPEC_W) / 2),
      version: sections,
      fields,
      owner: findAgent(ownerId).name,
    },
    loop: { on: loopOn, hot: returning || states.critic === "error" },
    scoreChips,
    scoreBig: states.critic === "working" ? "…" : lastScore ? lastScore.score.toFixed(2) : "—",
    scoreTone: lastScore ? (lastScore.score >= SCORE_THRESHOLD ? "pass" : "fail") : "none",
    events,
    jsonLines,
    jsonFields: fields,
    showAsk: started && !!q,
    askHint: `${q ? remaining : AUTO} sn içinde seçmezsen ben "${(q?.defaultAnswer ?? "Buton").toLowerCase()}" derim.`,
    outLevel: state.output.level,
    outLabel: state.output.label ?? OUT_LABELS[state.output.level],
    outBusy: state.output.busy,
    paletteDim: state.output.level < 2,
    segs,
    timelineNote: !started ? "Toplam süre" : states.reader === "asking" ? "Senin cevabını bekliyoruz…" : "Geçen süre " + clock(T),
  };
}

// ---------- agent ayrıntı paneli ----------

export interface AgentDetail {
  info: ReturnType<typeof findAgent>;
  state: CharacterState;
  stateLabel: string;
  dur: string;
  els?: { n: string; c: string; w: number; tone: Tone }[];
  answerText?: string;
  askedText?: string;
  attempts?: { n: number; lvl: number; note: string; dur: string; score: string; tone: Tone }[];
  attemptCount?: string;
  cmpLevel?: number;
  cmpLabel?: string;
  crit?: { n: string; v: string; w: number }[];
  sealed?: boolean;
  h1?: string;
  h2?: string;
  h3?: string;
}

export function deriveAgentDetail(id: CharacterId, state: SceneState, T: number): AgentDetail {
  const now = nowOf(state, T);
  const info = findAgent(id);
  const st = state.agents[id].state;
  const acc = accrued(state, id, now);
  const d: AgentDetail = { info, state: st, stateLabel: STATE_NAMES[st], dur: acc > 0 ? fmt1(acc) + " sn" : "—" };
  const answered = state.answer !== null;
  const ansLow = state.answer?.value === "Görsel" ? "görsel" : "buton";

  if (id === "reader" && state.elements.length > 0) {
    d.els = state.elements.map((el) => ({
      n: `${el.type}#${el.id}${el.note ? " · " + el.note : ""}`,
      c: el.confidence.toFixed(2),
      w: Math.round(el.confidence * 100),
      tone: el.confidence < 0.7 && !el.confirmed ? "warn" : "none",
    }));
    d.askedText = state.asked?.text ?? "—";
    const a = state.answer;
    d.answerText = a ? a.value + (a.skipped ? " (atlandı)" : a.auto ? " (süre doldu)" : "") : state.asked ? "bekleniyor" : "soru gerekmedi";
  } else if (id === "reader") {
    d.askedText = state.asked?.text;
    const els: [string, number][] = [["menü", 0.97], ["başlık", 0.95], ["alt metin", 0.88], ["görsel", 0.93], ["kutu#5", answered ? 0.96 : 0.52], ["kart", 0.90], ["kart", 0.89], ["kart", 0.91], ["alt bilgi", 0.84]];
    d.els = els.map((e, i) => ({
      n: i === 4 ? (answered ? "kutu#5 → " + ansLow : "kutu#5 · belirsiz") : e[0],
      c: e[1].toFixed(2),
      w: Math.round(e[1] * 100),
      tone: i === 4 && !answered ? "warn" : "none",
    }));
    const a = state.answer;
    d.answerText = a ? a.value + (a.skipped ? " (atlandı)" : a.auto ? " (süre doldu)" : "") : "bekleniyor";
  }
  if (id === "generator") {
    d.attempts = state.drafts
      .filter((x) => x.note !== undefined)
      .map((x): NonNullable<AgentDetail["attempts"]>[number] => ({
        n: x.attempt,
        lvl: x.level,
        note: x.note ?? "",
        dur: fmt1(x.durationSec ?? 0) + " sn",
        score: x.score !== undefined ? x.score.toFixed(2) : "—",
        tone: x.score !== undefined && x.score >= SCORE_THRESHOLD ? "pass" : "fail",
      }));
    d.attemptCount = d.attempts.length + " / 3";
  }
  if (id === "critic") {
    const ci = state.scores.length - 1;
    d.cmpLevel = ci >= 0 ? state.drafts.find((x) => x.attempt === state.scores[ci].attempt)?.level ?? state.output.level : Math.max(state.output.level, 3);
    d.cmpLabel = ci >= 0 ? "taslak " + state.scores[ci].attempt : "taslak";
    const crit = ci >= 0 ? state.scores[ci].criteria : [["Yerleşim uyumu", 0], ["Öğe eşleşmesi", 0], ["Hiyerarşi", 0], ["Kontrast", 0]] as [string, number][];
    d.crit = crit.map((c) => ({ n: c[0], v: ci >= 0 ? c[1].toFixed(2) : "—", w: ci >= 0 ? Math.round(c[1] * 100) : 0 }));
  }
  if (id === "notary") {
    d.sealed = state.seal !== null;
    d.h1 = (state.spec["provenance.sketchHash"] as string | undefined) ?? "henüz yok";
    d.h2 = (state.spec["provenance.specHash"] as string | undefined) ?? "henüz yok";
    d.h3 = (state.spec["provenance.tx"] as string | undefined) ?? "gönderilmedi";
  }
  return d;
}
