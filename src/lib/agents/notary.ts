// Noter: şimdilik senaryolu (demo) — gerçek mühürleme sonraki fazda gelecek. Karşılığında yer tutucu hash'ler akar.

import "server-only";
import { SKETCH_HASH, SPEC_HASH, TX_HASH } from "../placeholders";
import type { RunSession } from "../runs";
import { sleep } from "./util";

export async function runNotary(run: RunSession): Promise<void> {
  await sleep(run, 700);
  run.emit({ type: "agent_started", agent: "notary" });
  await sleep(run, 800);
  run.emit({ type: "agent_step", agent: "notary", index: 0, total: 3, label: "Krokinin parmak izini alıyorum" });
  await sleep(run, 200);
  run.emit({ type: "spec_patch", path: "provenance", value: {} });
  await sleep(run, 1100);
  run.emit({ type: "agent_step", agent: "notary", index: 1, total: 3, label: "Spec’i de mühürlüyorum" });
  run.emit({ type: "spec_patch", path: "provenance.sketchHash", value: SKETCH_HASH });
  await sleep(run, 1300);
  run.emit({ type: "agent_step", agent: "notary", index: 2, total: 3, label: "Monad’a yazıyorum, imza bende" });
  run.emit({ type: "spec_patch", path: "provenance.specHash", value: SPEC_HASH });
  await sleep(run, 1400);
  run.emit({ type: "spec_patch", path: "provenance.tx", value: TX_HASH });
  run.emit({ type: "seal_done", sketchHash: SKETCH_HASH, specHash: SPEC_HASH, tx: TX_HASH, log: { agent: "notary", text: `zincire yazdı · tx ${TX_HASH}` } });
  run.emit({ type: "agent_done", agent: "notary", final: true, message: "Mühürlendi. Artık kayıtlı." });
  run.emit({ type: "output_update", level: 7 });
  await sleep(run, 400);
}
