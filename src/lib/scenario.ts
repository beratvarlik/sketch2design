// Demo senaryosu: ~40 sn'lik sahte agent hattı. Gerçek backend'in yollayacağı olayların
// aynısını (lib/events.ts) belirli saniyelerde üretir; sahne demo ile gerçek arasındaki farkı bilmez.
//
// Akış iki parça: Okuyucu soru sorana kadarki olaylar (faz 1) ve cevaptan sonrakiler (faz 2,
// çünkü bazı metinler cevaba bağlı). Script zamanı soru anında durur; kaynak olayları
// hook'un verdiği `now()` script zamanına göre salar.

import type { CharacterId } from "@/components/character/faces";
import { ASK_AT, AUTO } from "./agents";
import type { AgentEvent, AgentEventSource, Answer } from "./events";
import { SKETCH_HASH, SPEC_HASH, TX_HASH } from "./placeholders";

const END = 39.6;
/** run_finished, son olaydan kısa süre sonra gelir (son durumlar ekranda otursun). */
const FINISH_AT = END + 0.4;

export const DEMO_CRIT: [string, number][][] = [
  [["Yerleşim uyumu", 0.52], ["Öğe eşleşmesi", 0.74], ["Hiyerarşi", 0.63], ["Kontrast", 0.55]],
  [["Yerleşim uyumu", 0.86], ["Öğe eşleşmesi", 0.82], ["Hiyerarşi", 0.76], ["Kontrast", 0.68]],
  [["Yerleşim uyumu", 0.90], ["Öğe eşleşmesi", 0.89], ["Hiyerarşi", 0.86], ["Kontrast", 0.83]],
];

export const DEMO_DRAFTS = [
  { note: '"İlk hali. Biraz aceleye geldi."', durationSec: 4.0, score: 0.61 },
  { note: '"Hizayı düzelttim, söz."', durationSec: 3.5, score: 0.78 },
  { note: '"Kontrastı açtım. Bu kesin."', durationSec: 3.0, score: 0.87 },
];

export const DEMO_GEN_LABELS = [
  ["Kolları sıvadım, parçalar diziliyor", "Taslak 1 çıktı, bak bakalım!"],
  ["Tamam tamam, hizayı düzeltiyorum", "Taslak 2. Şimdi nasıl?"],
  ["Kontrastı açıyorum, son tur", "Taslak 3! Bu sefer olmuştur."],
];

const log = (agent: CharacterId, text: string) => ({ agent, text });

/** Okuyucu soruyu sorana (dahil) kadarki olaylar. */
function phaseOne(): AgentEvent[] {
  return [
    { type: "run_started", t: 0 },
    { type: "agent_started", t: 0, agent: "reader", log: log("reader", "krokiyi aldı") },
    { type: "agent_step", t: 0, agent: "reader", index: 0, total: 3, label: "Hmm, bu çizgiler ne diyor…" },
    { type: "spec_patch", t: 1.0, path: "source", value: {} },
    { type: "spec_patch", t: 1.0, path: "source.sketch", value: "kroki.png" },
    { type: "agent_step", t: 1.8, agent: "reader", index: 1, total: 3, label: "Kutuları tek tek sayıyorum" },
    { type: "agent_step", t: 3.5, agent: "reader", index: 2, total: 3, label: "9 öğe buldum, fena değil!" },
    { type: "spec_patch", t: 3.5, path: "source.elements", value: 9, log: log("reader", "9 öğe buldu") },
    {
      type: "agent_question",
      t: ASK_AT,
      agent: "reader",
      question: "Bu kutu bir buton mu, görsel mi?",
      bubble: "Şu kutuya takıldım. Sana soracağım!",
      options: ["Buton", "Görsel"],
      timeoutSec: AUTO,
      defaultAnswer: "Buton",
      log: log("reader", "bir soru sordu"),
    },
  ];
}

