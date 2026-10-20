// Agent sahnesinin demo senaryosu: zaman tabloları ve bunlardan türeyen görünüm.
//
// Akış: useScenario() (ya da ileride gerçek agent olaylarını dinleyen bir hook)
// bir `SceneClock` üretir → deriveScene(clock) ekranın tamamını besleyen
// `SceneView`'i çıkarır. Bileşenler yalnızca SceneView'i bilir; senaryo tabloları
// yerine SSE/WebSocket olayları aynı SceneClock'u (ya da doğrudan SceneView'i) doldurabilir.

import { CHARACTER_IDS, STATE_NAMES, type CharacterId, type CharacterState } from "@/components/character/faces";
import { SKETCH_HASH, SPEC_HASH, TX_HASH } from "@/lib/placeholders";

export const ASK_AT = 5.5;
export const AUTO = 8;
export const END = 39.6;
export const SLOT_W = 212;
export const SPEC_W = 168;

export type Answer = "Buton" | "Görsel";
export type Tone = "pass" | "fail" | "warn" | "none";

// ---------- girdi: sahnenin saati ----------

export interface SceneClock {
  /** Script zamanı: soru anında durur, cevaplanınca akar. <0: başlamadı. */
  s: number;
  /** Gerçek geçen süre */
  T: number;
  /** Okuyucunun sorusu cevaplandı mı */
  answered: boolean;
  answer: Answer;
  /** Cevap süre dolunca otomatik verildi */
  auto: boolean;
  skipped: boolean;
  /** Soruda geçen bekleme (gerçek süre) */
  wait: number;
  /** Çalışma sürüyor ya da bitti (idle değil) */
  live: boolean;
}

export const IDLE_CLOCK: SceneClock = { s: -1, T: 0, answered: false, answer: "Buton", auto: false, skipped: false, wait: 0, live: false };

export function scriptTime(T: number, answerAt: number | null): number {
  if (T < ASK_AT) return T;
  if (answerAt === null) return ASK_AT;
  return ASK_AT + (T - answerAt);
}

// ---------- senaryo tabloları ----------

export interface AgentInfo {
  id: CharacterId;
  name: string;
  role: string;
  inp: string;
  out: string;
  quote: string;
  why: string;
}

export const AGENTS: AgentInfo[] = [
  { id: "reader", name: "Okuyucu", role: "Krokideki öğeleri tanır", inp: "kroki.png", out: "9 öğe + 1 cevap", quote: '"Ne çizdiysen okurum. Emin değilsem sorarım."',
    why: "Kutu#5 hem buton hem görsel olabilirdi, güven 0.52 kaldı. Tahmin etmek yerine sana sordu." },
  { id: "designer", name: "Tasarımcı", role: "Grid, palet, font, metin", inp: "öğe listesi", out: "layout · style · content", quote: "\"Grid’i, rengi, fontu bana bırak.\"",
    why: "Kroki dört dikey bölgeye ayrılıyor; 12 sütun hizayı korur. Mor birincil renk, koyu metinle rahat okunur." },
  { id: "generator", name: "Üretici", role: "Tasarımı üretir", inp: "design-spec", out: "3 taslak", quote: "\"Spec’i ver, gerisini ben hallederim.\"",
    why: "Eleştirmen ne dediyse onu düzeltti: önce hizalama, sonra kontrast." },
  { id: "critic", name: "Eleştirmen", role: "Krokiyle kıyaslar, puanlar", inp: "kroki + taslak", out: "skor + not", quote: '"Krokiye benzemiyorsa geri yollarım. Kusura bakma."',
    why: "Eşik 0.85. İlk taslakta buton yanlış yerdeydi ve başlık küçüktü. Üçüncüde her kriter 0.8’in üstüne çıktı." },
  { id: "notary", name: "Noter", role: "Kaynağı zincire mühürler", inp: "kroki + spec", out: "Monad tx", quote: '"Kim çizdi, ne çıktı, hepsi zincirde."',
    why: "Kroki ve spec’in hash’i zincire yazılır; tasarımın bu krokiden çıktığı sonradan doğrulanabilir." },
];

