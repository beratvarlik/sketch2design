// Agent'ların kullandığı tek LLM arayüzü (Google Gemini). Agent'lar SDK'yı doğrudan çağırmaz.
// Yalnızca sunucuda çalışır: GEMINI_API_KEY istemciye asla gitmez.

import "server-only";
import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { z } from "zod";

/**
 * Varsayılan model: Google fiyat sayfasında ücretsiz katmanı olan, görsel okuyan, yapılandırılmış çıktı veren
 * ve dokümanın "yeni projeler için önerilen" dediği Flash-Lite. Bu anahtarla denendiğinde (models.list +
 * görselli/JSON istekleri) hızlı ve kararlı çalıştı; `gemini-3.8-flash` ise yoğunluk nedeniyle 503/504 veriyordu.
 */
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

/** Birincil model hata verirse sırayla denenecek yedekler (GEMINI_FALLBACK_MODELS ile değiştirilebilir). */
export const DEFAULT_FALLBACKS = ["gemini-3.6-flash", "gemini-2.5-flash"];

/** Tek isteğin varsayılan zaman aşımı (ms): yanıt vermeyen model sonsuza dek beklemesin. Uzun çıktılar için çağrı başına artırılabilir. */
const REQUEST_TIMEOUT_MS = 45_000;

export type LLMErrorKind = "config" | "auth" | "not_found" | "rate_limit" | "overloaded" | "timeout" | "network" | "invalid_json" | "other";

export class LLMError extends Error {
  /** HTTP kodu (varsa) */
  status?: number;
  /** Hatayı veren model */
  model?: string;
  constructor(
    public kind: LLMErrorKind,
    message: string,
    public override cause?: unknown,
  ) {
    super(redact(message));
    this.name = "LLMError";
  }
}

/** Anahtarın hata metinlerine sızmasını önler. */
export function redact(text: string): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  const out = key ? text.split(key).join("***") : text;
  return out.replace(/AIza[0-9A-Za-z_-]{20,}/g, "***");
}

export interface LLMImage {
  mimeType: string;
  /** base64 (data URL öneki olmadan) */
  data: string;
}

export interface LLMMeter {
  /** Gemini'ye giden istek sayısı (yeniden denemeler ve yedek modeller dahil) */
  requests: number;
  /** Cevabı veren model */
  model?: string;
  /** Başarılı yanıtların bildirdiği token kullanımı (başarısız istekler sayılmaz) */
  inputTokens: number;
  outputTokens: number;
  /** Düşünme tokenları (modelin iç akıl yürütmesi; çıkış faturasına dahildir) */
  thoughtTokens: number;
  totalTokens: number;
}

export function newMeter(): LLMMeter {
  return { requests: 0, inputTokens: 0, outputTokens: 0, thoughtTokens: 0, totalTokens: 0 };
}

export interface LLMUsage {
  input: number;
  output: number;
  thoughts: number;
  total: number;
}

interface BaseParams {
  system?: string;
  prompt: string;
  images?: LLMImage[];
  signal?: AbortSignal;
  meter?: LLMMeter;
  /** Tek isteğin zaman aşımı (ms); varsayılan 45 sn */
  timeoutMs?: number;
}

/** generateContent'in kullanılan kısmı; testlerde taklit edilebilir. */
export interface LLMClient {
  generate(params: { model: string; system?: string; contents: unknown[]; jsonSchema?: unknown; signal?: AbortSignal; timeoutMs?: number }): Promise<string | { text: string; usage?: LLMUsage }>;
}

const MAX_429_RETRIES = 2;
const BACKOFF_MS = [1500, 4000];

export function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/** Denenecek modeller: birincil + yedekler (tekrarsız). */
export function getModelChain(): string[] {
  const env = process.env.GEMINI_FALLBACK_MODELS;
  const fallbacks = env !== undefined ? env.split(",").map((m) => m.trim()).filter(Boolean) : DEFAULT_FALLBACKS;
  return [...new Set([getModel(), ...fallbacks])];
}

