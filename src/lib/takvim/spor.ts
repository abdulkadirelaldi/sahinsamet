import { GUN_KISA } from './bicim';
import { sureMetni } from './hatirlatma';

/** Spor programı planının tek satırlık özeti — "Pzt, Per · 18:00 · 1 saat 15 dk" (2026-11-12). */
export function sporPlanOzeti(p: {
  gunler: readonly number[];
  saat: string;
  sureDk: number;
}): string {
  return `${p.gunler.map((g) => GUN_KISA[g - 1]).join(', ')} · ${p.saat} · ${sureMetni(p.sureDk)}`;
}
