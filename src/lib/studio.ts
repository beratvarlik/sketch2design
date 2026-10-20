// Stüdyo: çizim öğeleri, format ve palet tabloları, /run'a taşınan seçimler.
// Koordinatlar 0–1000 aralığında normalize edilir.

export type Tool = "pen" | "rect" | "ell" | "line" | "note" | "eraser";
export type Pt = [number, number];

export interface Item {
  id: number;
  type: "pen" | "rect" | "ell" | "line" | "note";
  /** SVG path (not hariç) */
  d: string;
  /** silgi için örnek noktalar */
  pts: Pt[];
  size: number;
  /** yalnızca not */
  x?: number;
  y?: number;
  label?: string;
}

export type FormatId = "poster" | "post" | "deck" | "web" | "mobile";

export const FORMATS: { id: FormatId; name: string; ratioLabel: string; r: number; w: number; h: number }[] = [
  { id: "poster", name: "Afiş", ratioLabel: "3:4", r: 0.75, w: 27, h: 36 },
  { id: "post", name: "Sosyal medya", ratioLabel: "1:1", r: 1, w: 32, h: 32 },
  { id: "deck", name: "Sunum", ratioLabel: "16:9", r: 1.7778, w: 42, h: 24 },
  { id: "web", name: "Web sitesi", ratioLabel: "masaüstü", r: 1.6, w: 40, h: 25 },
  { id: "mobile", name: "Mobil uygulama", ratioLabel: "9:19.5", r: 0.4615, w: 17, h: 36 },
];

export const PALETTES = [
  { id: "monad", name: "Monad", c: ["#6E54FF", "#FFB84D", "#17162A", "#FFFDF8"] },
  { id: "night", name: "Gece", c: ["#0F172A", "#38BDF8", "#F472B6", "#E2E8F0"] },
  { id: "campus", name: "Kampüs", c: ["#1D4ED8", "#F59E0B", "#FFFFFF", "#111827"] },
  { id: "nature", name: "Doğa", c: ["#166534", "#A3E635", "#FEF9C3", "#1C1917"] },
  { id: "sunset", name: "Gün batımı", c: ["#9A3412", "#FB923C", "#FDE68A", "#1F1A17"] },
  { id: "mono", name: "Mono", c: ["#111111", "#555555", "#DDDDDD", "#FFFFFF"] },
];

export const NOTE_WORDS = ["başlık", "buton", "görsel", "metin", "kart", "menü", "logo"];

let uid = 1;

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

function ptsToD(pts: Pt[]) {
  return "M" + pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join(" L");
}

export function mkRect(a: Pt, b: Pt): Item {
  const x1 = r1(Math.min(a[0], b[0]));
  const x2 = r1(Math.max(a[0], b[0]));
  const y1 = r1(Math.min(a[1], b[1]));
  const y2 = r1(Math.max(a[1], b[1]));
  const pts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push([x1 + (x2 - x1) * t, y1], [x1 + (x2 - x1) * t, y2], [x1, y1 + (y2 - y1) * t], [x2, y1 + (y2 - y1) * t]);
  }
  return { id: uid++, type: "rect", d: `M${x1} ${y1} H${x2} V${y2} H${x1} Z`, pts, size: Math.max(x2 - x1, y2 - y1) };
}

export function mkEll(a: Pt, b: Pt): Item {
  const cx = (a[0] + b[0]) / 2;
  const cy = (a[1] + b[1]) / 2;
  const rx = Math.abs(b[0] - a[0]) / 2;
  const ry = Math.abs(b[1] - a[1]) / 2;
  const pts: Pt[] = [];
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * Math.PI * 2;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return {
    id: uid++,
    type: "ell",
    d: `M${r1(cx - rx)} ${r1(cy)} a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0 a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0`,
    pts,
    size: Math.max(rx, ry) * 2,
  };
}

export function mkLine(a: Pt, b: Pt): Item {
  const pts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return { id: uid++, type: "line", d: `M${r1(a[0])} ${r1(a[1])} L${r1(b[0])} ${r1(b[1])}`, pts, size: Math.hypot(b[0] - a[0], b[1] - a[1]) };
}

export function mkPen(pts: Pt[]): Item {
  return { id: uid++, type: "pen", d: ptsToD(pts), pts, size: pts.length * 4 };
}

export function mkNote(x: number, y: number, label: string): Item {
  return { id: uid++, type: "note", d: "", x, y, label, pts: [[x + 20, y]], size: 0 };
}

function zig(x0: number, x1: number, y: number, amp: number, step: number): Pt[] {
  const pts: Pt[] = [];
  let up = true;
  for (let x = x0; x <= x1; x += step) {
    pts.push([x, y + (up ? -amp : amp)]);
    up = !up;
  }
  return pts;
}

export function sampleItems(): Item[] {
  return [
    mkRect([60, 30], [960, 110]), mkEll([82, 46], [148, 94]),
    mkPen(zig(70, 700, 178, 12, 26)), mkPen(zig(70, 520, 228, 12, 26)), mkLine([70, 276], [620, 282]),
    mkRect([60, 320], [960, 600]), mkLine([68, 328], [952, 592]), mkLine([952, 328], [68, 592]),
    mkRect([60, 640], [400, 720]),
    mkRect([60, 760], [340, 940]), mkRect([370, 760], [650, 940]), mkRect([680, 760], [960, 940]),
    mkNote(740, 70, "menü"), mkNote(730, 190, "başlık"), mkNote(440, 460, "görsel"), mkNote(420, 680, "buton"), mkNote(80, 800, "kart"),
  ];
}

/** /studio → /run arasında taşınan seçimler (şimdilik sessionStorage). */
export interface StudioBrief {
  title: string;
  format: FormatId;
  /** "auto" ya da PALETTES id'si */
  palette: string;
  customColors: string[];
  description: string;
  items: Item[];
  upload: { name: string; dataUrl: string | null } | null;
}

export const BRIEF_KEY = "sketch2design:brief";

export function saveBrief(brief: StudioBrief) {
  try {
    sessionStorage.setItem(BRIEF_KEY, JSON.stringify(brief));
  } catch {
    // fotoğraf kotayı aşmış olabilir; fotoğrafsız tekrar dene
    try {
      const upload = brief.upload ? { name: brief.upload.name, dataUrl: null } : null;
      sessionStorage.setItem(BRIEF_KEY, JSON.stringify({ ...brief, upload }));
    } catch {
      // sessionStorage kapalı: /run boş seçimle açılır
    }
  }
}

export function loadBrief(): StudioBrief | null {
  try {
    const raw = sessionStorage.getItem(BRIEF_KEY);
    return raw ? (JSON.parse(raw) as StudioBrief) : null;
  } catch {
    return null;
  }
}
