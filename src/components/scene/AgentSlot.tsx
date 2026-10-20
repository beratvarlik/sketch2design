import Character from "@/components/character/Character";
import type { SlotView } from "@/lib/scenario";
import s from "./slot.module.css";

interface AgentSlotProps {
  slot: SlotView;
  onOpen: (id: SlotView["id"]) => void;
}

export default function AgentSlot({ slot, onOpen }: AgentSlotProps) {
  const { bubble } = slot;
  return (
    <button
      type="button"
      className={`${s.slot} ag-${slot.id} ${slot.working ? s.working : ""}`}
      onClick={() => onOpen(slot.id)}
      aria-label={`${slot.name}: ayrıntıları aç`}
    >
      <span className={s.spot} aria-hidden="true" />
      <div className={`${s.bz} ${s[`al_${slot.align}`]}`}>
        {bubble.show && (
          <div className={`${s.bubble} ${s[`b_${bubble.kind}`]}`} role={bubble.kind === "ask" ? "status" : undefined}>
            {bubble.text}
            {bubble.steps && (
              <span className={s.steps} aria-hidden="true">
                {bubble.steps.map((d, i) => (
                  <i key={i} className={d === "idle" ? undefined : s[d]} />
                ))}
              </span>
            )}
          </div>
        )}
      </div>
      <Character id={slot.id} state={slot.state} size={168} />
      <span className={s.name}>{slot.name}</span>
      <span className={`${s.chip} ${slot.tone ? s[slot.tone] : ""}`}>{slot.chip}</span>
    </button>
  );
}
