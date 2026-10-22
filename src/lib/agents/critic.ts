// Eleştirmen: şimdilik senaryolu (demo) — gerçek değerlendirme sonraki fazda gelecek.
// Üretici'nin gerçek taslaklarını sırayla 0.61 → 0.78 → 0.87 ile puanlar; ilk iki turda geri yollar.

import "server-only";
import type { RunSession } from "../runs";
import { DEMO_CRIT, DEMO_DRAFTS } from "../scenario";
import { sleep } from "./util";

/** Geri yollarken Üretici'ye iletilen not (turn 1 ve 2 için). */
export const CRITIC_FEEDBACK = [
  "Başlık krokidekinden küçük kalmış, bir tur daha. Başlığı belirgin biçimde büyüt ve krokideki konumunda tut.",
  "Buton hâlâ soluk (0.78, olmadı). Butonun rengini ve kontrastını artır, metni okunaklı yap.",
];

const ERROR_MESSAGE = ["Başlık krokidekinden küçük kalmış, bir tur daha.", "Buton hâlâ soluk. 0.78, olmadı."];

/** Taslak `n` (1–3) geldi: Eleştirmen göreve başlar, puanını verir. */
export async function runCritic(run: RunSession, n: number): Promise<void> {
  const i = n - 1;
  const last = n === 3;
  const draft = DEMO_DRAFTS[i];

  run.emit({ type: "agent_done", agent: "generator", final: last });
  run.emit({ type: "agent_started", agent: "critic", attempt: n });
  run.emit({ type: "agent_step", agent: "critic", index: 0, total: 1, label: n === 1 ? "Krokiyle yan yana koyuyorum…" : "Bakalım bu sefer ne yapmış…" });
  if (n === 1) run.emit({ type: "spec_patch", path: "review", value: {} });
  await sleep(run, 2300);

  run.emit({
    type: "critic_score",
    attempt: n,
    score: draft.score,
    passed: draft.score >= 0.85,
    criteria: DEMO_CRIT[i],
    log: { agent: "critic", text: last ? "0.87 verdi, onayladı" : `${draft.score.toFixed(2)} verdi, geri yolladı` },
  });
  run.emit({ type: "spec_patch", path: "review.score", value: draft.score });
  if (n === 1 || last) run.emit({ type: "spec_patch", path: "review.passed", value: last });

  if (last) {
    run.emit({ type: "agent_done", agent: "critic", final: true, message: "0.87. Peki, ikna oldum." });
    run.emit({ type: "output_update", level: 6, label: "taslak 3 · onaylı", busy: false });
  } else {
    run.emit({ type: "agent_error", agent: "critic", message: ERROR_MESSAGE[i] });
  }
}

/** Geri yollama: iş Üretici'ye döner (Eleştirmen'in "tekrar" yüzü kısa süre kalır). */
export async function handBackToGenerator(run: RunSession, nextAttempt: number): Promise<void> {
  await sleep(run, 700);
  run.emit({ type: "agent_started", agent: "generator", attempt: nextAttempt });
  run.emit({ type: "agent_error", agent: "generator" });
  await sleep(run, 600);
  run.emit({ type: "agent_done", agent: "critic", final: false });
}
