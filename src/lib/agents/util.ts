import "server-only";
import type { RunSession } from "../runs";

/** İptal edilebilir bekleme: çalışma kapanırsa hemen döner. */
export function sleep(run: RunSession, ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (run.closed) return resolve();
    const t = setTimeout(resolve, ms);
    run.abort.signal.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });
}

/** `ms` sonra çalıştırır; çalışma kapanmışsa hiçbir şey yapmaz. */
export function later(run: RunSession, ms: number, fn: () => void) {
  const t = setTimeout(() => {
    if (!run.closed) fn();
  }, ms);
  run.abort.signal.addEventListener("abort", () => clearTimeout(t), { once: true });
}
