// Üretici: design-spec + öğe listesi + kroki görselinden tek dosyalık, bağımsız HTML+CSS tasarım üretir.
// İlk turda sıfırdan, sonraki turlarda Eleştirmen'in notuyla bir önceki HTML'i düzelterek.

import "server-only";
import type { FoundElement } from "../events";
import { sanitizeDesignHtml } from "../html";
import { LLMError, generateText, type LLMMeter } from "../llm";
import type { RunSession } from "../runs";
import { DEMO_DRAFTS, DEMO_GEN_LABELS } from "../scenario";
import type { PartialDesignSpec } from "../spec";
import { GENERATOR_SYSTEM } from "./generator.prompt";

export interface GeneratorInput {
  /** 1–3 */
  attempt: number;
  spec: PartialDesignSpec;
  elements: FoundElement[];
  formatName: string;
  canvas: [number, number];
  /** Kroki, PNG base64 (data URL öneki olmadan) */
  imageBase64: string;
  description: string;
  previousHtml?: string;
  /** Eleştirmen'in bir önceki taslak için notu */
  feedback?: string;
}

function buildPrompt(input: GeneratorInput, problem?: string): string {
  const [w, h] = input.canvas;
  const els = input.elements.map((e) => `#${e.id} ${e.type} kutu[x1,y1,x2,y2]=[${e.box.join(",")}] (${e.note})`).join("\n");
  const head = `"${input.formatName}" tasarımı: tuval tam ${w}×${h} piksel. Ekteki el çizimi krokiye sadık kal.${input.description ? ` Kullanıcının açıklaması: "${input.description}".` : ""}

design-spec:
${JSON.stringify(input.spec, null, 1)}

Krokideki öğeler (koordinatlar 0–1000; x sağa, y aşağı; tuvalin yüzdesi olarak düşün):
${els}
`;
  const task = input.previousHtml
    ? `Bu bir DÜZELTME turu. Eleştirmen bir önceki taslak için şunu söyledi: "${input.feedback ?? "krokiye daha yakın ol"}".
Önceki taslak:
${input.previousHtml}

Önceki taslağı bu nota göre düzelt; geri kalanı koru. Tam HTML belgesini yeniden ver.`
    : "Şimdi tasarımı tek bir HTML belgesi olarak yaz.";
  return `${head}\n${task}${problem ? `\n\nÖNEMLİ: Önceki yanıtın kullanılamadı (${problem}). Yalnızca <!doctype html> ile başlayan tam HTML belgesini ver.` : ""}`;
}

/** Üretici'yi çalıştırır ve temizlenmiş HTML'i döndürür. Başarısızsa LLMError fırlatır. */
export async function runGenerator(run: RunSession, input: GeneratorInput, meter?: LLMMeter): Promise<string> {
  const n = input.attempt;
  const labels = DEMO_GEN_LABELS[n - 1];
  const [w, h] = input.canvas;
  const startedAt = Date.now();

  run.emit({ type: "agent_step", agent: "generator", index: 0, total: 2, label: labels[0] });
  run.emit({ type: "spec_patch", path: "render", value: { attempts: n } });
  run.emit({ type: "output_update", level: n + 2, busy: true });

  let problem: string | undefined;
  let html = "";
  for (let tryNo = 0; tryNo < 2; tryNo++) {
    const text = await generateText({
      system: GENERATOR_SYSTEM,
      prompt: buildPrompt(input, problem),
      images: [{ mimeType: "image/png", data: input.imageBase64 }],
      signal: run.abort.signal,
      meter,
      // Tam bir HTML belgesi uzun sürebilir
      timeoutMs: 90_000,
    });
    const checked = sanitizeDesignHtml(text, w, h);
    if (checked.ok) {
      html = checked.html;
      break;
    }
    problem = checked.reason;
  }
  if (!html) throw new LLMError("invalid_json", `Üretici geçerli HTML üretemedi: ${problem ?? "bilinmeyen"}`);

  const draft = DEMO_DRAFTS[n - 1];
  run.emit({ type: "agent_step", agent: "generator", index: 1, total: 2, label: labels[1] });
  run.emit({
    type: "output_update",
    level: n + 3,
    busy: false,
    draft: {
      attempt: n,
      note: draft.note,
      durationSec: Math.round(((Date.now() - startedAt) / 1000) * 10) / 10,
      html,
      width: w,
      height: h,
    },
    log: { agent: "generator", text: `taslak ${n}${n === 1 ? "’i" : n === 2 ? "’yi" : "’ü"} üretti` },
  });
  return html;
}