export function findAgent(id: CharacterId): AgentInfo {
  return AGENTS.find((a) => a.id === id) ?? AGENTS[0];
}

export const ACTIVE: Record<CharacterId, [number, number][]> = {
  reader: [[0, 5.5]],
  designer: [[5.5, 14.3]],
  generator: [[14.3, 19.1], [22.1, 26.2], [28.7, 32.3]],
  critic: [[19.1, 22.1], [26.2, 28.7], [32.3, 34.8]],
  notary: [[34.8, 39.6]],
};

export const SCORES = [
  { v: "0.61", at: 21.4, n: 0.61 },
  { v: "0.78", at: 28.0, n: 0.78 },
  { v: "0.87", at: 34.1, n: 0.87 },
];

export const CRIT: [string, number][][] = [
  [["Yerleşim uyumu", 0.52], ["Öğe eşleşmesi", 0.74], ["Hiyerarşi", 0.63], ["Kontrast", 0.55]],
  [["Yerleşim uyumu", 0.86], ["Öğe eşleşmesi", 0.82], ["Hiyerarşi", 0.76], ["Kontrast", 0.68]],
  [["Yerleşim uyumu", 0.90], ["Öğe eşleşmesi", 0.89], ["Hiyerarşi", 0.86], ["Kontrast", 0.83]],
];

export const OUT_LABELS = ["bekleniyor", "grid", "palet", "içerik", "taslak 1", "taslak 2", "taslak 3", "mühürlendi"];

interface JsonLine {
  k: string;
  v?: string;
  dyn?: "amb" | "render" | "score" | "passed";
  ind: number;
  at: number;
  ch?: number[];
  ag: CharacterId | "sys";
  f?: 1;
}

export const JL: JsonLine[] = [
  { k: "", v: "{", ind: 0, at: -1, ag: "sys" },
  { k: '"source": ', v: "{", ind: 1, at: 1.0, ag: "reader" },
  { k: '"sketch": ', v: '"kroki.png",', ind: 2, at: 1.0, ag: "reader", f: 1 },
  { k: '"elements": ', v: "9,", ind: 2, at: 3.5, ag: "reader", f: 1 },
  { k: '"ambiguous": ', dyn: "amb", ind: 2, at: 5.51, ag: "reader", f: 1 },
  { k: "", v: "},", ind: 1, at: 1.0, ag: "reader" },
  { k: '"layout": ', v: "{", ind: 1, at: 6.6, ag: "designer" },
  { k: '"grid": ', v: '"12 sütun · 16px",', ind: 2, at: 7.6, ag: "designer", f: 1 },
  { k: '"sections": ', v: '["nav","hero","cta","kart"]', ind: 2, at: 8.6, ag: "designer", f: 1 },
  { k: "", v: "},", ind: 1, at: 6.6, ag: "designer" },
  { k: '"style": ', v: "{", ind: 1, at: 9.2, ag: "designer" },
  { k: '"palette": ', v: '["#6E54FF","#FFB84D"],', ind: 2, at: 10.0, ag: "designer", f: 1 },
  { k: '"font": ', v: '"Bricolage / Geist"', ind: 2, at: 10.8, ag: "designer", f: 1 },
  { k: "", v: "},", ind: 1, at: 9.2, ag: "designer" },
  { k: '"content": ', v: "{", ind: 1, at: 11.8, ag: "designer" },
  { k: '"title": ', v: '"Fikrini çiz, tasarımı al.",', ind: 2, at: 12.5, ag: "designer", f: 1 },
  { k: '"cta": ', v: '"Hemen dene"', ind: 2, at: 13.4, ag: "designer", f: 1 },
  { k: "", v: "},", ind: 1, at: 11.8, ag: "designer" },
  { k: '"render": ', dyn: "render", ind: 1, at: 15.1, ch: [22.7, 29.3], ag: "generator", f: 1 },
  { k: '"review": ', v: "{", ind: 1, at: 19.3, ag: "critic" },
  { k: '"score": ', dyn: "score", ind: 2, at: 21.4, ch: [28.0, 34.1], ag: "critic", f: 1 },
  { k: '"passed": ', dyn: "passed", ind: 2, at: 21.4, ch: [34.1], ag: "critic", f: 1 },
  { k: "", v: "},", ind: 1, at: 19.3, ag: "critic" },
  { k: '"provenance": ', v: "{", ind: 1, at: 35.8, ag: "notary" },
  { k: '"sketchHash": ', v: `"${SKETCH_HASH}",`, ind: 2, at: 36.9, ag: "notary", f: 1 },
  { k: '"specHash": ', v: `"${SPEC_HASH}",`, ind: 2, at: 38.2, ag: "notary", f: 1 },
  { k: '"tx": ', v: `"${TX_HASH}"`, ind: 2, at: 39.6, ag: "notary", f: 1 },
  { k: "", v: "}", ind: 1, at: 35.8, ag: "notary" },
  { k: "", v: "}", ind: 0, at: -1, ag: "sys" },
];

