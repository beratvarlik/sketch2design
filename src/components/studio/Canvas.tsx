"use client";

import { useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from "react";
import Character from "@/components/character/Character";
import { FORMATS, NOTE_WORDS, mkEll, mkLine, mkNote, mkPen, mkRect, type FormatId, type Item, type Pt, type Tool } from "@/lib/studio";
import s from "./canvas.module.css";

export interface Upload {
  name: string;
  dataUrl: string;
}

interface CanvasProps {
  tool: Tool;
  items: Item[];
  format: FormatId | null;
  upload: Upload | null;
  uploadError: string | null;
  noteWord: string;
  onNoteWord: (w: string) => void;
  onCommit: (items: Item[]) => void;
  onSample: () => void;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveUpload: () => void;
}

type Draft = { type: "pen"; pts: Pt[] } | { type: "rect" | "ell" | "line"; a: Pt; b: Pt };

function draftItem(d: Draft | null): Item | null {
  if (!d) return null;
  if (d.type === "pen") return mkPen(d.pts);
  if (d.type === "rect") return mkRect(d.a, d.b);
  if (d.type === "ell") return mkEll(d.a, d.b);
  return mkLine(d.a, d.b);
}

const clamp = (n: number) => Math.max(0, Math.min(1000, n));

export default function Canvas({ tool, items, format, upload, uploadError, noteWord, onNoteWord, onCommit, onSample, onFile, onRemoveUpload }: CanvasProps) {
  const [draft, setDraftState] = useState<Draft | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const erasing = useRef(false);

  function setDraft(d: Draft | null) {
    draftRef.current = d;
    setDraftState(d);
  }

  function norm(e: PointerEvent<HTMLDivElement>): Pt {
    const r = e.currentTarget.getBoundingClientRect();
    return [clamp(((e.clientX - r.left) / r.width) * 1000), clamp(((e.clientY - r.top) / r.height) * 1000)];
  }

  function eraseAt(p: Pt) {
    const keep = items.filter((it) => !it.pts.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 24));
    if (keep.length !== items.length) onCommit(keep);
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button, label, input, a, select")) return;
    const p = norm(e);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // yakalama desteklenmiyorsa çizim yine çalışır
    }
    if (tool === "note") {
      onCommit([...items, mkNote(p[0], p[1], noteWord)]);
      return;
    }
    if (tool === "eraser") {
      erasing.current = true;
      eraseAt(p);
      return;
    }
    setDraft(tool === "pen" ? { type: "pen", pts: [p] } : { type: tool, a: p, b: p });
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (erasing.current) {
      eraseAt(norm(e));
      return;
    }
    const d = draftRef.current;
    if (!d) return;
    const p = norm(e);
    if (d.type === "pen") {
      const last = d.pts[d.pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 4) return;
      setDraft({ type: "pen", pts: [...d.pts, p] });
    } else {
      setDraft({ ...d, b: p });
    }
  }

  function onUp() {
    erasing.current = false;
    const it = draftItem(draftRef.current);
    setDraft(null);
    if (it && it.size > 8) onCommit([...items, it]);
  }

  const strokes = items.filter((i) => i.type !== "note");
  const notes = items.filter((i) => i.type === "note");
  const d = draftItem(draft);
  const hasContent = items.length > 0 || !!upload;
  const ratio = FORMATS.find((f) => f.id === format)?.r ?? 0.75;

  return (
    <div className={s.col}>
      <div className={s.stage}>
        <div
          className={`${s.paper} ${s[`t_${tool}`] ?? ""}`}
          style={{ "--r": ratio } as CSSProperties}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="img"
          aria-label="Çizim alanı"
        >
          <span className={s.tape} aria-hidden="true" style={{ left: -18, top: 6, transform: "rotate(-32deg)" }} />
          <span className={s.tape} aria-hidden="true" style={{ right: -18, top: 6, transform: "rotate(30deg)" }} />

          {upload && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={s.upimg} src={upload.dataUrl} alt="Yüklenen kroki fotoğrafı" />
          )}
          {strokes.map((it) => (
            <svg key={it.id} className={s.layer} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <path d={it.d} />
            </svg>
          ))}
          {d && (
            <svg className={`${s.layer} ${s.draft}`} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <path d={d.d} />
            </svg>
          )}
          {notes.map((n) => (
            <span key={n.id} className={s.note} style={{ left: `${(n.x ?? 0) / 10}%`, top: `${(n.y ?? 0) / 10}%` }}>
              {n.label}
            </span>
          ))}

          {!hasContent && !d && (
            <div className={s.empty}>
              <div className={s.hint}>Kutular çiz, içine &quot;buton&quot;, &quot;başlık&quot; gibi notlar yaz. Gerisini ben okurum.</div>
              <Character id="reader" state="portrait" size={116} curious />
              <div className={s.emptyActions}>
                <button type="button" className={`${s.btn} ${s.btnInk}`} onClick={onSample}>
                  Örnek kroki koy
                </button>
                <label className={`${s.btn} ${s.btnInkOutline} ${s.upl}`}>
                  <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={onFile} />
                  Kağıt fotoğrafı yükle
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={s.foot}>
        <div className={s.footInfo}>
          <span>{hasContent ? `${strokes.length} çizim, ${notes.length} not` : "Kağıt boş"}</span>
          {upload && (
            <span className={s.upchip}>
              {upload.name}
              <button type="button" className={s.x} onClick={onRemoveUpload} aria-label="Yüklenen dosyayı kaldır">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                  <path d="M6.2 6.6 Q12 12.3 17.8 17.6 M17.5 6.3 Q12.2 11.8 6.4 17.9" />
                </svg>
              </button>
            </span>
          )}
          {uploadError && (
            <span className={s.err} role="alert">
              {uploadError}
            </span>
          )}
        </div>
        <label className={s.noteSel}>
          Not yazarken
          <select className={s.sel} value={noteWord} onChange={(e) => onNoteWord(e.target.value)}>
            {NOTE_WORDS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