let clientOverride: LLMClient | null = null;
let sdkClient: GoogleGenAI | null = null;

/** Yalnızca testler için. */
export function setLLMClientForTests(client: LLMClient | null) {
  clientOverride = client;
}

function sdk(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new LLMError("config", "GEMINI_API_KEY tanımlı değil");
  sdkClient ??= new GoogleGenAI({ apiKey });
  return sdkClient;
}

const sdkAdapter: LLMClient = {
  async generate({ model, system, contents, jsonSchema, signal, timeoutMs }) {
    const res = await sdk().models.generateContent({
      model,
      contents: contents as never,
      config: {
        systemInstruction: system,
        ...(jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: jsonSchema } : {}),
        // Gemini 3 serisinde düşünme düzeyi ayarlanabilir; hız için düşük
        ...(model.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        abortSignal: signal,
        httpOptions: { timeout: timeoutMs ?? REQUEST_TIMEOUT_MS },
      },
    });
    const u = res.usageMetadata;
    return {
      text: res.text ?? "",
      usage: u ? { input: u.promptTokenCount ?? 0, output: u.candidatesTokenCount ?? 0, thoughts: u.thoughtsTokenCount ?? 0, total: u.totalTokenCount ?? 0 } : undefined,
    };
  },
};

function classify(err: unknown): LLMError {
  if (err instanceof LLMError) return err;
  const e = err as { status?: number; code?: number | string; name?: string; message?: string; cause?: { code?: string } };
  const msg = e?.message ?? String(err);
  const isAbort = e?.name === "AbortError" || /operation was aborted|aborted/i.test(msg);
  const status = typeof e?.status === "number" ? e.status : !isAbort && typeof e?.code === "number" ? e.code : undefined;
  const make = (kind: LLMErrorKind) => Object.assign(new LLMError(kind, msg, err), { status });
  if (status === 429 || /RESOURCE_EXHAUSTED/.test(msg)) return make("rate_limit");
  if (status === 503 || status === 500 || status === 504 || /UNAVAILABLE|DEADLINE_EXCEEDED|high demand/i.test(msg)) return make("overloaded");
  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/i.test(msg)) return make("auth");
  if (status === 404 || /NOT_FOUND|no longer available/i.test(msg)) return make("not_found");
  // İsteği biz iptal etmediysek (request() bunu ayrıca kontrol eder) bu istek zaman aşımına uğramıştır
  if (isAbort) return Object.assign(new LLMError("timeout", "istek zaman aşımına uğradı (model yanıt vermedi)", err), { status });
  if (/fetch failed|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|network|timed? ?out/i.test(msg) || e?.cause?.code) return make("network");
  return make("other");
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

interface RequestParams {
  system?: string;
  contents: unknown[];
  jsonSchema?: unknown;
  signal?: AbortSignal;
  meter?: LLMMeter;
  timeoutMs?: number;
  /** Zincirde bu sıradaki modelden başla (JSON düzeltmesi aynı modelde sürsün diye) */
  startAt?: number;
}

const SWITCHABLE: LLMErrorKind[] = ["rate_limit", "overloaded", "timeout", "not_found"];

/**
 * Tek bir mantıksal istek. 429'da artan bekleme ile en fazla 2 kez tekrar dener; 503/504'te bir kez tekrar dener.
 * Bir model yine de başarısız olursa (kota, yoğunluk, bulunamadı) sıradaki yedek modele geçer.
 * Anahtar geçersizse, ağ yoksa ya da başka bir hata varsa hemen hata verir. Her başarısızlık sunucu konsoluna yazılır.
 */
