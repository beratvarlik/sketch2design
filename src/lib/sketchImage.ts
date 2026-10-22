// Stüdyo'daki krokiyi (çizimler + notlar + yüklenen fotoğraf) agent'ların okuyacağı PNG'ye çevirir.
// Tarayıcıda çalışır. Koordinatlar 0–1000 normalize olduğu için çıktı her boyutta aynı yerleşimi verir.

import type { Item } from "./studio";

interface RenderOptions {
  items: Item[];
  /** Yüklenen fotoğraf (data URL) */
  upload: string | null;
  /** Kağıdın en/boy oranı (formatın oranı) */
  ratio: number;
  /** PNG genişliği (px) */
  width?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Fotoğraf okunamadı"));
    img.src = src;
  });
}

export async function renderSketchPng({ items, upload, ratio, width = 1000 }: RenderOptions): Promise<string> {
  const W = width;
  const H = Math.round(W / ratio);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor");

  const css = getComputedStyle(document.documentElement);
  const paper = css.getPropertyValue("--paper").trim() || "#F3EEE3";
  const pencil = css.getPropertyValue("--pencil").trim() || "#2B2925";
  const noteFont = css.getPropertyValue("--font-caveat").trim() || "cursive";

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  if (upload) {
    const img = await loadImage(upload);
    const k = Math.min(W / img.width, H / img.height);
    const w = img.width * k;
    const h = img.height * k;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }

  const sx = W / 1000;
  const sy = H / 1000;
  ctx.strokeStyle = pencil;
  ctx.lineWidth = Math.max(2, W / 330);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const matrix = new DOMMatrix([sx, 0, 0, sy, 0, 0]);
  for (const it of items) {
    if (it.type === "note") continue;
    const p = new Path2D();
    p.addPath(new Path2D(it.d), matrix);
    ctx.stroke(p);
  }

  const fontPx = Math.round(W * 0.036);
  const font = `700 ${fontPx}px ${noteFont}`;
  try {
    await document.fonts.load(font);
  } catch {
    // yazı tipi yüklenemezse yedek yazı tipiyle çiz
  }
  ctx.font = font;
  ctx.fillStyle = pencil;
  ctx.textBaseline = "middle";
  for (const it of items) {
    if (it.type !== "note" || it.x === undefined || it.y === undefined) continue;
    ctx.save();
    ctx.translate(it.x * sx, it.y * sy);
    ctx.rotate((-3 * Math.PI) / 180);
    ctx.fillText(it.label ?? "", 0, 0);
    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}
