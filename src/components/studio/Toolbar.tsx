import type { ChangeEvent, ReactNode } from "react";
import type { Tool } from "@/lib/studio";
import s from "./toolbar.module.css";

interface ToolbarProps {
  tool: Tool;
  onTool: (t: Tool) => void;
  canUndo: boolean;
  canRedo: boolean;
  canClear: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const TOOLS: { id: Tool; label: string; tip: string; icon: ReactNode }[] = [
  {
    id: "pen", label: "Kalem", tip: "kalem",
    icon: (<><path d="M4.5 19.6 L5.6 15.2 L16.2 4.6 Q17.6 3.4 19 4.8 Q20.4 6.2 19.2 7.6 L8.6 18.3 Z" /><path d="M14.2 6.6 L17.3 9.7" /></>),
  },
  {
    id: "rect", label: "Dikdörtgen", tip: "kutu",
    icon: <path d="M4.6 5.6 Q12 5 19.4 5.8 Q19.9 12 19.2 18.4 Q12 19 4.8 18.2 Q4.2 12 4.6 5.6 Z" />,
  },
  {
    id: "ell", label: "Daire", tip: "daire",
    icon: <path d="M12.4 4.2 C17.6 4.2 20.2 8 19.9 12.4 C19.6 17 16.4 20 11.8 19.8 C7 19.6 4 16.4 4.2 11.6 C4.4 7.4 7.4 4.4 13 4.6" />,
  },
  { id: "line", label: "Çizgi", tip: "çizgi", icon: <path d="M5 19 Q11.5 12.8 19.2 4.8" /> },
  {
    id: "note", label: "Metin notu", tip: "not",
    icon: <path d="M5.2 6.2 Q12 5.6 18.8 6.1 M12.1 6 Q11.8 12.5 12.2 19.2 M9 19.2 Q12 18.9 15.2 19.3" />,
  },
  {
    id: "eraser", label: "Silgi", tip: "silgi",
    icon: (<><path d="M4.6 15.4 Q9 10.8 13.6 6.2 Q16.6 9 19.6 12.2 Q16 15.8 12.4 19.4 L8.4 19.4 Z" /><path d="M9.6 10.6 Q12.4 13.4 15.4 16.4 M13.4 19.6 H20" /></>),
  },
];

export default function Toolbar({ tool, onTool, canUndo, canRedo, canClear, onUndo, onRedo, onClear, onFile }: ToolbarProps) {
  return (
    <div className={s.toolbar} role="toolbar" aria-label="Çizim araçları">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`${s.tool} ${tool === t.id ? s.on : ""}`}
          onClick={() => onTool(t.id)}
          aria-pressed={tool === t.id}
          aria-label={t.label}
          data-tip={t.tip}
        >
          <Icon>{t.icon}</Icon>
        </button>
      ))}
      <span className={s.sep} aria-hidden="true" />
      <button type="button" className={s.tool} onClick={onUndo} disabled={!canUndo} aria-label="Geri al" data-tip="geri al">
        <Icon>
          <path d="M9.2 14.2 Q6.6 11.6 4.2 9 Q6.8 6.6 9.4 4.2" />
          <path d="M4.6 9.1 Q11 8.6 14.6 9.2 Q20.2 10.6 19.8 15.2 Q19.2 20.4 12.8 20.2" />
        </Icon>
      </button>
      <button type="button" className={s.tool} onClick={onRedo} disabled={!canRedo} aria-label="İleri al" data-tip="ileri al">
        <Icon>
          <path d="M14.8 14.2 Q17.4 11.6 19.8 9 Q17.2 6.6 14.6 4.2" />
          <path d="M19.4 9.1 Q13 8.6 9.4 9.2 Q3.8 10.6 4.2 15.2 Q4.8 20.4 11.2 20.2" />
        </Icon>
      </button>
      <button type="button" className={s.tool} onClick={onClear} disabled={!canClear} aria-label="Temizle" data-tip="hepsini sil">
        <Icon>
          <path d="M4.4 7.2 Q12 6.6 19.6 7.3 M9.2 7 Q9 5 9.6 4.2 Q12 3.8 14.6 4.3 Q15 5.4 14.8 7 M6.4 7.6 Q7 13.6 7.6 19.6 Q12 20.2 16.6 19.6 Q17.2 13.6 17.6 7.6" />
        </Icon>
      </button>
      <span className={s.sep} aria-hidden="true" />
      <label className={`${s.tool} ${s.upl}`} data-tip="fotoğraf yükle">
        <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={onFile} />
        <Icon>
          <path d="M12.1 15.8 Q11.8 10 12 4.4 M7.6 8.6 Q9.8 6.4 12 4.2 Q14.2 6.4 16.4 8.8" />
          <path d="M4.4 15.6 Q4.2 18 4.6 19.8 Q12 20.3 19.4 19.7 Q19.8 17.6 19.6 15.4" />
        </Icon>
        <span className="sr-only">Dosya yükle (PNG ya da JPG, kağıt fotoğrafı)</span>
      </label>
    </div>
  );
}
