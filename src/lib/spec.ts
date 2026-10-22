// design-spec: agent hattının ürettiği tasarım tanımı (/run'daki JSON çekmecesi).
// Şema tek doğruluk kaynağı; çekmece satırları da buradaki şablondan çizilir.

import { z } from "zod";

export const sourceSchema = z.object({
  sketch: z.string(),
  elements: z.number().int().nonnegative(),
  /** Okuyucunun sorduğu belirsiz kutunun çözümü, ör. "kutu#5 → buton" */
  ambiguous: z.string().optional(),
});

export const layoutSchema = z.object({
  grid: z.string(),
  sections: z.array(z.string()),
  /** Yerleşim kuralları (Üretici'ye yönerge, 3–6 kısa madde) */
  notes: z.array(z.string()).optional(),
});

export const styleSchema = z.object({
  /** Gerçek koşuda sırayla: birincil, vurgu, metin, zemin (hex) */
  palette: z.array(z.string()),
  font: z.string(),
  /** Tasarımın havası, tek cümle */
  mood: z.string().optional(),
});

export const contentSchema = z.object({
  title: z.string(),
  cta: z.string(),
  subtitle: z.string().optional(),
  /** Kart / bölüm metinleri */
  items: z.array(z.object({ heading: z.string(), text: z.string() })).optional(),
});

export const renderSchema = z.object({
  attempts: z.number().int().positive(),
});

export const reviewSchema = z.object({
  score: z.number().min(0).max(1),
  passed: z.boolean(),
});

export const provenanceSchema = z.object({
  sketchHash: z.string(),
  specHash: z.string(),
  tx: z.string(),
});

export const designSpecSchema = z.object({
  source: sourceSchema,
  layout: layoutSchema,
  style: styleSchema,
  content: contentSchema,
  render: renderSchema,
  review: reviewSchema,
  provenance: provenanceSchema,
});

export type DesignSpec = z.infer<typeof designSpecSchema>;

/** Hat ilerledikçe dolan, henüz tamamlanmamış spec. */
export const partialDesignSpecSchema = z.object({
  source: sourceSchema.partial(),
  layout: layoutSchema.partial(),
  style: styleSchema.partial(),
  content: contentSchema.partial(),
  render: renderSchema.partial(),
  review: reviewSchema.partial(),
  provenance: provenanceSchema.partial(),
}).partial();

export type PartialDesignSpec = z.infer<typeof partialDesignSpecSchema>;

// ---------- yama yolları ----------

export const SPEC_SECTIONS = ["source", "layout", "style", "content", "render", "review", "provenance"] as const;
export type SpecSection = (typeof SPEC_SECTIONS)[number];

export const SPEC_LEAVES = [
  "source.sketch", "source.elements", "source.ambiguous",
  "layout.grid", "layout.sections", "layout.notes",
  "style.palette", "style.font", "style.mood",
  "content.title", "content.cta", "content.subtitle", "content.items",
  "review.score", "review.passed",
  "provenance.sketchHash", "provenance.specHash", "provenance.tx",
] as const;

/** Bir spec_patch'in hedefi: bölümün kendisi (açılış) ya da bir alan. */
export const SPEC_PATHS = [...SPEC_SECTIONS, ...SPEC_LEAVES] as const;
export type SpecPath = (typeof SPEC_PATHS)[number];

export const specPathSchema = z.enum(SPEC_PATHS);

/** Düz yol → değer haritasını iç içe spec nesnesine çevirir. */
export function nestSpec(flat: Partial<Record<SpecPath, unknown>>): PartialDesignSpec {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [path, value] of Object.entries(flat)) {
    const [section, key] = path.split(".");
    out[section] ??= {};
    if (key) out[section][key] = value;
    else if (value && typeof value === "object") Object.assign(out[section], value);
  }
  return partialDesignSpecSchema.parse(out);
}

// ---------- JSON çekmecesi satırları ----------

export interface SpecLine {
  /** `"anahtar": ` kısmı */
  k: string;
  ind: number;
  /** Bu yama gelince satır görünür */
  path?: SpecPath;
  /** Değer kısmı; flat spec'ten üretilir */
  v: (spec: Partial<Record<SpecPath, unknown>>) => string;
  /** Alan sayacına girer */
  field?: boolean;
}

const str = (p: SpecPath, tail = ",") => (s: Partial<Record<SpecPath, unknown>>) => `"${String(s[p])}"${tail}`;
const raw = (p: SpecPath, tail = ",") => (s: Partial<Record<SpecPath, unknown>>) => `${JSON.stringify(s[p])}${tail}`;
const lit = (text: string) => () => text;

export const SPEC_LINES: SpecLine[] = [
  { k: "", ind: 0, v: lit("{") },
  { k: '"source": ', ind: 1, path: "source", v: lit("{") },
  { k: '"sketch": ', ind: 2, path: "source.sketch", v: str("source.sketch"), field: true },
  { k: '"elements": ', ind: 2, path: "source.elements", v: raw("source.elements"), field: true },
  { k: '"ambiguous": ', ind: 2, path: "source.ambiguous", v: str("source.ambiguous"), field: true },
  { k: "", ind: 1, path: "source", v: lit("},") },
  { k: '"layout": ', ind: 1, path: "layout", v: lit("{") },
  { k: '"grid": ', ind: 2, path: "layout.grid", v: str("layout.grid"), field: true },
  { k: '"sections": ', ind: 2, path: "layout.sections", v: raw("layout.sections", ""), field: true },
  { k: "", ind: 1, path: "layout", v: lit("},") },
  { k: '"style": ', ind: 1, path: "style", v: lit("{") },
  { k: '"palette": ', ind: 2, path: "style.palette", v: raw("style.palette"), field: true },
  { k: '"font": ', ind: 2, path: "style.font", v: str("style.font", ""), field: true },
  { k: "", ind: 1, path: "style", v: lit("},") },
  { k: '"content": ', ind: 1, path: "content", v: lit("{") },
  { k: '"title": ', ind: 2, path: "content.title", v: str("content.title"), field: true },
  { k: '"cta": ', ind: 2, path: "content.cta", v: str("content.cta", ""), field: true },
  { k: "", ind: 1, path: "content", v: lit("},") },
  { k: '"render": ', ind: 1, path: "render", v: (s) => `{ "attempts": ${(s.render as { attempts?: number } | undefined)?.attempts} },`, field: true },
  { k: '"review": ', ind: 1, path: "review", v: lit("{") },
  { k: '"score": ', ind: 2, path: "review.score", v: raw("review.score"), field: true },
  { k: '"passed": ', ind: 2, path: "review.passed", v: raw("review.passed", ""), field: true },
  { k: "", ind: 1, path: "review", v: lit("},") },
  { k: '"provenance": ', ind: 1, path: "provenance", v: lit("{") },
  { k: '"sketchHash": ', ind: 2, path: "provenance.sketchHash", v: str("provenance.sketchHash"), field: true },
  { k: '"specHash": ', ind: 2, path: "provenance.specHash", v: str("provenance.specHash"), field: true },
  { k: '"tx": ', ind: 2, path: "provenance.tx", v: str("provenance.tx", ""), field: true },
  { k: "", ind: 1, path: "provenance", v: lit("}") },
  { k: "", ind: 0, v: lit("}") },
];
