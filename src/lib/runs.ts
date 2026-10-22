// Sunucu tarafında çalışan bir agent hattı oturumu: olayları SSE'ye akıtır, script saatini tutar,
// kullanıcıya sorulan sorunun cevabını bekler. Oturumlar bellekte tutulur (tek sunucu süreci).

import "server-only";
import { randomUUID } from "node:crypto";
import type { AgentEvent } from "./events";

type Emittable = { [K in AgentEvent["type"]]: Omit<Extract<AgentEvent, { type: K }>, "t"> }[AgentEvent["type"]];

interface Pending {
  options: string[];
  defaultAnswer: string;
  wallStart: number;
  resolve: (answer: { value: string; auto: boolean }) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class RunSession {
  readonly id = randomUUID();
  readonly abort = new AbortController();
  private startedAt = Date.now();
  private waited = 0;
  private pendingAt: number | null = null;
  private pending: Pending | null = null;
  private sink: ((event: AgentEvent) => void) | null = null;
  closed = false;

  /** Script saniyesi: soru beklerken durur. */
  t(): number {
    if (this.pendingAt !== null) return this.pendingAt;
    return (Date.now() - this.startedAt - this.waited) / 1000;
  }

  attach(sink: (event: AgentEvent) => void) {
    this.sink = sink;
  }

  /** Olayı şu anki script saniyesiyle damgalayıp akıtır. */
  emit(event: Emittable) {
    if (this.closed) return;
    this.sink?.({ ...event, t: Math.round(this.t() * 100) / 100 } as AgentEvent);
  }

  /** Soruyu sorar ve cevabı bekler; süre dolarsa (küçük bir toleransla) varsayılan cevapla devam eder. */
  ask(options: string[], defaultAnswer: string, timeoutSec: number): Promise<{ value: string; auto: boolean }> {
    this.pendingAt = this.t();
    return new Promise((resolve) => {
      const wallStart = Date.now();
      const finish = (value: string, auto: boolean) => {
        if (!this.pending) return;
        clearTimeout(this.pending.timer);
        this.waited += Date.now() - wallStart;
        this.pending = null;
        this.pendingAt = null;
        resolve({ value, auto });
      };
      const timer = setTimeout(() => finish(defaultAnswer, true), (timeoutSec + 3) * 1000);
      this.pending = { options, defaultAnswer, wallStart, timer, resolve: (a) => finish(a.value, a.auto) };
      this.abort.signal.addEventListener("abort", () => finish(defaultAnswer, true), { once: true });
    });
  }

  /** Kullanıcının cevabı. Geçerli bir seçenek değilse ya da soru yoksa false. */
  answer(value: string): boolean {
    const p = this.pending;
    if (!p || !p.options.includes(value)) return false;
    p.resolve({ value, auto: false });
    return true;
  }

  close() {
    this.closed = true;
    this.abort.abort();
    this.sink = null;
    registry().delete(this.id);
  }
}

const g = globalThis as unknown as { __s2dRuns?: Map<string, RunSession> };
function registry(): Map<string, RunSession> {
  return (g.__s2dRuns ??= new Map());
}

export function createRun(): RunSession {
  const run = new RunSession();
  registry().set(run.id, run);
  return run;
}

export function getRun(id: string): RunSession | undefined {
  return registry().get(id);
}