interface EventLine {
  at: number;
  ag: CharacterId | "user";
  t: string;
}

export const EV: EventLine[] = [
  { at: 0, ag: "reader", t: "krokiyi aldı" },
  { at: 3.5, ag: "reader", t: "9 öğe buldu" },
  { at: 5.5, ag: "reader", t: "bir soru sordu" },
  { at: 5.51, ag: "user", t: "ANSWER" },
  { at: 9.0, ag: "designer", t: "12 sütunlu grid kurdu" },
  { at: 11.6, ag: "designer", t: "palet ve fontu seçti" },
  { at: 14.3, ag: "designer", t: "spec’i teslim etti" },
  { at: 17.5, ag: "generator", t: "taslak 1’i üretti" },
  { at: 21.4, ag: "critic", t: "0.61 verdi, geri yolladı" },
  { at: 24.8, ag: "generator", t: "taslak 2’yi üretti" },
  { at: 28.0, ag: "critic", t: "0.78 verdi, geri yolladı" },
  { at: 31.1, ag: "generator", t: "taslak 3’ü üretti" },
  { at: 34.1, ag: "critic", t: "0.87 verdi, onayladı" },
  { at: 39.6, ag: "notary", t: `zincire yazdı · tx ${TX_HASH}` },
];

// ---------- yardımcılar ----------

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

export function fmt1(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");
}

export function clock(T: number) {
  const m = Math.floor(T / 60);
  const s = T - m * 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s.toFixed(1).replace(".", ",");
}

export function accrued(id: CharacterId, s: number) {
  let sum = 0;
  ACTIVE[id].forEach((iv) => {
    if (s > iv[0]) sum += Math.min(s, iv[1]) - iv[0];
  });
  return sum;
}

export function totalOf(id: CharacterId) {
  return ACTIVE[id].reduce((sum, iv) => sum + (iv[1] - iv[0]), 0);
}

export function att(s: number) {
  return s < 22.7 ? 1 : s < 29.3 ? 2 : 3;
}

export function agentState(id: CharacterId, s: number, answered: boolean): CharacterState {
  if (s < 0) return "portrait";
  if (id === "reader") return s < ASK_AT ? "working" : answered ? "done" : "asking";
  if (id === "designer") return s < 6.3 ? "waiting" : s < 14.3 ? "working" : "done";
  if (id === "generator") {
    if (s < 15.1) return "waiting";
    if (s < 19.1) return "working";
    if (s < 22.1) return "waiting";
    if (s < 22.7) return "error";
    if (s < 26.2) return "working";
    if (s < 28.7) return "waiting";
    if (s < 29.3) return "error";
    if (s < 32.3) return "working";
    return "done";
  }
  if (id === "critic") {
    if (s < 19.1) return "waiting";
    if (s < 21.4) return "working";
    if (s < 22.7) return "error";
    if (s < 26.2) return "waiting";
    if (s < 28.0) return "working";
    if (s < 29.3) return "error";
    if (s < 32.3) return "waiting";
    if (s < 34.1) return "working";
    return "done";
  }
  return s < 35.6 ? "waiting" : s < END ? "working" : "done";
}

