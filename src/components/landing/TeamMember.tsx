"use client";

import { useState } from "react";
import Character from "@/components/character/Character";
import type { CharacterId } from "@/components/character/faces";
import s from "./team.module.css";

interface TeamMemberProps {
  id: CharacterId;
  name: string;
  role: string;
  quote: string;
}

// Üstüne gelince (ya da odaklanınca) karakter "çalışıyor" durumuna geçer.
export default function TeamMember({ id, name, role, quote }: TeamMemberProps) {
  const [active, setActive] = useState(false);
  return (
    <article
      className={`${s.member} ag-${id}`}
      tabIndex={0}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <div className={s.quote}>
        <span className={s.bubble}>{quote}</span>
      </div>
      <span className={s.spot} aria-hidden="true" data-on={active} />
      <Character id={id} state={active ? "working" : "portrait"} size={168} />
      <h3 className={s.name}>{name}</h3>
      <span className={s.role}>{role}</span>
    </article>
  );
}