/** Cevaptan sonraki olaylar (script zamanı 5.5'ten akar). */
function phaseTwo(answer: Answer): AgentEvent[] {
  const ansLow = answer === "Görsel" ? "görsel" : "buton";
  const ev: AgentEvent[] = [
    // Okuyucu bitirir, Tasarımcı görevi alır
    { type: "agent_done", t: 5.5, agent: "reader", final: true, message: `${answer} dedin, not aldım.` },
    { type: "agent_started", t: 5.5, agent: "designer" },
    { type: "spec_patch", t: 5.51, path: "source.ambiguous", value: `kutu#5 → ${ansLow}` },
    { type: "agent_bubble", t: 6.3, agent: "reader", kind: "done", text: null },
    { type: "agent_step", t: 6.3, agent: "designer", index: 0, total: 3, label: "12 sütun, hizalar cetvel gibi" },
    { type: "output_update", t: 6.3, level: 1 },
    { type: "spec_patch", t: 6.6, path: "layout", value: {} },
    { type: "spec_patch", t: 7.6, path: "layout.grid", value: "12 sütun · 16px" },
    { type: "spec_patch", t: 8.6, path: "layout.sections", value: ["nav", "hero", "cta", "kart"] },
    { type: "agent_step", t: 9.0, agent: "designer", index: 1, total: 3, label: "Mor + turuncu, bence tam olur", log: log("designer", "12 sütunlu grid kurdu") },
    { type: "output_update", t: 9.0, level: 2 },
    { type: "spec_patch", t: 9.2, path: "style", value: {} },
    { type: "spec_patch", t: 10.0, path: "style.palette", value: ["#6E54FF", "#FFB84D"] },
    { type: "spec_patch", t: 10.8, path: "style.font", value: "Bricolage / Geist" },
    { type: "agent_step", t: 11.6, agent: "designer", index: 2, total: 3, label: "Başlığı ben yazayım, kısa ve net", log: log("designer", "palet ve fontu seçti") },
    { type: "output_update", t: 11.6, level: 3 },
    { type: "spec_patch", t: 11.8, path: "content", value: {} },
    { type: "spec_patch", t: 12.5, path: "content.title", value: "Fikrini çiz, tasarımı al." },
    { type: "spec_patch", t: 13.4, path: "content.cta", value: "Hemen dene" },
    { type: "agent_done", t: 14.3, agent: "designer", final: true, message: "Spec hazır. Üretici, sende!", log: log("designer", "spec’i teslim etti") },
    { type: "agent_started", t: 14.3, agent: "generator", attempt: 1 },
    { type: "agent_bubble", t: 15.1, agent: "designer", kind: "done", text: null },
  ];

  // Üretici ⇄ Eleştirmen turları: [üretici adımı, taslak hazır, üretici bitti, eleştirmen başladı, puan, eleştirmen bitti]
  const rounds = [
    { n: 1, genStart: 15.1, draftAt: 17.5, genEnd: 19.1, criticStart: 19.1, scoreAt: 21.4, criticEnd: 22.7, nextGen: 22.1 },
    { n: 2, genStart: 22.7, draftAt: 24.8, genEnd: 26.2, criticStart: 26.2, scoreAt: 28.0, criticEnd: 29.3, nextGen: 28.7 },
    { n: 3, genStart: 29.3, draftAt: 31.1, genEnd: 32.3, criticStart: 32.3, scoreAt: 34.1, criticEnd: 34.1 },
  ];

  rounds.forEach((r, i) => {
    const d = DEMO_DRAFTS[i];
    const last = r.n === 3;
    ev.push(
      { type: "agent_step", t: r.genStart, agent: "generator", index: 0, total: 2, label: DEMO_GEN_LABELS[i][0] },
      { type: "spec_patch", t: r.genStart, path: "render", value: { attempts: r.n } },
      { type: "output_update", t: r.genStart, level: r.n + 2, busy: true },
      { type: "agent_step", t: r.draftAt, agent: "generator", index: 1, total: 2, label: DEMO_GEN_LABELS[i][1] },
      {
        type: "output_update",
        t: r.draftAt,
        level: r.n + 3,
        busy: false,
        draft: { attempt: r.n, note: d.note, durationSec: d.durationSec, score: d.score },
        log: log("generator", `taslak ${r.n}${r.n === 1 ? "’i" : r.n === 2 ? "’yi" : "’ü"} üretti`),
      },
      { type: "agent_done", t: r.genEnd, agent: "generator", final: last },
      { type: "agent_started", t: r.criticStart, agent: "critic", attempt: r.n },
      { type: "agent_step", t: r.criticStart, agent: "critic", index: 0, total: 1, label: r.n === 1 ? "Krokiyle yan yana koyuyorum…" : "Bakalım bu sefer ne yapmış…" },
    );
    if (r.n === 1) ev.push({ type: "spec_patch", t: 19.3, path: "review", value: {} });
    ev.push(
      {
        type: "critic_score",
        t: r.scoreAt,
        attempt: r.n,
        score: d.score,
        passed: d.score >= 0.85,
        criteria: DEMO_CRIT[i],
        log: log("critic", last ? "0.87 verdi, onayladı" : `${d.score.toFixed(2)} verdi, geri yolladı`),
      },
      { type: "spec_patch", t: r.scoreAt, path: "review.score", value: d.score },
    );
    if (r.n === 1 || last) ev.push({ type: "spec_patch", t: r.scoreAt, path: "review.passed", value: last });
    if (!last) {
      ev.push(
        {
          type: "agent_error",
          t: r.scoreAt,
          agent: "critic",
          message: r.n === 1 ? "Başlık krokidekinden küçük kalmış, bir tur daha." : "Buton hâlâ soluk. 0.78, olmadı.",
        },
        // Üretici geri döner (eleştirmenin süresi kapanır), ama "tekrar" yüzü 22.7'ye kadar kalır
        { type: "agent_started", t: r.nextGen as number, agent: "generator", attempt: r.n + 1 },
        { type: "agent_error", t: r.nextGen as number, agent: "generator" },
        { type: "agent_done", t: r.criticEnd, agent: "critic", final: false },
      );
    } else {
      ev.push({ type: "agent_done", t: r.criticEnd, agent: "critic", final: true, message: "0.87. Peki, ikna oldum." });
      ev.push({ type: "output_update", t: r.scoreAt, level: 6, label: "taslak 3 · onaylı", busy: false });
    }
  });

  ev.push(
    { type: "agent_started", t: 34.8, agent: "notary" },
    { type: "agent_bubble", t: 35.5, agent: "critic", kind: "done", text: null },
    { type: "agent_step", t: 35.6, agent: "notary", index: 0, total: 3, label: "Krokinin parmak izini alıyorum" },
    { type: "spec_patch", t: 35.8, path: "provenance", value: {} },
    { type: "agent_step", t: 36.9, agent: "notary", index: 1, total: 3, label: "Spec’i de mühürlüyorum" },
    { type: "spec_patch", t: 36.9, path: "provenance.sketchHash", value: SKETCH_HASH },
    { type: "agent_step", t: 38.2, agent: "notary", index: 2, total: 3, label: "Monad’a yazıyorum, imza bende" },
    { type: "spec_patch", t: 38.2, path: "provenance.specHash", value: SPEC_HASH },
    { type: "spec_patch", t: END, path: "provenance.tx", value: TX_HASH },
    { type: "seal_done", t: END, sketchHash: SKETCH_HASH, specHash: SPEC_HASH, tx: TX_HASH, log: log("notary", `zincire yazdı · tx ${TX_HASH}`) },
    { type: "agent_done", t: END, agent: "notary", final: true, message: "Mühürlendi. Artık kayıtlı." },
    { type: "output_update", t: END, level: 7 },
    { type: "run_finished", t: FINISH_AT },
  );

  // Aynı saniyedeki olaylar yazıldığı sırayla kalır (Array.sort kararlı)
  return ev.sort((a, b) => a.t - b.t);
}

export function createDemoSource(): AgentEventSource {
  let queue: AgentEvent[] = phaseOne();
  let emit: ((e: AgentEvent) => void) | null = null;
  let now: () => number = () => 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const pump = () => {
    // Soru bekleyen script saati durduğu için `now()` 5.5'te kalır; faz 2 yüklenene kadar kuyruk boş.
    while (emit && queue.length && queue[0].t <= now()) emit(queue.shift() as AgentEvent);
  };

  return {
    connect(onEvent, getNow) {
      emit = onEvent;
      now = getNow;
      pump();
      timer = setInterval(pump, 100);
      return () => {
        if (timer) clearInterval(timer);
        timer = null;
        emit = null;
        queue = [];
      };
    },
    respond(answer) {
      queue = phaseTwo(answer);
      pump();
    },
  };
}
