'use client';

import { useEffect, useState } from 'react';

/** §5.2.4 sorgusu — tek yerde, elle yazılmasın. */
const SORGU = '(prefers-reduced-motion: reduce)';

/**
 * Kullanıcı hareketi azaltmayı seçti mi.
 *
 * NEDEN framer-motion'ın `useReducedMotion`'ı DEĞİL (T-023 ölçümü):
 * o kanca `framer-motion` modülünü İÇE AKTARIR ve bunu yapan her dosya
 * kütüphaneyi BAŞLANGIÇ paketine çeker. Ana sayfada `bolum-giris.tsx` ile
 * `reactbits/lazy.tsx` tam olarak bunu yapıyordu: 43 kB (sıkıştırılmış) ve
 * 4× CPU kısıtında ~280 ms ana iş parçacığı, üstelik React Bits bileşenlerinin
 * hepsi `ssr:false` ile TEMBEL yüklendiği hâlde. Aynı işi 12 satır `matchMedia`
 * yapıyor. ADR-045 ile framer-motion bağımlılığı tümden kaldırıldı.
 *
 * İLK RENDER'DA HER ZAMAN `false`: `window` sunucuda yok. Bu yüzden çağıranlar
 * "hareket açık" varsayımıyla başlar ve bağlanmadan sonra düzeltir — statik
 * içerik gösteren dallar bundan zarar görmez, çünkü CSS'teki global
 * `prefers-reduced-motion` kuralı ilk boyamadan itibaren zaten yürürlüktedir.
 */
export function useAzHareket(): boolean {
  const [azHareket, setAzHareket] = useState(false);

  useEffect(() => {
    const sorgu = window.matchMedia(SORGU);
    const esitle = () => setAzHareket(sorgu.matches);
    esitle();
    sorgu.addEventListener('change', esitle);
    return () => sorgu.removeEventListener('change', esitle);
  }, []);

  return azHareket;
}
