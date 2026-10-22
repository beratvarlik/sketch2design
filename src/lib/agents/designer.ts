// Tasarımcı: Okuyucu'nun öğe listesi + format + palet + açıklamadan design-spec'in
// layout, style ve content kısımlarını üretir (zod ile doğrulanır) ve alt adımlarını agent_step olarak yollar.

import "server-only";
import { z } from "zod";
import type { FoundElement } from "../events";
import { generateJSON, type LLMMeter } from "../llm";
import type { RunSession } from "../runs";
import { contentSchema, layoutSchema, nestSpec, partialDesignSpecSchema, styleSchema, type PartialDesignSpec } from "../spec";
import { DESIGNER_SYSTEM } from "./designer.prompt";
import { sleep } from "./util";

export interface DesignerInput {
  elements: FoundElement[];
  formatName: string;
  canvas: [number, number];
  paletteName: string;
  /** Kullanıcı palet seçtiyse kullanılacak renkler (sırayla birincil, vurgu, metin, zemin); yoksa Tasarımcı seçer */
  paletteColors: string[] | null;
  description: string;
}

export const designerSchema = z.object({
  layout: layoutSchema.required({ notes: true }),
  style: styleSchema.required({ mood: true }),
  content: contentSchema.required({ subtitle: true, items: true }),
  bubbles: z.object({
    grid: z.string().min(1),
    palette: z.string().min(1),
    titles: z.string().min(1),
    done: z.string().min(1),
  }),
});
export type DesignerOutput = z.infer<typeof designerSchema>;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const FALLBACK_PALETTE = ["#6E54FF", "#FFB84D", "#17162A", "#FFFDF8"];

/** Palet tam 4 geçerli hex olsun; kullanıcı palet seçtiyse onunla değiştirilir. */
export function resolvePalette(modelPalette: string[], chosen: string[] | null): string[] {
  const clean = (list: string[]) => list.map((c) => (c.startsWith("#") ? c : `#${c}`).toUpperCase()).filter((c) => HEX.test(c));
  const picked = chosen ? clean(chosen) : [];
  if (picked.length >= 4) return picked.slice(0, 4);
  const model = clean(modelPalette);
  const merged = [...picked, ...model.filter((c) => !picked.includes(c))];
  for (const f of FALLBACK_PALETTE) if (merged.length < 4 && !merged.includes(f)) merged.push(f);
  return merged.slice(0, 4);
}

function buildPrompt(input: DesignerInput): string {
  const els = input.elements.map((e) => `#${e.id} ${e.type} kutu[x1,y1,x2,y2]=[${e.box.join(",")}] (${e.note})`).join("\n");
  const palette = input.paletteColors?.length
    ? `Kullanıcı bu paleti seçti, aynen kullan (sırayla birincil, vurgu, metin, zemin): ${input.paletteColors.join(", ")}.`
    : "Kullanıcı palet seçmedi: krokiye ve açıklamaya uygun, uyumlu bir palet kendin seç.";
  return `Tasarım: "${input.formatName}" (${input.canvas[0]}×${input.canvas[1]} piksel tuval). Palet tercihi: ${input.paletteName}. ${palette}
${input.description ? `Kullanıcının tek cümlelik açıklaması: "${input.description}".` : "Kullanıcı açıklama yazmadı."}

Okuyucu'nun krokide bulduğu öğeler (koordinatlar 0–1000):
${els}

Şunları üret:
- layout.grid: grid tarifi (ör. "12 sütun · 16px"); layout.sections: bölümleri sırayla (kısa adlar, ör. "menü", "hero", "kartlar"); layout.notes: Üretici'ye 3–6 kısa yerleşim kuralı.
- style.palette: tam 4 hex renk, sırayla [birincil, vurgu, metin, zemin]; style.font: "Başlık fontu / gövde fontu" (yalnızca sistem yazı tipleri); style.mood: tasarımın havası, tek cümle.
- content: title (ana başlık), subtitle (alt metin), cta (buton yazısı), items (krokideki kartlar/bölümler için {heading, text}, en çok 6).
- bubbles: Tasarımcı'nın konuşma balonları, her biri tek kısa cümle (en çok ~8 kelime), birinci ağızdan, esprili: grid = grid'i kurarken, palette = paleti seçerken, titles = metinleri yazarken, done = spec'i teslim ederken.
Yalnızca şemaya uygun JSON döndür.`;
}

