import { agentEventSchema, type AgentEventSource } from "./events";
import { createDemoSource } from "./scenario";
import type { StudioBrief } from "./studio";

const FALLBACK_ERROR = "Biraz yoruldum, birazdan tekrar deneyelim.";

/** Sunucudan gelen SSE gövdesini blok blok okur. */
async function readSSE(body: ReadableStream<Uint8Array>, onBlock: (event: string, data: string) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (data.length) onBlock(event, data.join("\n"));
    }
  }
}

/**
 * Gerçek kaynak: Stüdyo'dan gelen krokiyi /api/run'a yollar ve sunucunun SSE ile akıttığı olayları iletir.
 * Sunucu hattı yürütür (Okuyucu, Tasarımcı, Üretici gerçek; Eleştirmen ve Noter şimdilik senaryolu).
 */
export function createRealSource(brief: StudioBrief): AgentEventSource {
  let runId: string | null = null;
  const abort = new AbortController();

  return {
    connect(emit) {
      let lastT = 0;
      let gotAny = false;
      let finished = false;
      let failedAgent: "reader" | "designer" | "generator" | "critic" | "notary" = "reader";

      const fail = (message: string) => {
        if (finished) return;
        finished = true;
        if (!gotAny) emit({ type: "run_started", t: 0 });
        emit({ type: "agent_error", t: lastT, agent: failedAgent, message, reason: { kind: "network", detail: message } });
        emit({ type: "run_finished", t: lastT });
      };

      const onBlock = (event: string, data: string) => {
        if (event === "run") {
          try {
            runId = (JSON.parse(data) as { id?: string }).id ?? null;
          } catch {
            // kimlik gelmezse cevap iletilemez; hat yine de akar
          }
          return;
        }
        let json: unknown;
        try {
          json = JSON.parse(data);
        } catch {
          return;
        }
        const parsed = agentEventSchema.safeParse(json);
        if (!parsed.success) return;
        const e = parsed.data;
        lastT = e.t;
        gotAny = true;
        if (e.type === "agent_started") failedAgent = e.agent;
        if (e.type === "run_finished") finished = true;
        emit(e);
      };

      void (async () => {
        try {
          const res = await fetch("/api/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abort.signal,
            body: JSON.stringify({
              image: brief.image,
              format: brief.format,
              palette: brief.palette,
              customColors: brief.customColors,
              description: brief.description,
            }),
          });
          if (!res.ok || !res.body) return fail(FALLBACK_ERROR);
          await readSSE(res.body, onBlock);
          // Sunucu run_finished göndermeden akışı kapattıysa hattın yarıda kaldığını göster
          if (!finished) fail(FALLBACK_ERROR);
        } catch {
          if (!abort.signal.aborted) fail(FALLBACK_ERROR);
        }
      })();

      return () => abort.abort();
    },

    respond(answer) {
      if (!runId) return;
      void fetch(`/api/run/${runId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      }).catch(() => {
        // sunucu cevabı almazsa süre dolunca varsayılan cevapla devam eder
      });
    },
  };
}

/**
 * /run'ın olay kaynağını seçer.
 * - `?demo=1` her zaman tamamen demo senaryosunu kullanır.
 * - Aksi halde Stüdyo'dan kroki geldiyse gerçek kaynak; kroki yoksa demo.
 */
export function createEventSource({ demo, brief }: { demo: boolean; brief: StudioBrief | null }): AgentEventSource {
  if (demo || !brief?.image) return createDemoSource();
  return createRealSource(brief);
}
