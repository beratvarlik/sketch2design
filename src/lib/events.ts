// Agent hattının tüm olayları. Sahne (useScenario → reduceScene → deriveScene) yalnızca
// bu olayları tüketir; olayları üreten kaynak demo senaryosu da olabilir, gerçek backend
// de (SSE/WebSocket). Şema zod ile tanımlı: gelen JSON `agentEventSchema.parse` ile doğrulanır.
//
// Zaman: her olayın `t` alanı script saniyesidir (0 = çalışma başlangıcı). Okuyucu soru
// sorunca script zamanı cevap gelene kadar durur; gerçek zaman akmaya devam eder.

import { z } from "zod";
import { specPathSchema } from "./spec";

export const agentIdSchema = z.enum(["reader", "designer", "generator", "critic", "notary"]);
/** Kullanıcının seçtiği cevap: sorudaki seçenek etiketlerinden biri (ör. "Buton"). */
export const answerSchema = z.string().min(1);
export type Answer = z.infer<typeof answerSchema>;

/** "Olaylar" listesine düşecek satır; yoksa olay günlüğe yazılmaz. */
const logSchema = z.object({ agent: agentIdSchema, text: z.string() });

export const ELEMENT_TYPES = ["menü", "başlık", "metin", "buton", "görsel", "kart", "logo", "ikon", "form", "diğer"] as const;
export type ElementType = (typeof ELEMENT_TYPES)[number];

/** Okuyucunun krokide bulduğu öğe. box: [x1, y1, x2, y2], 0–1000 normalize koordinat. */
export const foundElementSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(ELEMENT_TYPES),
  box: z.array(z.number().min(0).max(1000)).length(4),
  confidence: z.number().min(0).max(1),
  note: z.string(),
  /** Kullanıcı sorusuyla netleşti */
  confirmed: z.boolean().default(false),
});
export type FoundElement = z.infer<typeof foundElementSchema>;

/** Hatanın gerçek sebebi: tür (rate_limit, overloaded, auth…), HTTP kodu, model ve ham ayrıntı (anahtar maskeli). */
export const errorReasonSchema = z.object({
  kind: z.string(),
  status: z.number().int().optional(),
  model: z.string().optional(),
  detail: z.string(),
});
export type ErrorReason = z.infer<typeof errorReasonSchema>;

const base = { t: z.number().nonnegative(), log: logSchema.optional() };

export const agentEventSchema = z.discriminatedUnion("type", [
  /** Çalışma başladı: bütün agent'lar sıraya girer. */
  z.object({ type: z.literal("run_started"), ...base }),

  /**
   * Agent görevi aldı: spec ona geçti, süre sayacı başlar. Önceki agent'ın süresi bu anda kapanır (süre, görev el değiştirene ya da hat bitene — seal_done / run_finished — kadar sürer).
   * Görsel durum "çalışıyor" olmaz; onu agent_step yapar.
   */
  z.object({ type: z.literal("agent_started"), ...base, agent: agentIdSchema, attempt: z.number().int().positive().optional() }),

  /** Çalışma adımı. İlk adım agent'ı "çalışıyor" yapar; total > 1 ise balonda adım noktaları çıkar. */
  z.object({
    type: z.literal("agent_step"),
    ...base,
    agent: agentIdSchema,
    index: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    label: z.string(),
  }),

  /** Balonu ayarlar (text: null → balonu kaldırır). */
  z.object({
    type: z.literal("agent_bubble"),
    ...base,
    agent: agentIdSchema,
    kind: z.enum(["work", "ask", "done", "err"]),
    text: z.string().nullable(),
  }),

  /** Okuyucunun bulduğu öğeler (her gelişinde listenin tamamı yerine geçer). */
  z.object({ type: z.literal("elements_found"), ...base, elements: z.array(foundElementSchema) }),

  /** Agent kullanıcıya soru soruyor; script zamanı durur. */
  z.object({
    type: z.literal("agent_question"),
    ...base,
    agent: agentIdSchema,
    question: z.string(),
    bubble: z.string(),
    options: z.array(answerSchema).min(2),
    /** Bu süre (gerçek sn) içinde cevap gelmezse defaultAnswer kendiliğinden verilir. */
    timeoutSec: z.number().positive(),
    defaultAnswer: answerSchema,
  }),

  /** Kullanıcının cevabı (arayüzden doğar, kaynağa da iletilir). */
  z.object({
    type: z.literal("user_answer"),
    ...base,
    answer: answerSchema,
    auto: z.boolean().default(false),
    skipped: z.boolean().default(false),
    /** Soruda geçen gerçek bekleme (sn) */
    waited: z.number().nonnegative(),
  }),

  /** Agent işini bitirdi (görsel durum). final=false: iş başka agent'a geçti, sıraya döner. */
  z.object({
    type: z.literal("agent_done"),
    ...base,
    agent: agentIdSchema,
    final: z.boolean().default(true),
    message: z.string().optional(),
  }),

  /**
   * Agent hata/yeniden deneme durumunda. message varsa balonda gösterilir (kullanıcıya dönük cümle);
   * reason hatanın gerçek sebebini taşır (geliştirici için: panelde ve sunucu günlüğünde görünür).
   */
  z.object({
    type: z.literal("agent_error"),
    ...base,
    agent: agentIdSchema,
    message: z.string().optional(),
    reason: errorReasonSchema.optional(),
  }),

  /** design-spec'e yama: bölüm açılışı (value: {}) ya da alan değeri. */
  z.object({ type: z.literal("spec_patch"), ...base, path: specPathSchema, value: z.unknown() }),

  /** Eleştirmenin puanı. */
  z.object({
    type: z.literal("critic_score"),
    ...base,
    attempt: z.number().int().positive(),
    score: z.number().min(0).max(1),
    passed: z.boolean(),
    criteria: z.array(z.tuple([z.string(), z.number()])),
  }),

  /** Çıkış tasarımı güncellendi: olgunluk seviyesi (0–7), üretim sürüyor mu, yeni taslak var mı. */
  z.object({
    type: z.literal("output_update"),
    ...base,
    level: z.number().int().min(0).max(7),
    label: z.string().optional(),
    busy: z.boolean().optional(),
    /** Nihai olarak seçilen taslağın turu (eşik geçilemezse en yüksek skorlu taslak seçilir) */
    selected: z.number().int().positive().optional(),
    draft: z
      .object({
        attempt: z.number().int().positive(),
        note: z.string().optional(),
        durationSec: z.number().optional(),
        score: z.number().optional(),
        /** Üreticinin ürettiği tek dosyalık HTML tasarım (gerçek koşuda) ve piksel boyutu */
        html: z.string().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      })
      .optional(),
  }),

  /** Noter mühürledi. */
  z.object({
    type: z.literal("seal_done"),
    ...base,
    sketchHash: z.string(),
    specHash: z.string(),
    tx: z.string(),
  }),

  /** Çalışma bitti; zamanlayıcılar durur. */
  z.object({ type: z.literal("run_finished"), ...base }),
]);

export type AgentEvent = z.infer<typeof agentEventSchema>;
export type AgentEventType = AgentEvent["type"];

/**
 * Olay kaynağı: demo senaryosu ya da gerçek backend. `connect` olayları `emit` ile iletir ve
 * kaynağı durduran fonksiyonu döndürür. `now()` güncel script zamanını verir (demo kaynağı
 * olayları buna göre salar; gerçek kaynak yok sayabilir). `respond` kullanıcının cevabını iletir.
 */
export interface AgentEventSource {
  connect(emit: (event: AgentEvent) => void, now: () => number): () => void;
  respond?(answer: Answer, skipped: boolean): void;
}