export type StepDot = "done" | "active" | "idle";

function steps(times: number[], labels: string[], s: number) {
  let idx = 0;
  times.forEach((t, i) => {
    if (s >= t) idx = i;
  });
  return { text: labels[idx], dots: times.map((_, i): StepDot => (i < idx ? "done" : i === idx ? "active" : "idle")) };
}

export interface Bubble {
  show: boolean;
  kind: "work" | "ask" | "done" | "err";
  text: string;
  steps?: StepDot[];
}

export function bubbleFor(id: CharacterId, st: CharacterState, s: number, answer: string): Bubble {
  const n = att(s);
  if (id === "reader") {
    if (st === "working") {
      const r = steps([0, 1.8, 3.5], ["Hmm, bu çizgiler ne diyor…", "Kutuları tek tek sayıyorum", "9 öğe buldum, fena değil!"], s);
      return { show: true, kind: "work", text: r.text, steps: r.dots };
    }
    if (st === "asking") return { show: true, kind: "ask", text: "Şu kutuya takıldım. Sana soracağım!" };
    if (st === "done" && s - ASK_AT < 0.8) return { show: true, kind: "done", text: answer + " dedin, not aldım." };
  }
  if (id === "designer") {
    if (st === "working") {
      const d = steps([6.3, 9.0, 11.6], ["12 sütun, hizalar cetvel gibi", "Mor + turuncu, bence tam olur", "Başlığı ben yazayım, kısa ve net"], s);
      return { show: true, kind: "work", text: d.text, steps: d.dots };
    }
    if (st === "done" && s < 15.1) return { show: true, kind: "done", text: "Spec hazır. Üretici, sende!" };
  }
  if (id === "generator" && st === "working") {
    const start = [15.1, 22.7, 29.3][n - 1];
    const dur = [4, 3.5, 3][n - 1];
    const L = [
      ["Kolları sıvadım, parçalar diziliyor", "Taslak 1 çıktı, bak bakalım!"],
      ["Tamam tamam, hizayı düzeltiyorum", "Taslak 2. Şimdi nasıl?"],
      ["Kontrastı açıyorum, son tur", "Taslak 3! Bu sefer olmuştur."],
    ][n - 1];
    const g = steps([start, start + dur * 0.6], L, s);
    return { show: true, kind: "work", text: g.text, steps: g.dots };
  }
  if (id === "critic") {
    if (st === "working") return { show: true, kind: "work", text: n === 1 ? "Krokiyle yan yana koyuyorum…" : "Bakalım bu sefer ne yapmış…" };
    if (st === "error") return { show: true, kind: "err", text: n === 1 ? "Başlık krokidekinden küçük kalmış, bir tur daha." : "Buton hâlâ soluk. 0.78, olmadı." };
    if (st === "done" && s < 35.5) return { show: true, kind: "done", text: "0.87. Peki, ikna oldum." };
  }
  if (id === "notary") {
    if (st === "working") {
      const q = steps([35.6, 36.9, 38.2], ["Krokinin parmak izini alıyorum", "Spec’i de mühürlüyorum", "Monad’a yazıyorum, imza bende"], s);
      return { show: true, kind: "work", text: q.text, steps: q.dots };
    }
    if (st === "done") return { show: true, kind: "done", text: "Mühürlendi. Artık kayıtlı." };
  }
  return { show: false, kind: "work", text: "" };
}

export function specIdx(s: number) {
  if (s < 5.5) return 0;
  if (s < 14.3) return 1;
  if (s < 19.1) return 2;
  if (s < 22.1) return 3;
  if (s < 26.2) return 2;
  if (s < 28.7) return 3;
  if (s < 32.3) return 2;
  if (s < 34.8) return 3;
  return 4;
}

export function outLevel(s: number) {
  if (s < 6.3) return 0;
  if (s < 9.0) return 1;
  if (s < 11.6) return 2;
  if (s < 17.5) return 3;
  if (s < 24.8) return 4;
  if (s < 31.1) return 5;
  if (s < END) return 6;
  return 7;
}

