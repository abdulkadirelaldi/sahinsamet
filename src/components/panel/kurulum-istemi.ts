'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * UYGULAMA YÜKLEME İSTEMİ (2026-11-11, Android Chrome). Chrome yüklenebilir sayfada
 * `beforeinstallprompt` olayını BİR KEZ, sayfa açılırken atar; olay saklanmazsa sonradan "Yükle"
 * düğmesi gösterilemez. Bu yüzden dinleyici panel kabuğunda (`CevrimdisiSeridi`) kurulur, olay
 * modül düzeyinde saklanır; düğme onu istediği an okur. iOS'ta bu olay hiç yok — düğme çıkmaz.
 */
interface KurulumOlayi extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let olay: KurulumOlayi | null = null;
let dinleniyor = false;
const aboneler = new Set<() => void>();
const duyur = () => aboneler.forEach((f) => f());

/** Tekrar çağrılabilir: dinleyici bir kez kurulur. */
export function kurulumIstemiDinle(): void {
  if (dinleniyor || typeof window === 'undefined') return;
  dinleniyor = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Chrome'un kendi mini çubuğu yerine panelin düğmesi.
    e.preventDefault();
    olay = e as KurulumOlayi;
    duyur();
  });
  window.addEventListener('appinstalled', () => {
    olay = null;
    duyur();
  });
}

function abone(f: () => void) {
  aboneler.add(f);
  return () => aboneler.delete(f);
}

/** Yüklü uygulama penceresinde mi açık (ana ekrandan)? */
export function uygulamadaMi(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** `yukle` yalnızca Chrome olayı attıysa ve uygulama içinde değilsek dolu. */
export function useKurulumIstemi(): { yukle: (() => Promise<boolean>) | null } {
  useEffect(kurulumIstemiDinle, []);
  const mevcut = useSyncExternalStore(
    abone,
    () => (olay && !uygulamadaMi() ? olay : null),
    () => null,
  );
  if (!mevcut) return { yukle: null };
  return {
    yukle: async () => {
      await mevcut.prompt();
      const { outcome } = await mevcut.userChoice;
      // Olay tek kullanımlık: kabul de ret de olsa yeniden `prompt()` çağrılamaz.
      olay = null;
      duyur();
      return outcome === 'accepted';
    },
  };
}
