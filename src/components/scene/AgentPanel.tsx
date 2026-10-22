"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Character from "@/components/character/Character";
import ScaledOutput from "@/components/output/ScaledOutput";
import Sketch from "@/components/sketch/Sketch";
import { EXPLORER_TX_URL } from "@/lib/placeholders";
import type { AgentDetail, Answer, SceneView, Tone } from "@/lib/sceneView";
import { PALETTES } from "@/lib/studio";
import s from "./panel.module.css";

interface AgentPanelProps {
  detail: AgentDetail;
  open: boolean;
  onClose: () => void;
  askMode: SceneView["askMode"];
  answer: Answer;
  scoreChips: SceneView["scoreChips"];
}

type DesignerTab = "layout" | "style" | "content";

const TABS: { id: DesignerTab; label: string }[] = [
  { id: "layout", label: "Yerleşim" },
  { id: "style", label: "Stil" },
  { id: "content", label: "İçerik" },
];

const SWATCH_LABELS = ["Birincil", "Vurgu", "Metin", "Zemin"];

const toneClass: Record<Tone, string> = { pass: s.pass, fail: s.fail, warn: s.warn, none: "" };

export default function AgentPanel({ detail, open, onClose, askMode, answer, scoreChips }: AgentPanelProps) {
  const [tab, setTab] = useState<DesignerTab>("layout");
  const { info } = detail;
  const id = info.id;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside className={`${s.panel} ${open ? s.open : ""}`} aria-label="Agent detayı" inert={!open}>
      <div className={`${s.head} ag-${id}`}>
        <Character id={id} state={detail.state} size={96} />
        <div className={s.headText}>
          <h2 className={s.name}>{info.name}</h2>
          <span className={s.quote}>{info.quote}</span>
        </div>
        <button type="button" className={s.x} onClick={onClose} aria-label="Paneli kapat">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M6.2 6.6 Q12 12.3 17.8 17.6 M17.5 6.3 Q12.2 11.8 6.4 17.9" />
          </svg>
        </button>
      </div>

      <div className={s.body}>
        <dl className={s.facts}>
          <div className={s.kv}><dt>Rol</dt><dd>{info.role}</dd></div>
          <div className={s.kv}><dt>Durum · süre</dt><dd>{detail.stateLabel} · {detail.dur}</dd></div>
          <div className={s.kv}><dt>Girdi</dt><dd className={s.mono}>{info.inp}</dd></div>
          <div className={s.kv}><dt>Çıktı</dt><dd className={s.mono}>{info.out}</dd></div>
          <div className={`${s.kv} ${s.full}`}><dt>Neden böyle karar verdi</dt><dd className={s.why}>{info.why}</dd></div>
        </dl>

        {id === "reader" && detail.els && (
          <>
            <div className={s.readerRow}>
              <div className={s.tilt}>
                <Sketch w={250} reveal={9} ask={askMode} answer={answer} />
              </div>
              <ul className={s.els}>
                {detail.els.map((el, i) => (
                  <li key={i}>
                    <div className={s.elTop}>
                      <span>{el.n}</span>
                      <span className={`${s.mono} ${toneClass[el.tone]}`}>{el.c}</span>
                    </div>
                    <div className={s.bar}><i style={{ width: `${el.w}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
            <p className={s.qa}>
              <span className={s.faint}>Sorduğu:</span> <span className={s.hand}>Bu kutu bir buton mu, görsel mi?</span>
              <br />
              <span className={s.faint}>Cevap:</span> <b>{detail.answerText}</b>
            </p>
          </>
        )}

        {id === "designer" && (
          <div className={s.col18}>
            <div role="tablist" aria-label="Tasarımcı çıktıları" className={s.tabs}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`s2d-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="s2d-tabpanel"
                  className={`${s.tab} ${tab === t.id ? s.tabOn : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id="s2d-tabpanel" aria-labelledby={`s2d-tab-${tab}`}>
              {tab === "layout" && (
                <div className={s.readerRow}>
                  <Sketch w={250} reveal={0} ask="answered" answer={answer} grid />
                  <ul className={s.rules}>
                    <li>12 sütun, 16px kenar, 6px oluk</li>
                    <li>4 dikey bölge: menü, hero, buton, kartlar</li>
                    <li>Kartlar 4&apos;er sütun, eşit</li>
                    <li>Buton başlıkla aynı sol çizgide</li>
                  </ul>
                </div>
              )}
              {tab === "style" && (
                <div className={s.col16}>
                  <div className={s.swatches}>
                    {PALETTES[0].c.map((hex, i) => (
                      <div key={hex} className={s.swatch}>
                        <span className={s.swatchColor} style={{ background: hex }} />
                        <span className={s.swLabel}>{SWATCH_LABELS[i]}</span>
                        <span className={`${s.mono} ${s.swHex}`}>{hex}</span>
                      </div>
                    ))}
                  </div>
                  <div className={s.font}>
                    <span className={s.fontMain}>Bricolage Grotesque</span>
                    <span className={s.fontSub}>Geist, gövde ve arayüz için</span>
                  </div>
                  <p className={s.designerNote}>&quot;Krokide başlık el yazısıyla kocaman. Karakterli bir font seçtim, metni de koyu tuttum ki okunsun.&quot;</p>
                </div>
              )}
              {tab === "content" && (
                <dl className={s.contentList}>
                  <div className={s.kv}><dt>Başlık</dt><dd className={s.contentTitle}>Fikrini çiz, tasarımı al.</dd></div>
                  <div className={s.kv}><dt>Alt metin</dt><dd>Krokiden canlı tasarıma, saniyeler içinde.</dd></div>
                  <div className={s.kv}><dt>Buton</dt><dd>Hemen dene →</dd></div>
                  <div className={s.kv}><dt>Kartlar</dt><dd>Çiz · Üret · Mühürle</dd></div>
                </dl>
              )}
            </div>
          </div>
        )}

        {id === "generator" && detail.attempts && (
          <div className={s.col18}>
            <span className={s.faintLg}>Denemeler · {detail.attemptCount}</span>
            {detail.attempts.length === 0 && <p className={s.emptyNote}>&quot;Henüz bir şey üretmedim, sıra bende değil.&quot;</p>}
            {detail.attempts.map((at) => (
              <div key={at.n} className={s.attempt}>
                <ScaledOutput level={at.lvl} width={120} />
                <div className={s.attemptText}>
                  <span className={s.attemptTitle}>Taslak {at.n}</span>
                  <span className={s.attemptNote}>{at.note}</span>
                  <span className={s.faintLg}>
                    {at.dur} · skor <span className={`${s.mono} ${toneClass[at.tone]}`}>{at.score}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {id === "critic" && detail.crit && (
          <div className={s.col20}>
            <div className={s.cmp}>
              <div className={s.cmpCol}>
                <div className={s.tilt}>
                  <Sketch w={230} reveal={0} ask="answered" answer={answer} />
                </div>
                <span className={s.hand24}>kroki</span>
              </div>
              <div className={s.cmpCol}>
                <ScaledOutput level={detail.cmpLevel ?? 3} width={230} />
                <span className={s.faintLg}>{detail.cmpLabel}</span>
              </div>
            </div>
            <div className={s.crit}>
              {detail.crit.map((cr) => (
                <div key={cr.n} className={s.critRow}>
                  <div className={s.critTop}>
                    <span>{cr.n}</span>
                    <span className={s.mono}>{cr.v}</span>
                  </div>
                  <div className={s.bar}><i style={{ width: `${cr.w}%` }} /></div>
                </div>
              ))}
            </div>
            <div className={s.history}>
              <span className={s.faintLg}>Skor geçmişi</span>
              {scoreChips.map((c, i) => (
                <span key={i} className={s.chipWrap}>
                  <span className={`${s.sc} ${toneClass[c.tone]} ${c.tone === "fail" ? s.strike : ""} ${c.cur ? s.cur : ""}`}>{c.v}</span>
                  <span className={s.faint}>{c.arrow}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {id === "notary" && (
          <div className={s.col18}>
            {detail.sealed && (
              <span className={s.sealed}>
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.8 Q7.6 15.2 9.9 17.6 Q14 11 19.4 6.2" />
                </svg>
                Zincire mühürlendi
              </span>
            )}
            <dl className={s.hashes}>
              <div className={s.kv}><dt>sketchHash</dt><dd className={s.mono}>{detail.h1}</dd></div>
              <div className={s.kv}><dt>specHash</dt><dd className={s.mono}>{detail.h2}</dd></div>
              <div className={s.kv}><dt>İşlem · Monad testnet</dt><dd className={s.mono}>{detail.h3}</dd></div>
            </dl>
            <Link href={EXPLORER_TX_URL} className={s.explorer}>
              Monad explorer&apos;da aç
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M7 17 Q12 12 16.6 7.4 M10 6.8 Q13.6 6.6 17.1 7 Q17.4 10.6 17.2 14" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
