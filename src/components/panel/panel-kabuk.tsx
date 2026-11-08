'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Panel kabuğu — mobil çekmecenin durumu (T-002/K7'de ertelenmişti).
 *
 * NEDEN BAĞLAM (context): çekmeceyi AÇAN düğme Topbar'da, ÇEKMECENİN KENDİSİ
 * Sidebar'da. İkisi kardeş bileşen; durumu yukarı taşımadan konuşamazlar.
 * Alternatif, ikisini tek bir dev bileşende birleştirmekti — o zaman Topbar
 * sayfa başlığını da bilmek zorunda kalır ve her sayfa kabuğu yeniden kurardı.
 *
 * BAĞLAM YALNIZCA MOBİLDE ANLAMLI: masaüstünde kenar çubuğu her zaman açık ve
 * bu durumu hiç okumaz. Yani sağlayıcı, `lg` üstünde ölü bir maliyet değil —
 * tek bir boolean tutuyor.
 *
 * §5.2.1: burada efekt yok. Çekmece 150 ms'lik bir kaydırma ile açılıyor
 * (`duration-micro`), `prefers-reduced-motion` globalde zaten kapatıyor.
 */

type MenuDurumu = {
  acik: boolean;
  ac: () => void;
  kapat: () => void;
};

const MenuBaglami = createContext<MenuDurumu | null>(null);

export function PanelKabuk({ children }: { children: ReactNode }) {
  const [acik, setAcik] = useState(false);
  const pathname = usePathname();

  const ac = useCallback(() => setAcik(true), []);
  const kapat = useCallback(() => setAcik(false), []);

  /* Rota değişince çekmece kapanır — yoksa gezindikten sonra üstte asılı kalır. */
  useEffect(() => {
    setAcik(false);
  }, [pathname]);

  /*
   * ESC ile kapanma: çekmece bir kalıcı katman (overlay) ve klavye kullanıcısı
   * onu kapatmak için Tab'la "Kapat" düğmesine ulaşmak zorunda kalmamalı.
   */
  useEffect(() => {
    if (!acik) return;
    const tusla = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') setAcik(false);
    };
    document.addEventListener('keydown', tusla);
    return () => document.removeEventListener('keydown', tusla);
  }, [acik]);

  /* Çekmece açıkken arkadaki içerik kaymasın. */
  useEffect(() => {
    if (!acik) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = onceki;
    };
  }, [acik]);

  return <MenuBaglami.Provider value={{ acik, ac, kapat }}>{children}</MenuBaglami.Provider>;
}

/**
 * Menü durumunu okur.
 *
 * Sağlayıcı YOKSA FIRLATMAZ, kapalı bir durum döner: panel dışında (ör. bir
 * testte ya da Storybook benzeri bir bağlamda) Topbar'ı tek başına render
 * etmek mümkün olsun. Fırlatmak, bileşeni yalnızca tam kabukla kullanılabilir
 * kılardı.
 */
export function useMenuDurumu(): MenuDurumu {
  return useContext(MenuBaglami) ?? { acik: false, ac: () => {}, kapat: () => {} };
}
