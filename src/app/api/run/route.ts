import { z } from "zod";
import type { AgentEvent } from "@/lib/events";
import { newMeter } from "@/lib/llm";
import { runPipeline, type PipelineInput } from "@/lib/pipeline";
import { createRun } from "@/lib/runs";
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

/** Kullanıcının seçtiği renkler: özel renkler önce, sonra hazır palet; hiçbiri yoksa null (Tasarımcı seçer). */
function chosenColors(paletteId: string, custom: string[]): string[] | null {
  const preset = PALETTES.find((p) => p.id === paletteId)?.c ?? [];
  const merged = [...custom.map((c) => c.toUpperCase()), ...preset.filter((c) => !custom.includes(c))];
  return merged.length ? merged : null;
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
  const paletteName = body.palette === "auto" ? "Tasarımcı seçsin" : (PALETTES.find((p) => p.id === body.palette)?.name ?? "Tasarımcı seçsin");
  const input: PipelineInput = {
    imageBase64: body.image.slice(PNG_PREFIX.length),
    formatName: format.name,
    canvas: format.canvas,
    paletteName,
    paletteColors: chosenColors(body.palette, body.customColors),
    description: body.description,
  };

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
      let finished = false;
      const keepAlive = setInterval(() => write(": ping\n\n"), 15_000);
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

      write(`event: run\ndata: ${JSON.stringify({ id: run.id })}\n\n`);
      run.attach((event: AgentEvent) => {
        write(`data: ${JSON.stringify(event)}\n\n`);
        if (event.type === "run_finished") finish();
      });
      request.signal.addEventListener("abort", finish, { once: true });

      const meter = newMeter();
      // Hat bitince (hata olduysa run_finished zaten gönderildi) bağlantıyı kapat
      void runPipeline(run, input, meter).then(finish);
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
