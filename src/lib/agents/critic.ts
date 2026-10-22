// Eleştirmen: kroki görselini ve Üretici'nin HTML'ini karşılaştırır; dört kritere 0–1 puan verir,
// ortalamayı skor yapar. Skor eşiğin altındaysa somut geri bildirimle Üretici'ye geri yollar (en fazla 3 tur);
// eşik geçilemezse en yüksek skorlu taslakla devam eder ve bunu kullanıcıya dürüstçe söyler.

import "server-only";
import { z } from "zod";
import type { FoundElement } from "../events";
import { generateJSON, type LLMMeter } from "../llm";
import type { RunSession } from "../runs";
import type { PartialDesignSpec } from "../spec";
import { CRITIC_SYSTEM } from "./critic.prompt";
import { sleep } from "./util";

export const SCORE_THRESHOLD = 0.85;
export const MAX_ROUNDS = 3;

export const CRITERIA = ["Yerleşim uyumu", "Öğe eşleşmesi", "Hiyerarşi", "Kontrast"] as const;

const criterion = z.object({ score: z.number().min(0).max(1), note: z.string().min(1) });

export const criticSchema = z.object({
  layout: criterion,
  match: criterion,
  hierarchy: criterion,
  contrast: criterion,
  /** Üretici'ye 1–3 somut, uygulanabilir düzeltme */
  feedback: z.string().min(1),
  /** Skor eşiğin altında kalırsa söylenecek tek cümle */
  bubbleRejected: z.string().min(1),
  /** Skor eşiği geçerse söylenecek tek cümle */
  bubbleApproved: z.string().min(1),
});
export type CriticOutput = z.infer<typeof criticSchema>;

export interface Verdict {
  attempt: number;
  score: number;
  passed: boolean;
  criteria: [string, number][];
  notes: string[];
  feedback: string;
  bubble: string;
}

