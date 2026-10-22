// Olay akışının sahne durumuna indirgenmesi. Saf fonksiyon: aynı olaylar, aynı durum.
// Zamana bağlı her şey (süreler, vurgu, ilerleme) bu durum + güncel zaman ile deriveScene'de hesaplanır.

import type { CharacterId, CharacterState } from "@/components/character/faces";
import type { AgentEvent, Answer, ErrorReason, FoundElement } from "./events";
import type { SpecPath } from "./spec";

export type ScenarioStatus = "idle" | "running" | "finished";

export interface Bubble {
  kind: "work" | "ask" | "done" | "err";
  text: string;
  step?: { index: number; total: number };
}

export interface AgentRun {
  state: CharacterState;
  /** [başlangıç, bitiş] script saniyesi; bitiş null ise sürüyor */
  intervals: [number, number | null][];
  bubble: Bubble | null;
  /** Son hatanın gerçek sebebi (agent_error.reason) */
  error: ErrorReason | null;
}

export interface AskedQuestion {
  text: string;
  options: string[];
}

export interface QuestionState {
  /** Sorunun sorulduğu script zamanı (script saati burada durur) */
  at: number;
  text: string;
  options: Answer[];
  timeoutSec: number;
  defaultAnswer: Answer;
}

export interface ScoreEntry {
  attempt: number;
  score: number;
  passed: boolean;
  at: number;
  criteria: [string, number][];
}

export interface DraftEntry {
  attempt: number;
  level: number;
  note?: string;
  durationSec?: number;
  score?: number;
  html?: string;
  width?: number;
  height?: number;
  at: number;
}

export interface LogEntry {
  agent: CharacterId | "user";
  text: string;
  /** Olayın geldiği gerçek zaman (bekleme dahil) */
  realT: number;
}

export interface SceneState {
  status: ScenarioStatus;
  agents: Record<CharacterId, AgentRun>;
  /** Spec en son hangi agent'a geçti */
  owner: CharacterId | null;
  question: QuestionState | null;
  /** Sorulmuş son soru (cevaplandıktan sonra da kalır) */
  asked: AskedQuestion | null;
  /** Okuyucunun bulduğu öğeler */
  elements: FoundElement[];
  answer: { value: Answer; auto: boolean; skipped: boolean } | null;
  /** Sorularda toplam bekleme (gerçek sn) */
  wait: number;
  spec: Partial<Record<SpecPath, unknown>>;
  patchedAt: Partial<Record<SpecPath, number>>;
  scores: ScoreEntry[];
  drafts: DraftEntry[];
  output: { level: number; label: string | null; busy: boolean; selected: number | null };
  seal: { sketchHash: string; specHash: string; tx: string } | null;
  log: LogEntry[];
}

const IDS: CharacterId[] = ["reader", "designer", "generator", "critic", "notary"];

function agentsWith(state: CharacterState): Record<CharacterId, AgentRun> {
  const out = {} as Record<CharacterId, AgentRun>;
  IDS.forEach((id) => {
    out[id] = { state, intervals: [], bubble: null, error: null };
  });
  return out;
}

export const INITIAL_STATE: SceneState = {
  status: "idle",
  agents: agentsWith("portrait"),
  owner: null,
  question: null,
  asked: null,
  elements: [],
  answer: null,
  wait: 0,
  spec: {},
  patchedAt: {},
  scores: [],
  drafts: [],
  output: { level: 0, label: null, busy: false, selected: null },
  seal: null,
  log: [],
};

/** Güncel script zamanı: soru bekliyorsa sorunun anında durur, yoksa gerçek zaman − bekleme. */
export function nowOf(state: SceneState, T: number): number {
  if (state.status === "idle") return -1;
  return state.question ? state.question.at : T - state.wait;
}

function closeOpen(intervals: [number, number | null][], at: number): [number, number | null][] {
  return intervals.map((iv) => (iv[1] === null ? [iv[0], at] : iv));
}

