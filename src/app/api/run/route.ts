import { z } from "zod";
import { runReader } from "@/lib/agents/reader";
import type { AgentEvent } from "@/lib/events";
import { LLMError, getModel, type LLMErrorKind, type LLMMeter } from "@/lib/llm";
import { createRun, type RunSession } from "@/lib/runs";
import { FORMATS, PALETTES } from "@/lib/studio";

// Node.js çalışma zamanı (cacheComponents açıkken varsayılan; segment config verilemez)

const PNG_PREFIX = "data:image/png;base64,";

const bodySchema = z.object({
  /** Kroki: PNG data URL (≈6 MB'a kadar) */
  image: z.string().startsWith(PNG_PREFIX).max(8_000_000),
  format: z.enum(FORMATS.map((f) => f.id) as [string, ...string[]]),
  palette: z.string().max(40).default("auto"),
  customColors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(4).default([]),
  description: z.string().max(80).default(""),
});

const FRIENDLY: Record<LLMErrorKind, string> = {
  rate_limit: "Biraz yoruldum, birazdan tekrar deneyelim.",
  network: "Bağlantım koptu, birazdan tekrar deneyelim.",
  invalid_json: "Notlarım karıştı, bir daha deneyelim.",
  config: "Anahtarım eksik. .env.local'e GEMINI_API_KEY ekle.",
  other: "Biraz yoruldum, birazdan tekrar deneyelim.",
};

/** Hattı çalıştırır; hata olursa Okuyucu'yu hata durumuna sokup çalışmayı bitirir. */
async function execute(run: RunSession, input: Parameters<typeof runReader>[1]) {
  const meter: LLMMeter = { requests: 0 };
  try {
    await runReader(run, input, meter);
    // Okuyucu'dan sonrası şimdilik istemcide demo senaryosuyla sürer.
  } catch (err) {
    if (run.closed) return;
    const e = err instanceof LLMError ? err : new LLMError("other", String(err), err);
    console.error(`[run ${run.id}] okuyucu hatası (${e.kind}): ${e.message}`);
    run.emit({ type: "agent_error", agent: "reader", message: FRIENDLY[e.kind] });
    run.emit({ type: "run_finished" });
  } finally {
    console.info(`[run ${run.id}] model=${getModel()} istek=${meter.requests}`);
  }
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Geçersiz istek", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const body = parsed.data;

  const format = FORMATS.find((f) => f.id === body.format)!;
  const palette = body.palette === "auto" ? "Tasarımcı seçsin" : (PALETTES.find((p) => p.id === body.palette)?.name ?? "Tasarımcı seçsin");
  const run = createRun();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // istemci ayrıldı
        }
      };
      write(`event: run\ndata: ${JSON.stringify({ id: run.id })}\n\n`);
      run.attach((event: AgentEvent) => {
        write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.type === "run_finished") finish();
      });
      const keepAlive = setInterval(() => write(": ping\n\n"), 15_000);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearInterval(keepAlive);
        run.close();
        try {
          controller.close();
        } catch {
          // zaten kapalı
        }
      };
      request.signal.addEventListener("abort", finish, { once: true });

      void execute(run, {
        imageBase64: body.image.slice(PNG_PREFIX.length),
        formatName: format.name,
        paletteName: palette,
        description: body.description,
      }).then(() => {
        // Okuyucu bitti (hata olduysa run_finished zaten gönderildi); bağlantıyı kapat.
        finish();
      });
    },
    cancel() {
      run.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
