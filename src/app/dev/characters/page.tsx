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
import s from "./characters.module.css";

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
    </main>
  );
}