/** Tasarımcı'yı çalıştırır; spec'in layout/style/content kısımlarını döndürür. Başarısızsa LLMError fırlatır. */
export async function runDesigner(run: RunSession, input: DesignerInput, imageBase64: string, meter?: LLMMeter): Promise<PartialDesignSpec> {
  run.emit({ type: "agent_started", agent: "designer" });
  run.emit({ type: "agent_step", agent: "designer", index: 0, total: 3, label: "Grid kuruluyor…" });
  run.emit({ type: "output_update", level: 1 });

  const out = await generateJSON({
    system: DESIGNER_SYSTEM,
    prompt: buildPrompt(input),
    images: [{ mimeType: "image/png", data: imageBase64 }],
    schema: designerSchema,
    signal: run.abort.signal,
    meter,
  });
  const palette = resolvePalette(out.style.palette, input.paletteColors);
  const flat = {
    layout: {},
    "layout.grid": out.layout.grid,
    "layout.sections": out.layout.sections,
    "layout.notes": out.layout.notes,
    style: {},
    "style.palette": palette,
    "style.font": out.style.font,
    "style.mood": out.style.mood,
    content: {},
    "content.title": out.content.title,
    "content.subtitle": out.content.subtitle,
    "content.cta": out.content.cta,
    "content.items": out.content.items,
  } as const;
  const spec = partialDesignSpecSchema.parse(nestSpec(flat));

  // Yerleşim: grid kuruldu
  run.emit({ type: "agent_step", agent: "designer", index: 0, total: 3, label: out.bubbles.grid });
  run.emit({ type: "spec_patch", path: "layout", value: {} });
  run.emit({ type: "spec_patch", path: "layout.grid", value: flat["layout.grid"] });
  run.emit({ type: "spec_patch", path: "layout.sections", value: flat["layout.sections"] });
  run.emit({ type: "spec_patch", path: "layout.notes", value: flat["layout.notes"] });
  await sleep(run, 1100);

  // Stil: palet ve font seçildi
  run.emit({ type: "agent_step", agent: "designer", index: 1, total: 3, label: out.bubbles.palette, log: { agent: "designer", text: "grid kurdu" } });
  run.emit({ type: "output_update", level: 2 });
  run.emit({ type: "spec_patch", path: "style", value: {} });
  run.emit({ type: "spec_patch", path: "style.palette", value: palette });
  run.emit({ type: "spec_patch", path: "style.font", value: out.style.font });
  run.emit({ type: "spec_patch", path: "style.mood", value: out.style.mood });
  await sleep(run, 1100);

  // İçerik: başlıklar yazıldı
  run.emit({ type: "agent_step", agent: "designer", index: 2, total: 3, label: out.bubbles.titles, log: { agent: "designer", text: "palet ve fontu seçti" } });
  run.emit({ type: "output_update", level: 3 });
  run.emit({ type: "spec_patch", path: "content", value: {} });
  run.emit({ type: "spec_patch", path: "content.title", value: out.content.title });
  run.emit({ type: "spec_patch", path: "content.subtitle", value: out.content.subtitle });
  run.emit({ type: "spec_patch", path: "content.cta", value: out.content.cta });
  run.emit({ type: "spec_patch", path: "content.items", value: out.content.items });
  await sleep(run, 900);

  run.emit({ type: "agent_done", agent: "designer", final: true, message: out.bubbles.done, log: { agent: "designer", text: "spec’i teslim etti" } });
  return spec;
}
