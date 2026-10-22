// Okuyucu: krokiyi okur, öğeleri çıkarır, emin olmadığı bir öğe için kullanıcıya soru sorar.
// Çıktısı lib/events.ts'teki olaylardır; model çağrısı yalnızca lib/llm.ts üzerinden yapılır.

import "server-only";
import { z } from "zod";
import { ELEMENT_TYPES, type ElementType, type FoundElement } from "../events";
import { generateJSON, type LLMMeter } from "../llm";
import type { RunSession } from "../runs";

export const CONFIDENCE_THRESHOLD = 0.7;
export const QUESTION_TIMEOUT_SEC = 8;

export interface ReaderInput {
  /** PNG, base64 (data URL öneki olmadan) */
  imageBase64: string;
  formatName: string;
  paletteName: string;
  description: string;
}

const optionSchema = z.object({ label: z.string().min(1), type: z.enum(ELEMENT_TYPES) });

export const readerSchema = z.object({
  elements: z
    .array(
      z.object({
        type: z.enum(ELEMENT_TYPES),
        /** Gemini'nin kutu düzeni: [ymin, xmin, ymax, xmax], 0–1000 */
        box: z.array(z.number()).length(4),
        confidence: z.number().min(0).max(1),
        note: z.string(),
      }),
    )
    .min(1)
    .max(30),
  /** En emin olunmayan öğe için soru (hepsi netse null) */
  question: z
    .object({
      elementIndex: z.number().int().min(0),
      text: z.string().min(1),
      options: z.array(optionSchema).length(2),
    })
    .nullable(),
  bubbles: z.object({
    counting: z.string().min(1),
    found: z.string().min(1),
    ask: z.string().min(1),
    done: z.string().min(1),
  }),
});

export type ReaderOutput = z.infer<typeof readerSchema>;

const SYSTEM = `Sen "Okuyucu"sun: Sketch2Design'ın krokileri okuyan agent'ı. Neşeli, kısa konuşan, hafif esprili biri gibi birinci ağızdan Türkçe konuşursun.
Görevin: kullanıcının elle çizdiği arayüz/tasarım krokisindeki her öğeyi (menü, başlık, metin, buton, görsel, kart, logo, ikon, form, diğer) bulmak.`;

function buildPrompt(input: ReaderInput): string {
  return `Ekteki kroki bir "${input.formatName}" tasarımı için çizildi. Palet tercihi: ${input.paletteName}.${input.description ? ` Kullanıcının tek cümlelik açıklaması: "${input.description}".` : ""}

Kurallar:
- Krokideki her öğeyi bul. Kutunun içine ya da yanına yazılmış el yazısı notları ("buton", "başlık", "görsel", "menü", "kart"…) öğe tipini belirlemede öncelikli say.
- Her öğe için: type (verilen listeden), box = [ymin, xmin, ymax, xmax] (görselin boyutuna göre 0–1000 normalize), confidence (0–1, dürüst ol: not yoksa ve şekil belirsizse düşük ver), note (öğeyi 2–4 kelimeyle anlat, ör. "ana başlık").
- Güveni 0.70'in altında kalan öğe varsa, en belirsiz olanı için "question" doldur: elementIndex (elements dizisindeki sırası), text (kullanıcıya kısa, net bir evet/hayır'a yakın soru) ve en olası iki yorumu "options" olarak ver (label: düğme yazısı, 1–2 kelime; type: karşılık gelen öğe tipi). Hepsi netse question null olsun.
- bubbles: Okuyucu'nun konuşma balonları. Her biri tek kısa cümle (en çok ~7 kelime), birinci ağızdan, esprili:
  counting = kutuları sayarken, found = öğeleri bulunca (kaç öğe bulduğunu söyle), ask = soru soracaksa takıldığını söyleyen cümle, done = soru sormadan işini bitirince.
- Yalnızca şemaya uygun JSON döndür.`;
}

const clamp = (n: number) => Math.max(0, Math.min(1000, n));

/** Gemini kutusunu ([ymin, xmin, ymax, xmax]) [x1, y1, x2, y2] düzenine çevirir; sınırlara sıkıştırır. */
export function toBox([ymin, xmin, ymax, xmax]: number[]): [number, number, number, number] {
  const x1 = clamp(Math.min(xmin, xmax));
  const x2 = clamp(Math.max(xmin, xmax));
  const y1 = clamp(Math.min(ymin, ymax));
  const y2 = clamp(Math.max(ymin, ymax));
  return [Math.round(x1), Math.round(y1), Math.round(Math.max(x2, x1 + 1)), Math.round(Math.max(y2, y1 + 1))];
}