export interface CriticInput {
  attempt: number;
  html: string;
  spec: PartialDesignSpec;
  elements: FoundElement[];
  formatName: string;
  canvas: [number, number];
  imageBase64: string;
  description: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Dört kriterin ortalaması (iki ondalık). */
export function averageScore(values: number[]): number {
  return round2(values.reduce((a, b) => a + b, 0) / values.length);
}

function buildPrompt(input: CriticInput): string {
  const els = input.elements.map((e) => `#${e.id} ${e.type} kutu[x1,y1,x2,y2]=[${e.box.join(",")}] (${e.note})`).join("\n");
  return `"${input.formatName}" tasarımı, tuval ${input.canvas[0]}×${input.canvas[1]} piksel.${input.description ? ` Kullanıcının açıklaması: "${input.description}".` : ""}
Ekteki görsel kullanıcının el çizimi krokisi. Üretici'nin ${input.attempt}. taslağı aşağıdaki HTML'dir.

Krokideki öğeler (koordinatlar 0–1000):
${els}

design-spec:
${JSON.stringify(input.spec)}

Üretici'nin HTML'i:
${input.html}

Şunları ver:
- layout, match, hierarchy, contrast: her biri için {score (0–1), note (somut gözlem, tek cümle)}.
- feedback: Üretici'ye 1–3 somut düzeltme (hangi öğe, ne yapılacak; mümkünse piksel/renk ver). Tasarım çok iyiyse küçük bir iyileştirme öner.
- bubbleRejected: puan ${SCORE_THRESHOLD} eşiğinin altında kalırsa Eleştirmen'in söyleyeceği tek kısa cümle (en çok ~9 kelime), en büyük sorunu söyle; ör. "Başlık krokidekinden küçük kalmış, bir tur daha."
- bubbleApproved: puan eşiği geçerse söyleyeceği tek kısa cümle; ör. "Peki, ikna oldum."
Yalnızca şemaya uygun JSON döndür.`;
}

/** Eleştirmen göreve başlar, taslağı puanlar ve hükmü olay olarak yollar. Başarısızsa LLMError fırlatır. */
export async function runCritic(run: RunSession, input: CriticInput, meter?: LLMMeter): Promise<Verdict> {
  const n = input.attempt;
  run.emit({ type: "agent_done", agent: "generator", final: false });
  run.emit({ type: "agent_started", agent: "critic", attempt: n });
  run.emit({ type: "agent_step", agent: "critic", index: 0, total: 1, label: n === 1 ? "Krokiyle yan yana koyuyorum…" : "Bakalım bu sefer ne yapmış…" });
  if (n === 1) run.emit({ type: "spec_patch", path: "review", value: {} });

  const out = await generateJSON({
    system: CRITIC_SYSTEM,
    prompt: buildPrompt(input),
    images: [{ mimeType: "image/png", data: input.imageBase64 }],
    schema: criticSchema,
    signal: run.abort.signal,
    meter,
    timeoutMs: 60_000,
  });

  const values = [out.layout.score, out.match.score, out.hierarchy.score, out.contrast.score].map(round2);
  const score = averageScore(values);
  const passed = score >= SCORE_THRESHOLD;
  const criteria = CRITERIA.map((name, i): [string, number] => [name, values[i]]);
  const notes = [out.layout.note, out.match.note, out.hierarchy.note, out.contrast.note];
  const bubble = passed ? out.bubbleApproved : out.bubbleRejected;

  run.emit({
    type: "critic_score",
    attempt: n,
    score,
    passed,
    criteria,
    log: { agent: "critic", text: passed ? `${score.toFixed(2)} verdi, onayladı` : `${score.toFixed(2)} verdi, geri yolladı` },
  });
  run.emit({ type: "spec_patch", path: "review.score", value: score });
  run.emit({ type: "spec_patch", path: "review.passed", value: passed });

  const weak = criteria
    .map(([name, v], i) => ({ name, v, note: notes[i] }))
    .sort((a, b) => a.v - b.v)
    .slice(0, 2)
    .map((c) => `${c.name} ${c.v.toFixed(2)}: ${c.note}`)
    .join("\n- ");
  return { attempt: n, score, passed, criteria, notes, feedback: `${out.feedback}\n\nEn zayıf kriterler:\n- ${weak}`, bubble };
}

/** Skor eşiğin altında: Eleştirmen "tekrar" yüzüne geçer, nedenini söyler. */
export function rejectVerdict(run: RunSession, v: Verdict) {
  run.emit({ type: "agent_error", agent: "critic" });
  run.emit({ type: "agent_bubble", agent: "critic", kind: "err", text: v.bubble });
}

/** Geri yollama: iş Üretici'ye döner (Eleştirmen'in "tekrar" yüzü kısa süre kalır). */
export async function handBackToGenerator(run: RunSession, nextAttempt: number): Promise<void> {
  await sleep(run, 1400);
  run.emit({ type: "agent_started", agent: "generator", attempt: nextAttempt });
  run.emit({ type: "agent_error", agent: "generator" });
  await sleep(run, 600);
  run.emit({ type: "agent_done", agent: "critic", final: false });
}

/**
 * Döngü bitti: ya bir taslak eşiği geçti ya da 3 tur doldu. Geçemediyse en yüksek skorlu taslak seçilir
 * (eşitlikte sonraki tur) ve kullanıcıya bunun dürüstçe söylenir.
 */
export function concludeReview(run: RunSession, verdicts: Verdict[]): { best: Verdict; passed: boolean } {
  const passedOne = verdicts.find((v) => v.passed);
  const best = passedOne ?? verdicts.reduce((m, v) => (v.score >= m.score ? v : m));
  const passed = !!passedOne;

  run.emit({ type: "agent_done", agent: "generator", final: true });
  if (passed) {
    run.emit({ type: "agent_done", agent: "critic", final: true, message: best.bubble });
  } else {
    const msg = `${verdicts.length} tur oldu ama ${SCORE_THRESHOLD.toFixed(2)} eşiğini geçemedik. En iyisi taslak ${best.attempt} (${best.score.toFixed(2)}), onunla devam.`;
    run.emit({
      type: "agent_done",
      agent: "critic",
      final: true,
      message: msg,
      log: { agent: "critic", text: `eşik geçilemedi, en iyi taslak ${best.attempt} (${best.score.toFixed(2)}) seçildi` },
    });
  }
  // Nihai skor ve karar (seçilen taslağınki)
  run.emit({ type: "spec_patch", path: "review.score", value: best.score });
  run.emit({ type: "spec_patch", path: "review.passed", value: passed });
  run.emit({
    type: "output_update",
    level: 6,
    label: `taslak ${best.attempt} · ${passed ? "onaylı" : "eşik altı"}`,
    busy: false,
    selected: best.attempt,
  });
  return { best, passed };
}