// ---------- çıktı: ekranın görünümü ----------

export interface SlotView {
  id: CharacterId;
  name: string;
  state: CharacterState;
  working: boolean;
  align: "l" | "c" | "r";
  bubble: Bubble;
  chip: string;
  tone: "on" | "ok" | "bad" | "";
}

export interface ScoreChip {
  v: string;
  tone: Tone;
  cur: boolean;
  arrow: string;
}

export interface SegView {
  id: CharacterId;
  name: string;
  flex: number;
  fill: number;
  divs: number[];
  dur: string;
  current: boolean;
}

export interface SceneView {
  started: boolean;
  clockText: string;
  stepText: string;
  slots: SlotView[];
  states: Record<CharacterId, CharacterState>;
  askMode: "pending" | "asking" | "answered";
  answer: Answer;
  reveal: number;
  foundText: string;
  sketchHashText: string;
  spec: { visible: boolean; returning: boolean; left: number; version: number; fields: number; owner: string };
  loop: { on: boolean; hot: boolean };
  scoreChips: ScoreChip[];
  scoreBig: string;
  scoreTone: Tone;
  events: { who: string; t: string; time: string; op: number }[];
  jsonLines: { k: string; v: string; pad: number; isNew: boolean }[];
  jsonFields: number;
  showAsk: boolean;
  askHint: string;
  outLevel: number;
  outLabel: string;
  outBusy: boolean;
  paletteDim: boolean;
  segs: SegView[];
  timelineNote: string;
}

