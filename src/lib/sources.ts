import type { AgentEventSource } from "./events";
import { createDemoSource } from "./scenario";

/**
 * /run'ın olay kaynağını seçer. `?demo=1` her zaman demo senaryosunu kullanır.
 * Gerçek agent hattı sonraki fazda gelecek; o zamana kadar demo olmayan modda da demo çalışır.
 */
export function createEventSource({ demo }: { demo: boolean }): AgentEventSource {
  void demo;
  return createDemoSource();
}