export function toElements(out: ReaderOutput): FoundElement[] {
  return out.elements.map((el, i) => ({
    id: i + 1,
    type: el.type,
    box: toBox(el.box),
    confidence: Math.round(el.confidence * 100) / 100,
    note: el.note,
    confirmed: false,
  }));
}

/** Soru gerekli mi ve neyi soracağız? Güven eşiğinin altındaki en belirsiz öğe. */
export function pickQuestion(elements: FoundElement[], out: ReaderOutput) {
  const lowest = elements.reduce<FoundElement | null>((m, el) => (m === null || el.confidence < m.confidence ? el : m), null);
  if (!lowest || lowest.confidence >= CONFIDENCE_THRESHOLD) return null;
  const q = out.question;
  const options: { label: string; type: ElementType }[] =
    q && q.options[0].label !== q.options[1].label && elements[q.elementIndex]?.id === lowest.id
      ? q.options
      : [
          { label: cap(lowest.type), type: lowest.type },
          { label: lowest.type === "görsel" ? "Buton" : "Görsel", type: lowest.type === "görsel" ? "buton" : "görsel" },
        ];
  const text =
    q && elements[q.elementIndex]?.id === lowest.id ? q.text : `Kutu #${lowest.id} ne? ${options[0].label} mi, ${options[1].label.toLowerCase()} mi?`;
  return { element: lowest, text, options };
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Okuyucu'yu çalıştırır. Başarısız olursa LLMError fırlatır (çağıran agent_error'a çevirir).
 * Başarıyla biterse agent_done(reader) gönderilmiş olur.
 */
export async function runReader(run: RunSession, input: ReaderInput, meter?: LLMMeter): Promise<void> {
  run.emit({ type: "run_started" });
  run.emit({ type: "agent_started", agent: "reader", log: { agent: "reader", text: "krokiyi aldı" } });
  run.emit({ type: "agent_step", agent: "reader", index: 0, total: 3, label: "Hmm, bu çizgiler ne diyor…" });

  const out = await generateJSON({
    system: SYSTEM,
    prompt: buildPrompt(input),
    images: [{ mimeType: "image/png", data: input.imageBase64 }],
    schema: readerSchema,
    signal: run.abort.signal,
    meter,
  });

  let elements = toElements(out);
  run.emit({ type: "spec_patch", path: "source", value: {} });
  run.emit({ type: "spec_patch", path: "source.sketch", value: "kroki.png" });
  run.emit({ type: "agent_step", agent: "reader", index: 1, total: 3, label: out.bubbles.counting });
  run.emit({ type: "elements_found", elements });
  await sleep(1400);

  run.emit({ type: "agent_step", agent: "reader", index: 2, total: 3, label: out.bubbles.found });
  run.emit({ type: "spec_patch", path: "source.elements", value: elements.length, log: { agent: "reader", text: `${elements.length} öğe buldu` } });
  await sleep(1200);

  const ask = pickQuestion(elements, out);
  if (!ask) {
    run.emit({ type: "agent_done", agent: "reader", final: true, message: out.bubbles.done });
    return;
  }

  const labels = ask.options.map((o) => o.label);
  run.emit({
    type: "agent_question",
    agent: "reader",
    question: ask.text,
    bubble: out.bubbles.ask,
    options: labels,
    timeoutSec: QUESTION_TIMEOUT_SEC,
    defaultAnswer: labels[0],
    log: { agent: "reader", text: "bir soru sordu" },
  });
  const answer = await run.ask(labels, labels[0], QUESTION_TIMEOUT_SEC);
  const chosen = ask.options.find((o) => o.label === answer.value) ?? ask.options[0];

  elements = elements.map((el) => (el.id === ask.element.id ? { ...el, type: chosen.type, confidence: 1, confirmed: true } : el));
  run.emit({ type: "elements_found", elements });
  run.emit({ type: "spec_patch", path: "source.ambiguous", value: `kutu#${ask.element.id} → ${chosen.label.toLocaleLowerCase("tr")}` });
  run.emit({ type: "agent_done", agent: "reader", final: true, message: `${chosen.label} dedin, not aldım.` });
}
