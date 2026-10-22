// Agent'ların sabit tanıtım metinleri ve sahnenin sabitleri (olay kaynağından bağımsız).

import type { CharacterId } from "@/components/character/faces";

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

/** Zaman çizelgesinde her agent'a ayrılan beklenen süre (sn); segment genişliğini belirler. */
export const TIMELINE_PLAN: Record<CharacterId, number> = {
  reader: 5.5,
  designer: 8.8,
  generator: 12.5,
  critic: 8,
  notary: 4.8,
};

export const OUT_LABELS = ["bekleniyor", "grid", "palet", "içerik", "taslak 1", "taslak 2", "taslak 3", "mühürlendi"];

export const ASK_AT = 5.5;
export const AUTO = 8;
export const SLOT_W = 212;
export const SPEC_W = 168;
export const SCORE_THRESHOLD = 0.85;
