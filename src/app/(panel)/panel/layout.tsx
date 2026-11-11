import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AltSekmeler } from '@/components/panel/alt-sekmeler';
import { CevrimdisiSeridi } from '@/components/panel/cevrimdisi-seridi';
import { GezinmeGostergesi } from '@/components/panel/gezinme-gostergesi';
import { GunTazeleyici } from '@/components/panel/gun-tazeleyici';
import { HizliEkle } from '@/components/panel/hizli-ekle';
import { PanelKabuk } from '@/components/panel/panel-kabuk';
import { Sidebar } from '@/components/panel/sidebar';

// Panelin tasarım katmanı: halka açık sitenin CSS'ine yük olmasın.
import './aura.css';

/**
 * Panel route group layout — §4.3.
 *
 * §8.7 — panel arama motorlarına kapalı. `robots` metadata'sı `X-Robots-Tag`
 * başlığının yerine geçmez; başlık ve `middleware.ts` koruması Güvenlik
 * ajanının işidir (T-004). Bu, ucuz ikinci bir katman.
 *
 * §5.2.1 — panelde WebGL/shader/ağır efekt YOK.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  /*
   * 2026-10-29 — panel iPhone'dan "Ana Ekrana Ekle" ile TAM EKRAN kullanılıyor.
   * Bildirim dosyasının adı `/panel` ile BAŞLAMIYOR: middleware `/panel/*`ı
   * oturuma bağlıyor, oturumsuz istek bildirimi alamazdı.
   */
  manifest: '/panel.webmanifest',
  appleWebApp: { capable: true, title: 'SŞ Panel', statusBarStyle: 'black-translucent' },
};

/**
 * `viewportFit: 'cover'` — içerik çentiğin ve ana ekran çubuğunun (Android'de jest çubuğunun) altına
 * uzanır, `env(safe-area-inset-*)` değerleri dolu gelir. Üst çubuk ve alt
 * sekmeler bu payı kendileri bırakıyor.
 */
export const viewport: Viewport = {
  viewportFit: 'cover',
  /*
   * Android Chrome (2026-11-11): klavye açılınca görünüm KÜÇÜLÜR (`resizes-content`) — alttan
   * açılan sayfadaki alanlar (`max-h-[90dvh]`) klavyenin altında kalmaz, sayfa yukarı kayar.
   * iOS Safari bu anahtarı yok sayar; davranışı değişmez.
   */
  interactiveWidget: 'resizes-content',
  // Panel koyu başlar: tarayıcı ve durum çubuğu da aynı zeminde (`--bg-base`, koyu).
  themeColor: '#08080d',
};

/**
 * `PanelKabuk` yalnızca MOBİL ÇEKMECENİN durumunu tutar (tek boolean). Kenar
 * çubuğu ile üst çubuktaki menü düğmesi kardeş bileşenler; durumu paylaşacak
 * ortak bir ata gerekiyordu ve o ata burası.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <PanelKabuk>
      <div className="panel-modern flex min-h-dvh">
        <div aria-hidden="true" className="acilis">
          <span className="acilis-marka">SŞ</span>
        </div>
        <a
          href="#panel-icerik"
          data-yazdirmada-gizle
          className="focus-ring rounded-btn bg-elevated text-primary sr-only px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
        >
          İçeriğe geç
        </a>

        <Sidebar />

        {/* Telefonda yüzen alt sekme çubuğu kadar pay (64 px + 8 px boşluk + nefes + ana ekran çubuğu) + son satır "+" düğmesinin altında kalmasın diye 4rem. */}
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:pb-24">
          {children}
        </div>

        <GezinmeGostergesi />
        <GunTazeleyici />
        <AltSekmeler />
        <HizliEkle />
        <CevrimdisiSeridi />
      </div>
    </PanelKabuk>
  );
}
