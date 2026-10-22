// Agent'ların kullandığı tek LLM arayüzü (Google Gemini). Agent'lar SDK'yı doğrudan çağırmaz.
// Yalnızca sunucuda çalışır: GEMINI_API_KEY istemciye asla gitmez.

import "server-only";
import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { z } from "zod";

/** Google dokümanına göre (ai.google.dev/gemini-api/docs/models) ücretsiz katmanı olan, görsel okuyan ve yapılandırılmış çıktı veren kararlı Flash modeli. */
export const DEFAULT_MODEL = "gemini-3.8-flash";

export type LLMErrorKind = "config" | "rate_limit" | "network" | "invalid_json" | "other";

export class LLMError extends Error {
  constructor(
    public kind: LLMErrorKind,
    message: string,
    public override cause?: unknown,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export interface LLMImage {
  mimeType: string;
  /** base64 (data URL öneki olmadan) */
  data: string;
}

export interface LLMMeter {
  /** Gemini'ye giden istek sayısı (yeniden denemeler dahil) */
  requests: number;
}

interface BaseParams {
  system?: string;
  prompt: string;
  images?: LLMImage[];
  signal?: AbortSignal;
  meter?: LLMMeter;
}

/** generateContent'in kullanılan kısmı; testlerde taklit edilebilir. */
export interface LLMClient {
  generate(params: { model: string; system?: string; contents: unknown[]; jsonSchema?: unknown; signal?: AbortSignal }): Promise<string>;
}

const MAX_429_RETRIES = 2;
const BACKOFF_MS = [1500, 4000];

export function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
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
  async generate({ model, system, contents, jsonSchema, signal }) {
    const res = await sdk().models.generateContent({
      model,
      contents: contents as never,
      config: {
        systemInstruction: system,
        ...(jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: jsonSchema } : {}),
        // Gemini 3 serisinde düşünme düzeyi ayarlanabilir; hız için düşük
        ...(model.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        abortSignal: signal,
      },
    });
    return res.text ?? "";
  },
};

function classify(err: unknown): LLMError {
  if (err instanceof LLMError) return err;
  const e = err as { status?: number; code?: number | string; name?: string; message?: string; cause?: { code?: string } };
  const msg = e?.message ?? String(err);
  if (e?.status === 429 || e?.code === 429 || /RESOURCE_EXHAUSTED|\b429\b/.test(msg)) return new LLMError("rate_limit", msg, err);
  if (e?.name === "AbortError") return new LLMError("other", "istek iptal edildi", err);
  if (/fetch failed|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|network/i.test(msg) || e?.cause?.code) return new LLMError("network", msg, err);
  return new LLMError("other", msg, err);
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

/** Tek bir istek; 429'da artan bekleme ile en fazla 2 kez tekrar dener. */
async function request(
  p: { system?: string; contents: unknown[]; jsonSchema?: unknown; signal?: AbortSignal; meter?: LLMMeter },
): Promise<string> {
  const client = clientOverride ?? sdkAdapter;
  for (let attempt = 0; ; attempt++) {
    if (p.signal?.aborted) throw new LLMError("other", "istek iptal edildi");
    if (p.meter) p.meter.requests++;
    try {
      return await client.generate({ model: getModel(), system: p.system, contents: p.contents, jsonSchema: p.jsonSchema, signal: p.signal });
    } catch (err) {
      const e = classify(err);
      if (e.kind !== "rate_limit" || attempt >= MAX_429_RETRIES) throw e;
      await sleep(BACKOFF_MS[attempt] + Math.random() * 400, p.signal);
    }
  }
}

function userParts(prompt: string, images?: LLMImage[]): Part[] {
  return [...(images ?? []).map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })), { text: prompt }];
}

export async function generateText(params: BaseParams): Promise<string> {
  const text = await request({ system: params.system, contents: [{ role: "user", parts: userParts(params.prompt, params.images) }], signal: params.signal, meter: params.meter });
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
  const base = { system: params.system, jsonSchema, signal: params.signal, meter: params.meter };

  let text = await request({ ...base, contents });
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
  text = await request({ ...base, contents: retryContents });
  problem = check(text, params.schema);
  if (problem.ok) return problem.value;
  throw new LLMError("invalid_json", `Geçersiz JSON: ${problem.reason}`);
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
