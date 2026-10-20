"use client";

import { useState, type ChangeEvent } from "react";
import TopBar from "@/components/layout/TopBar";
import Canvas, { type Upload } from "@/components/studio/Canvas";
import SettingsPanel from "@/components/studio/SettingsPanel";
import Toolbar from "@/components/studio/Toolbar";
import { FORMATS, saveBrief, sampleItems, type FormatId, type Item, type Tool } from "@/lib/studio";
import s from "./studio.module.css";

interface Doc {
  items: Item[];
  hist: Item[][];
  fut: Item[][];
}

export default function StudioPage() {
  const [doc, setDoc] = useState<Doc>({ items: [], hist: [], fut: [] });
  const [tool, setTool] = useState<Tool>("pen");
  const [noteWord, setNoteWord] = useState("buton");
  const [upload, setUpload] = useState<Upload | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState("Adsız kroki");
  const [format, setFormat] = useState<FormatId | null>(null);
  const [palette, setPalette] = useState("auto");
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const hasContent = doc.items.length > 0 || !!upload;
  const fmt = FORMATS.find((f) => f.id === format);

  function commit(items: Item[]) {
    setDoc((d) => ({ items, hist: [...d.hist, d.items].slice(-50), fut: [] }));
    setSaved(true);
  }

  function undo() {
    setDoc((d) => {
      if (!d.hist.length) return d;
      return { items: d.hist[d.hist.length - 1], hist: d.hist.slice(0, -1), fut: [...d.fut, d.items] };
    });
  }

  function redo() {
    setDoc((d) => {
      if (!d.fut.length) return d;
      return { items: d.fut[d.fut.length - 1], fut: d.fut.slice(0, -1), hist: [...d.hist, d.items] };
    });
  }

  function clear() {
    setDoc((d) => ({ items: [], hist: [...d.hist, d.items], fut: [] }));
    setUpload(null);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      setUploadError("Bunu okuyamam. PNG ya da JPG ver.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUpload({ name: file.name, dataUrl: String(reader.result) });
      setUploadError(null);
      setSaved(true);
    };
    reader.onerror = () => setUploadError("Bunu okuyamam. PNG ya da JPG ver.");
    reader.readAsDataURL(file);
  }

  function go() {
    if (!format) return;
    saveBrief({ title, format, palette, customColors, description, items: doc.items, upload });
  }

  return (
    <div className={s.app}>
      <div className={s.gridpaper} aria-hidden="true" />
      <TopBar wide />

      <div className={`${s.wrap} container`}>
        <div className={s.subbar}>
          <label className="sr-only" htmlFor="s2d-title">
            Kroki adı
          </label>
          <input
            id="s2d-title"
            className={s.titleIn}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={40}
          />
          <span className={s.saved}>{saved ? "taslak kaydedildi" : "henüz kaydedilmedi"}</span>
          <span className={s.fmtNow}>{fmt ? `${fmt.name} · ${fmt.ratioLabel}` : "format seçilmedi"}</span>
        </div>

        <div className={s.studio}>
          <Toolbar
            tool={tool}
            onTool={setTool}
            canUndo={doc.hist.length > 0}
            canRedo={doc.fut.length > 0}
            canClear={hasContent}
            onUndo={undo}
            onRedo={redo}
            onClear={clear}
            onFile={onFile}
          />
          <Canvas
            tool={tool}
            items={doc.items}
            format={format}
            upload={upload}
            uploadError={uploadError}
            noteWord={noteWord}
            onNoteWord={(w) => {
              setNoteWord(w);
              setTool("note");
            }}
            onCommit={commit}
            onSample={() => commit(sampleItems())}
            onFile={onFile}
            onRemoveUpload={() => setUpload(null)}
          />
          <SettingsPanel
            format={format}
            onFormat={setFormat}
            palette={palette}
            onPalette={setPalette}
            customColors={customColors}
            onCustomColors={setCustomColors}
            description={description}
            onDescription={setDescription}
            hasContent={hasContent}
            onGo={go}
          />
        </div>
      </div>
    </div>
  );
}