export function deriveScene(c: SceneClock): SceneView {
  const { s, T, answered, answer, auto, skipped, wait } = c;
  const started = s >= 0;
  const ansLow = answer === "Görsel" ? "görsel" : "buton";
  const realT = (at: number) => (at <= ASK_AT ? at : at + wait);

  const states = {} as Record<CharacterId, CharacterState>;
  CHARACTER_IDS.forEach((id) => {
    states[id] = agentState(id, s, answered);
  });

  const slots: SlotView[] = AGENTS.map((a, i) => {
    const st = states[a.id];
    let chip: string = STATE_NAMES[st];
    if (st === "done") chip = "bitti · " + fmt1(accrued(a.id, s)) + " sn";
    const tone = st === "working" || st === "asking" ? "on" : st === "done" ? "ok" : st === "error" ? "bad" : "";
    return {
      id: a.id,
      name: a.name,
      state: st,
      working: st === "working",
      align: i === 0 ? "l" : i === 4 ? "r" : "c",
      bubble: bubbleFor(a.id, st, s, answer),
      chip,
      tone,
    };
  });

  let stepText = "Hazır. Başlat’a bas, ekip işe koyulsun.";
  if (started) {
    if (states.reader === "working") stepText = "Okuyucu krokini okuyor";
    else if (states.reader === "asking") stepText = "Okuyucu sana bir şey soruyor";
    else if (s < 14.3) stepText = "Tasarımcı spec’i kuruyor";
    else if (s < 34.8) stepText = "Üretici ile Eleştirmen pazarlıkta · deneme " + att(s);
    else if (s < END) stepText = "Noter mühür basıyor";
    else stepText = "Bitti. Tasarım zincirde.";
  }

  const jsonLines: SceneView["jsonLines"] = [];
  let fields = 0;
  let sections = 0;
  JL.forEach((l) => {
    if (s < l.at) return;
    let v = l.v ?? "";
    if (l.dyn === "amb") v = `"kutu#5 → ${ansLow}",`;
    if (l.dyn === "render") v = `{ "attempts": ${att(s)} },`;
    if (l.dyn === "score") v = (s < 28.0 ? "0.61" : s < 34.1 ? "0.78" : "0.87") + ",";
    if (l.dyn === "passed") v = s >= 34.1 ? "true" : "false";
    let last = l.at;
    (l.ch ?? []).forEach((ch) => {
      if (s >= ch) last = ch;
    });
    const isNew = l.ag !== "sys" && started && s - last < 2.2;
    if (l.f) fields++;
    if (l.ind === 1 && l.k) sections++;
    jsonLines.push({ k: l.k, v, pad: l.ind * 18, isNew });
  });

  const idx = specIdx(s);
  const returning = (s >= 22.1 && s < 22.7) || (s >= 28.7 && s < 29.3);

  const shown = SCORES.filter((x) => s >= x.at);
  const lastScore = shown.length ? shown[shown.length - 1] : null;
  const scoreChips: ScoreChip[] = SCORES.map((x, i) => {
    const vis = s >= x.at;
    return {
      v: vis ? x.v : "—",
      tone: vis ? (x.n >= 0.85 ? "pass" : "fail") : "none",
      cur: !!lastScore && lastScore.v === x.v,
      arrow: i < 2 ? "→" : "",
    };
  });
  const critWorking = states.critic === "working";
  const loopOn = s >= 19.1 && s < 34.8;

  const events = EV.filter((e) => s >= e.at && (e.ag !== "user" || answered))
    .map((e) => {
      const who = e.ag === "user" ? "Sen" : findAgent(e.ag).name;
      const t = e.ag === "user" ? (skipped ? 'soruyu atladın, "buton" kaldı' : `"${answer}" dedin` + (auto ? " (süre doldu)" : "")) : e.t;
      return { who, t, time: clock(realT(e.at)), op: 1 };
    })
    .reverse()
    .slice(0, 3);
  events.forEach((e, i) => {
    e.op = 1 - i * 0.25;
  });

  const segs: SegView[] = AGENTS.map((a) => {
    const tot = totalOf(a.id);
    const acc = Math.max(0, accrued(a.id, s));
    const st = states[a.id];
    const divs = a.id === "generator" ? [38.4, 71.2] : a.id === "critic" ? [37.5, 68.75] : [];
    return {
      id: a.id,
      name: a.name,
      flex: tot,
      fill: r1(Math.min(100, (acc / tot) * 100)),
      divs,
      dur: fmt1(acc > 0 ? acc : tot) + " sn",
      current: started && (st === "working" || st === "asking" || st === "error"),
    };
  });

  const lvl = outLevel(s);
  let outLabel = OUT_LABELS[lvl];
  if (lvl === 6 && s >= 34.1) outLabel = "taslak 3 · onaylı";
  const genBusy = states.generator === "working" && (s < 17.5 || (s >= 22.7 && s < 24.8) || (s >= 29.3 && s < 31.1));

  const reveal = s < 1.5 ? 0 : Math.min(9, Math.floor((s - 1.5) / 0.4) + 1);

  return {
    started,
    clockText: clock(T),
    stepText,
    slots,
    states,
    askMode: s < ASK_AT ? "pending" : answered ? "answered" : "asking",
    answer,
    reveal,
    foundText: reveal > 0 ? `${reveal} öğe · ort. güven 0.89` : "henüz okunmadı",
    sketchHashText: s >= 36.9 ? SKETCH_HASH : "—",
    spec: {
      visible: started,
      returning,
      left: r1(SLOT_W * idx + (SLOT_W - SPEC_W) / 2),
      version: sections,
      fields,
      owner: idx === 0 ? "Okuyucu" : findAgent(AGENTS[idx].id).name,
    },
    loop: { on: loopOn, hot: returning || states.critic === "error" },
    scoreChips,
    scoreBig: critWorking ? "…" : lastScore ? lastScore.v : "—",
    scoreTone: lastScore ? (lastScore.n >= 0.85 ? "pass" : "fail") : "none",
    events,
    jsonLines,
    jsonFields: fields,
    showAsk: started && states.reader === "asking",
    askHint: c.live ? `${Math.max(0, Math.ceil(ASK_AT + AUTO - T))} sn içinde seçmezsen ben "buton" derim.` : `${AUTO} sn içinde seçmezsen ben "buton" derim.`,
    outLevel: lvl,
    outLabel,
    outBusy: genBusy,
    paletteDim: lvl < 2,
    segs,
    timelineNote: !started ? "Toplam süre" : states.reader === "asking" ? "Senin cevabını bekliyoruz…" : "Geçen süre " + clock(T),
  };
}

