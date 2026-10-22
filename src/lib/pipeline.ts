// Sunucudaki agent hattı: Okuyucu → Tasarımcı → Üretici ⇄ Eleştirmen → Noter.
// Okuyucu, Tasarımcı, Üretici ve Eleştirmen gerçek (Gemini); Noter şimdilik senaryolu.
// Her aşama lib/events.ts olaylarını run'a yollar; hata olursa o agent'ı hata durumuna sokup çalışmayı bitirir.

import "server-only";
import { MAX_ROUNDS, concludeReview, handBackToGenerator, rejectVerdict, runCritic, type Verdict } from "./agents/critic";
import { runDesigner } from "./agents/designer";
import { runGenerator } from "./agents/generator";
import { runNotary } from "./agents/notary";
import { runReader } from "./agents/reader";
import { later } from "./agents/util";
import type { CharacterId } from "@/components/character/faces";
import { LLMError, getModel, type LLMErrorKind, type LLMMeter } from "./llm";
import type { RunSession } from "./runs";
import type { PartialDesignSpec } from "./spec";

export interface PipelineInput {
  /** Kroki PNG, base64 (data URL öneki olmadan) */
  imageBase64: string;
  formatName: string;
  canvas: [number, number];
  paletteName: string;
  /** Kullanıcının seçtiği renkler (özel renkler önce, sonra hazır palet); yoksa Tasarımcı seçer */
  paletteColors: string[] | null;
  description: string;
}

const TIRED = "Biraz yoruldum, birazdan tekrar deneyelim.";
const FRIENDLY: Record<LLMErrorKind, string> = {
  rate_limit: TIRED,
  overloaded: TIRED,
  timeout: TIRED,
  network: "Bağlantım koptu, birazdan tekrar deneyelim.",
  invalid_json: "Notlarım karıştı, bir daha deneyelim.",
  config: "Anahtarım eksik. .env.local'e GEMINI_API_KEY ekle.",
  auth: "Anahtarım geçmiyor. .env.local'deki GEMINI_API_KEY'i kontrol et.",
  not_found: "Model bulunamadı. .env.local'deki GEMINI_MODEL'i kontrol et.",
  other: TIRED,
};

/** Hatayı agent_error olarak yollar (kullanıcıya dönük cümle + gerçek sebep) ve terminale tek satır yazar. */
function failAgent(run: RunSession, agent: CharacterId, err: unknown, meter: LLMMeter) {
  const e = err instanceof LLMError ? err : new LLMError("other", String(err), err);
  const reason = { kind: e.kind, status: e.status, model: e.model ?? meter.model ?? getModel(), detail: e.message.slice(0, 600) };
  console.error(
    `[run ${run.id}] ✖ ${agent.toUpperCase()} BAŞARISIZ | tür=${reason.kind} | http=${reason.status ?? "-"} | model=${reason.model} | istek=${meter.requests} | neden: ${reason.detail.replace(/\s+/g, " ")}`,
  );
  run.emit({ type: "agent_error", agent, message: FRIENDLY[e.kind], reason });
  run.emit({ type: "run_finished" });
}

const snap = (m: LLMMeter) => ({ ...m, at: Date.now() });

/** Aşama başına istek, token ve süre özeti (sunucu konsolu). */
function logStage(run: RunSession, name: string, m: LLMMeter, s: ReturnType<typeof snap>) {
  console.info(
    `[run ${run.id}] ${name.padEnd(10)} istek=${m.requests - s.requests} | token giriş=${m.inputTokens - s.inputTokens} çıkış=${m.outputTokens - s.outputTokens} düşünme=${m.thoughtTokens - s.thoughtTokens} toplam=${m.totalTokens - s.totalTokens} | ${((Date.now() - s.at) / 1000).toFixed(1)} sn`,
  );
}

export async function runPipeline(run: RunSession, input: PipelineInput, meter: LLMMeter): Promise<void> {
  let current: CharacterId = "reader";
  const startedAt = Date.now();
  let mark = snap(meter);
  const stage = (name: string) => {
    logStage(run, name, meter, mark);
    mark = snap(meter);
  };
  try {
    // 1) Okuyucu
    const elements = await runReader(
      run,
      { imageBase64: input.imageBase64, formatName: input.formatName, paletteName: input.paletteName, description: input.description },
      meter,
    );
    stage("okuyucu");
    later(run, 800, () => run.emit({ type: "agent_bubble", agent: "reader", kind: "done", text: null }));

    // 2) Tasarımcı
    current = "designer";
    const spec: PartialDesignSpec = await runDesigner(
      run,
      { elements, formatName: input.formatName, canvas: input.canvas, paletteName: input.paletteName, paletteColors: input.paletteColors, description: input.description },
      input.imageBase64,
      meter,
    );
    stage("tasarımcı");
    later(run, 800, () => run.emit({ type: "agent_bubble", agent: "designer", kind: "done", text: null }));

    // 3) Üretici ⇄ Eleştirmen: eşik geçilene ya da 3 tur dolana kadar
    const verdicts: Verdict[] = [];
    let html: string | undefined;
    let feedback: string | undefined;
    for (let n = 1; n <= MAX_ROUNDS; n++) {
      current = "generator";
      if (n === 1) run.emit({ type: "agent_started", agent: "generator", attempt: 1 });
      else await handBackToGenerator(run, n);
      html = await runGenerator(
        run,
        {
          attempt: n,
          spec,
          elements,
          formatName: input.formatName,
          canvas: input.canvas,
          imageBase64: input.imageBase64,
          description: input.description,
          previousHtml: html,
          feedback,
        },
        meter,
      );
      stage(`üretici ${n}`);

      current = "critic";
      const verdict = await runCritic(
        run,
        { attempt: n, html, spec, elements, formatName: input.formatName, canvas: input.canvas, imageBase64: input.imageBase64, description: input.description },
        meter,
      );
      verdicts.push(verdict);
      stage(`eleştirmen ${n}`);
      if (verdict.passed || n === MAX_ROUNDS) break;
      rejectVerdict(run, verdict);
      feedback = verdict.feedback;
    }
    const { passed } = concludeReview(run, verdicts);
    // Eşik geçilemediyse dürüst açıklama balonda daha uzun kalır
    later(run, passed ? 700 : 5000, () => run.emit({ type: "agent_bubble", agent: "critic", kind: "done", text: null }));

    // 4) Noter
    current = "notary";
    await runNotary(run);
    run.emit({ type: "run_finished" });
  } catch (err) {
    if (run.closed) return;
    failAgent(run, current, err, meter);
  } finally {
    console.info(
      `[run ${run.id}] ÖZET model=${meter.model ?? getModel()} | istek=${meter.requests} | token giriş=${meter.inputTokens} çıkış=${meter.outputTokens} düşünme=${meter.thoughtTokens} toplam=${meter.totalTokens} | toplam süre=${((Date.now() - startedAt) / 1000).toFixed(1)} sn`,
    );
  }
}
