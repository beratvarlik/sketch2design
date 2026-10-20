"use client";

import { useState } from "react";
import Character from "@/components/character/Character";
import {
  CHARACTER_IDS,
  CHARACTER_NAMES,
  CHARACTER_STATES,
  STATE_NAMES,
  type CharacterId,
} from "@/components/character/faces";
import OutputPreview from "@/components/output/OutputPreview";
import Sketch from "@/components/sketch/Sketch";
import s from "./characters.module.css";

const OUTPUT_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7];

export default function CharactersDevPage() {
  const [selected, setSelected] = useState<CharacterId>("reader");

  return (
    <main className={s.page}>
      <h1 className={s.title}>Karakterler</h1>

      <section aria-label="Beş karakter">
        <div className={s.row} role="radiogroup" aria-label="Karakter seç">
          {CHARACTER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected === id}
              className={s.pick}
              onClick={() => setSelected(id)}
            >
              <Character id={id} state="portrait" size={168} />
              <span className={s.name}>{CHARACTER_NAMES[id]}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label={`${CHARACTER_NAMES[selected]} durumları`}>
        <h2 className={s.sub}>{CHARACTER_NAMES[selected]}, 6 durum</h2>
        <div className={s.row}>
          {CHARACTER_STATES.map((state) => (
            <figure key={state} className={s.cell}>
              <Character id={selected} state={state} size={168} />
              <figcaption className={s.cap}>{STATE_NAMES[state]}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-label="Kroki">
        <h2 className={s.sub}>Kroki</h2>
        <div className={s.row}>
          <figure className={s.cell}>
            <Sketch w={200} reveal={0} />
            <figcaption className={s.cap}>reveal 0</figcaption>
          </figure>
          <figure className={s.cell}>
            <Sketch w={200} reveal={5} ask="asking" />
            <figcaption className={s.cap}>reveal 5 · asking</figcaption>
          </figure>
          <figure className={s.cell}>
            <Sketch w={200} reveal={9} ask="pending" grid />
            <figcaption className={s.cap}>reveal 9 · pending · grid</figcaption>
          </figure>
          <figure className={s.cell}>
            <Sketch w={200} reveal={9} ask="answered" answer="Buton" />
            <figcaption className={s.cap}>answered · Buton</figcaption>
          </figure>
          <figure className={s.cell}>
            <Sketch w={200} reveal={9} ask="answered" answer="Görsel" />
            <figcaption className={s.cap}>answered · Görsel</figcaption>
          </figure>
        </div>
      </section>

      <section aria-label="Çıktı tasarımı">
        <h2 className={s.sub}>Çıktı, seviye 0–7</h2>
        <div className={s.row}>
          {OUTPUT_LEVELS.map((level) => (
            <figure key={level} className={s.cell}>
              <OutputPreview level={level} />
              <figcaption className={s.cap}>level {level}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