// ---------- agent ayrıntı paneli ----------

export interface AgentDetail {
  info: AgentInfo;
  state: CharacterState;
  stateLabel: string;
  dur: string;
  // okuyucu
  els?: { n: string; c: string; w: number; tone: Tone }[];
  answerText?: string;
  // üretici
  attempts?: { n: number; lvl: number; note: string; dur: string; score: string; tone: Tone }[];
  attemptCount?: string;
  // eleştirmen
  cmpLevel?: number;
  cmpLabel?: string;
  crit?: { n: string; v: string; w: number }[];
  // noter
  sealed?: boolean;
  h1?: string;
  h2?: string;
  h3?: string;
}

export function deriveAgentDetail(id: CharacterId, c: SceneClock): AgentDetail {
  const { s, answered, answer, auto, skipped } = c;
  const info = findAgent(id);
  const state = agentState(id, s, answered);
  const acc = accrued(id, s);
  const d: AgentDetail = { info, state, stateLabel: STATE_NAMES[state], dur: acc > 0 ? fmt1(acc) + " sn" : "—" };
  const ansLow = answer === "Görsel" ? "görsel" : "buton";
  const shown = SCORES.filter((x) => s >= x.at);
  const lastScore = shown.length ? shown[shown.length - 1] : null;

  if (id === "reader") {
    const els: [string, number][] = [["menü", 0.97], ["başlık", 0.95], ["alt metin", 0.88], ["görsel", 0.93], ["kutu#5", answered ? 0.96 : 0.52], ["kart", 0.90], ["kart", 0.89], ["kart", 0.91], ["alt bilgi", 0.84]];
    d.els = els.map((e, i) => ({
      n: i === 4 ? (answered ? "kutu#5 → " + ansLow : "kutu#5 · belirsiz") : e[0],
      c: e[1].toFixed(2),
      w: Math.round(e[1] * 100),
      tone: i === 4 && !answered ? "warn" : "none",
    }));
    d.answerText = answered ? answer + (skipped ? " (atlandı)" : auto ? " (süre doldu)" : "") : "bekleniyor";
  }
  if (id === "generator") {
    const all = [
      { n: 1, lvl: 4, note: '"İlk hali. Biraz aceleye geldi."', dur: "4,0 sn", score: "0.61", at: 17.5 },
      { n: 2, lvl: 5, note: '"Hizayı düzelttim, söz."', dur: "3,5 sn", score: "0.78", at: 24.8 },
      { n: 3, lvl: 6, note: '"Kontrastı açtım. Bu kesin."', dur: "3,0 sn", score: "0.87", at: 31.1 },
    ];
    d.attempts = all.filter((x) => s >= x.at).map((x): NonNullable<AgentDetail["attempts"]>[number] => ({ n: x.n, lvl: x.lvl, note: x.note, dur: x.dur, score: x.score, tone: x.score === "0.87" ? "pass" : "fail" }));
    d.attemptCount = d.attempts.length + " / 3";
  }
  if (id === "critic") {
    const ci = lastScore ? SCORES.indexOf(lastScore) : -1;
    d.cmpLevel = ci >= 0 ? [4, 5, 6][ci] : Math.max(outLevel(s), 3);
    d.cmpLabel = ci >= 0 ? "taslak " + (ci + 1) : "taslak";
    d.crit = (ci >= 0 ? CRIT[ci] : CRIT[0]).map((cr) => ({ n: cr[0], v: ci >= 0 ? cr[1].toFixed(2) : "—", w: ci >= 0 ? Math.round(cr[1] * 100) : 0 }));
  }
  if (id === "notary") {
    d.sealed = s >= END;
    d.h1 = s >= 36.9 ? SKETCH_HASH : "henüz yok";
    d.h2 = s >= 38.2 ? SPEC_HASH : "henüz yok";
    d.h3 = s >= END ? TX_HASH : "gönderilmedi";
  }
  return d;
}