async function request(p: RequestParams): Promise<{ text: string; modelIndex: number }> {
  const client = clientOverride ?? sdkAdapter;
  const chain = getModelChain();
  let last: LLMError | null = null;

  for (let m = p.startAt ?? 0; m < chain.length; m++) {
    const model = chain[m];
    for (let attempt = 0; ; attempt++) {
      if (p.signal?.aborted) throw new LLMError("other", "istek iptal edildi");
      if (p.meter) p.meter.requests++;
      try {
        const res = await client.generate({ model, system: p.system, contents: p.contents, jsonSchema: p.jsonSchema, signal: p.signal, timeoutMs: p.timeoutMs });
        const text = typeof res === "string" ? res : res.text;
        if (p.meter) {
          p.meter.model = model;
          const u = typeof res === "string" ? undefined : res.usage;
          if (u) {
            p.meter.inputTokens += u.input;
            p.meter.outputTokens += u.output;
            p.meter.thoughtTokens += u.thoughts;
            p.meter.totalTokens += u.total;
          }
        }
        return { text, modelIndex: m };
      } catch (err) {
        const e = classify(err);
        e.model = model;
        last = e;
        const next = chain[m + 1];
        const retryable = (e.kind === "rate_limit" && attempt < MAX_429_RETRIES) || ((e.kind === "overloaded" || e.kind === "timeout") && attempt < 1);
        const switching = !retryable && SWITCHABLE.includes(e.kind) && next !== undefined;
        console.warn(
          `[llm] ${model} → ${e.kind}${e.status ? ` (http ${e.status})` : ""}: ${e.message.replace(/\s+/g, " ").slice(0, 300)}` +
            (retryable ? ` — ${BACKOFF_MS[attempt]} ms sonra tekrar denenecek` : switching ? ` — ${next} modeline geçiliyor` : ""),
        );
        if (retryable) {
          await sleep(BACKOFF_MS[attempt] + Math.random() * 400, p.signal);
          continue;
        }
        if (switching) break; // sıradaki modele
        throw e;
      }
    }
  }
  throw last ?? new LLMError("other", "model zinciri boş");
}

function userParts(prompt: string, images?: LLMImage[]): Part[] {
  return [...(images ?? []).map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })), { text: prompt }];
}

export async function generateText(params: BaseParams): Promise<string> {
  const { text } = await request({
    system: params.system,
    contents: [{ role: "user", parts: userParts(params.prompt, params.images) }],
    signal: params.signal,
    meter: params.meter,
    timeoutMs: params.timeoutMs,
  });
  return text.trim();
}

function parseJSON(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

/**
 * Şemaya uyan JSON döndürür. Gemini'nin yapılandırılmış çıktısı istenir, sonuç zod ile doğrulanır;
 * uymazsa hatayı göstererek bir kez düzeltme istenir. Yine olmazsa LLMError("invalid_json").
 */
export async function generateJSON<S extends z.ZodType>(params: BaseParams & { schema: S }): Promise<z.output<S>> {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(params.schema) as Record<string, unknown>;
  void _ignored;
  const contents: unknown[] = [{ role: "user", parts: userParts(params.prompt, params.images) }];
  const base = { system: params.system, jsonSchema, signal: params.signal, meter: params.meter, timeoutMs: params.timeoutMs };

  const first = await request({ ...base, contents });
  let text = first.text;
  let problem = check(text, params.schema);
  if (problem.ok) return problem.value;

  const retryContents = [
    ...contents,
    { role: "model", parts: [{ text }] },
    {
      role: "user",
      parts: [{ text: `Yanıtın şemaya uymadı: ${problem.reason}\nAynı görev için yalnızca şemaya tam uyan geçerli JSON'u yeniden ver.` }],
    },
  ];
  text = (await request({ ...base, contents: retryContents, startAt: first.modelIndex })).text;
  problem = check(text, params.schema);
  if (problem.ok) return problem.value;
  throw Object.assign(new LLMError("invalid_json", `Geçersiz JSON: ${problem.reason}`), { model: getModelChain()[first.modelIndex] });
}

function check<S extends z.ZodType>(text: string, schema: S): { ok: true; value: z.output<S> } | { ok: false; reason: string } {
  let raw: unknown;
  try {
    raw = parseJSON(text);
  } catch {
    return { ok: false, reason: "JSON olarak ayrıştırılamadı" };
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, reason: parsed.error.issues.map((i) => `${i.path.join(".") || "(kök)"}: ${i.message}`).join("; ") };
}
