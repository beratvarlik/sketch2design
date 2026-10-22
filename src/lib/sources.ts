import { agentEventSchema, type AgentEvent, type AgentEventSource } from "./events";
import { demoAfterReader, createDemoSource } from "./scenario";
import type { StudioBrief } from "./studio";

const READER_ERROR = "Biraz yoruldum, birazdan tekrar deneyelim.";

/** Sunucudan gelen SSE gövdesini olay olay okur. */
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
 * Gerçek kaynak: Stüdyo'dan gelen krokiyi /api/run'a yollar, sunucunun SSE ile akıttığı Okuyucu
 * olaylarını iletir. Okuyucu bitince Tasarımcı'dan Noter'e kalan kısım demo senaryosuyla sürer.
 */
export function createRealSource(brief: StudioBrief): AgentEventSource {
  let runId: string | null = null;
  const abort = new AbortController();
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    connect(emit, now) {
      let queue: AgentEvent[] = [];
      let readerDone = false;
      let finished = false;
      let lastT = 0;
      let gotAny = false;

      const pump = () => {
        while (queue.length && queue[0].t <= now()) {
          const e = queue.shift() as AgentEvent;
          if (e.type === "run_finished") finished = true;
          emit(e);
        }
      };

      const startDemo = (doneAt: number) => {
        readerDone = true;
        queue = [
          // Okuyucu'nun "bitti" balonu kısa süre sonra kalkar
          { type: "agent_bubble", t: doneAt + 0.8, agent: "reader", kind: "done", text: null } as AgentEvent,
          ...demoAfterReader().map((e) => ({ ...e, t: Math.round((e.t + doneAt) * 100) / 100 })),
        ].sort((a, b) => a.t - b.t);
        pump();
        timer = setInterval(pump, 100);
      };

      const fail = (message: string) => {
        if (finished) return;
        finished = true;
        emit({ type: "agent_error", t: lastT, agent: "reader", message });
        emit({ type: "run_finished", t: lastT });
      };

      const onEvent = (event: string, data: string) => {
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
        if (e.type === "run_finished") finished = true;
        emit(e);
        if (e.type === "agent_done" && e.agent === "reader" && e.final) startDemo(e.t);
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
          if (!res.ok || !res.body) {
            emit({ type: "run_started", t: 0 });
            fail(READER_ERROR);
            return;
          }
          await readSSE(res.body, onEvent);
          // Okuyucu bitmeden akış kapandıysa (sunucu düştü gibi) hatayı göster
          if (!readerDone && !finished) fail(READER_ERROR);
        } catch {
          if (abort.signal.aborted) return;
          if (!gotAny) emit({ type: "run_started", t: 0 });
          if (!readerDone) fail(READER_ERROR);
        }
      })();

      return () => {
        abort.abort();
        if (timer) clearInterval(timer);
        timer = null;
        queue = [];
      };
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
 * - Aksi halde Stüdyo'dan kroki geldiyse gerçek kaynak (Okuyucu gerçek, sonrası demo); kroki yoksa demo.
 */
export function createEventSource({ demo, brief }: { demo: boolean; brief: StudioBrief | null }): AgentEventSource {
  if (demo || !brief?.image) return createDemoSource();
  return createRealSource(brief);
}