function closeAll(state: SceneState, at: number): SceneState {
  const agents = { ...state.agents };
  IDS.forEach((id) => {
    agents[id] = { ...agents[id], intervals: closeOpen(agents[id].intervals, at) };
  });
  return { ...state, agents };
}

function patchAgent(state: SceneState, id: CharacterId, patch: Partial<AgentRun>): SceneState {
  return { ...state, agents: { ...state.agents, [id]: { ...state.agents[id], ...patch } } };
}

export function reduceScene(prev: SceneState, e: AgentEvent): SceneState {
  let s = prev;

  if (e.type === "user_answer") {
    s = { ...s, wait: e.waited, question: null, answer: { value: e.answer, auto: e.auto, skipped: e.skipped } };
  }

  switch (e.type) {
    case "run_started":
      s = { ...INITIAL_STATE, status: "running", agents: agentsWith("waiting") };
      break;
    case "run_finished":
      s = { ...closeAll(s, e.t), status: "finished" };
      break;
    case "agent_started": {
      // Spec tek sahiplidir: yeni agent görevi alınca diğerlerinin açık süresi kapanır
      IDS.forEach((id) => {
        if (id !== e.agent) s = patchAgent(s, id, { intervals: closeOpen(s.agents[id].intervals, e.t) });
      });
      s = patchAgent(s, e.agent, { intervals: [...s.agents[e.agent].intervals, [e.t, null]] });
      s = { ...s, owner: e.agent };
      break;
    }
    case "agent_step":
      s = patchAgent(s, e.agent, {
        error: null,
        state: "working",
        bubble: { kind: "work", text: e.label, step: e.total > 1 ? { index: e.index, total: e.total } : undefined },
      });
      break;
    case "agent_bubble":
      s = patchAgent(s, e.agent, { bubble: e.text === null ? null : { kind: e.kind, text: e.text } });
      break;
    case "agent_question":
      s = patchAgent(s, e.agent, { state: "asking", bubble: { kind: "ask", text: e.bubble } });
      s = { ...s, asked: { text: e.question, options: e.options }, question: { at: e.t, text: e.question, options: e.options, timeoutSec: e.timeoutSec, defaultAnswer: e.defaultAnswer } };
      break;
    case "agent_done": {
      s = patchAgent(s, e.agent, {
        state: e.final ? "done" : "waiting",
        bubble: e.message ? { kind: "done", text: e.message } : null,
      });
      break;
    }
    case "agent_error":
      s = patchAgent(s, e.agent, { state: "error", bubble: e.message ? { kind: "err", text: e.message } : null, error: e.reason ?? null });
      break;
    case "elements_found":
      s = { ...s, elements: e.elements };
      break;
    case "spec_patch":
      s = { ...s, spec: { ...s.spec, [e.path]: e.value }, patchedAt: { ...s.patchedAt, [e.path]: e.t } };
      break;
    case "critic_score":
      s = { ...s, scores: [...s.scores, { attempt: e.attempt, score: e.score, passed: e.passed, at: e.t, criteria: e.criteria }] };
      break;
    case "output_update":
      s = {
        ...s,
        output: { level: e.level, label: e.label ?? null, busy: e.busy ?? false, selected: e.selected ?? s.output.selected },
        drafts: e.draft ? [...s.drafts, { ...e.draft, level: e.level, at: e.t }] : s.drafts,
      };
      break;
    case "seal_done":
      s = { ...closeAll(s, e.t), seal: { sketchHash: e.sketchHash, specHash: e.specHash, tx: e.tx } };
      break;
    case "user_answer":
      s = {
        ...s,
        log: [
          ...s.log,
          {
            agent: "user",
            text: e.skipped ? 'soruyu atladın, "buton" kaldı' : `"${e.answer}" dedin` + (e.auto ? " (süre doldu)" : ""),
            realT: e.t + s.wait,
          },
        ],
      };
      break;
  }

  if (e.log) s = { ...s, log: [...s.log, { agent: e.log.agent, text: e.log.text, realT: e.t + s.wait }] };
  return s;
}
