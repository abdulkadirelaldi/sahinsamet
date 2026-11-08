'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

import { useOdakTuzagi } from '@/components/panel/odak-tuzagi';
import { useMenuDurumu } from '@/components/panel/panel-kabuk';
import { PANEL_GRUPLARI } from '@/components/panel/panel-rotalar';
import { cn } from '@/lib/utils/cn';

/*
 * ROTA LİSTESİ VE "YENİ ROTA EKLEME" KURALI `panel-rotalar.ts`'te —
 * kırıntı yolu da aynı listeden okuduğu için etiketler ayrışamıyor.
 */

function MenuIcerigi({ pathname, secildi }: { pathname: string; secildi?: () => void }) {
  const aktifMi = (href: string) =>
    href === '/panel' ? pathname === '/panel' : pathname.startsWith(href);

  return (
    <nav aria-label="Panel menüsü" className="flex flex-col gap-6">
      {PANEL_GRUPLARI.map((grup) => (
        <div key={grup.title} className="flex flex-col gap-1">
          <p className="ust-etiket px-3 pb-1">{grup.title}</p>

          <ul className="flex flex-col gap-0.5">
            {grup.items.map((item) => {
              const Icon = item.icon;
              const aktif = aktifMi(item.href);

              /* HAZIR DEĞİL: bağlantı değil, durum bildirimi (yukarıdaki kural 3). */
              if (!item.hazir) {
                return (
                  <li key={item.href}>
                    <span className="text-muted flex items-center gap-2.5 px-2 py-2 text-sm">
                      <Icon className="text-muted size-4 shrink-0" />
                      {item.label}
                      <span className="border-line text-muted rounded-pill ml-auto border px-1.5 py-0.5 text-[0.625rem]">
                        Yakında
                      </span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={aktif ? 'page' : undefined}
                    // Bulunulan sayfaya dokununca adres değişmez, çekmece yine kapansın.
                    onClick={secildi}
                    className={cn(
                      'menu-oge focus-ring ease-brand duration-micro rounded-btn flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                      aktif
                        ? 'text-primary font-medium'
                        : 'text-body hover:bg-elevated hover:text-primary',
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0', aktif ? 'text-accent' : 'text-muted')} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Panel kenar çubuğu — masaüstünde sabit, mobilde ÇEKMECE (T-032).
 *
 * §5.2.1: panelde WebGL/shader/ağır efekt YOK. Buradaki hareket renk geçişi ve
 * çekmecenin kayarak girişi. Panel bir çalışma aracı; her etkileşim anlık hissetmeli.
 *
 * ÇEKMECE ERİŞİLEBİLİRLİĞİ: `role="dialog"` + `aria-modal`, ESC ile kapanır
 * (kabuk hallediyor), perde tıklaması kapatır ve perde `aria-hidden` — ekran
 * okuyucu için yalnızca menünün kendisi var.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { acik, kapat } = useMenuDurumu();
  const cekmece = useRef<HTMLDivElement>(null);
  useOdakTuzagi(acik, cekmece, kapat);

  return (
    <>
      {/* MASAÜSTÜ — her zaman açık, çekmece durumunu hiç okumaz.
          `data-yazdirmada-gizle`: menü kâğıtta hem anlamsız hem de 240 px'i
          içerikten çalıyor (A4'te içerik alanı ~688 px). */}
      <aside
        data-yazdirmada-gizle
        className="border-line/70 bg-surface/70 hidden w-60 shrink-0 border-r backdrop-blur-xl lg:block"
      >
        <div className="sticky top-0 flex h-dvh flex-col gap-6 overflow-y-auto p-4">
          <Link
            href="/panel"
            className="focus-ring rounded-btn font-display text-primary flex items-center gap-2.5 px-1 text-base font-bold tracking-tight"
          >
            <span aria-hidden="true" className="marka-isaret">
              SŞ
            </span>
            Panel
          </Link>

          <MenuIcerigi pathname={pathname} />
        </div>
      </aside>

      {/* MOBİL ÇEKMECE — kapalıyken DOM'da yok; açık değilken odak tuzağı da yok. */}
      {acik && (
        <div data-yazdirmada-gizle className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={kapat}
            className="hizli-ortu bg-canvas/70 absolute inset-0 backdrop-blur-sm"
          />

          {/*
            `id="panel-menu"` — BULGU-021. Alt sekmelerdeki "Daha" düğmesi (eskiden `MenuDugmesi`)
            `aria-controls="panel-menu"` ilan ediyordu ama o kimlik HİÇBİR
            YERDE yoktu: ekran okuyucu çözülmeyen bir ilişki duyuruyordu.
            Kimlik ÇEKMECENİN KENDİSİNDE, çünkü düğmenin açtığı şey bu.

            KALAN İNCELİK (raporda yazılı): çekmece kapalıyken DOM'da hiç yok
            (üstteki nota bakınız — odak tuzağı olmasın diye bilinçli), yani
            `aria-controls` yalnızca AÇIKKEN çözülüyor. Hiç sarkmayan bir
            kimlik için çekmecenin monte kalıp `hidden` ile gizlenmesi
            gerekirdi; o da "kapalıyken odak tuzağı yok" özelliğini takas etmek
            demek — tek satırlık bir düzeltmenin kararı değil.
          */}
          <div
            ref={cekmece}
            tabIndex={-1}
            id="panel-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Panel menüsü"
            className="cekmece-gir border-line bg-surface absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-r p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between">
              <Link
                href="/panel"
                className="focus-ring rounded-btn font-display text-primary flex items-center gap-2.5 px-1 text-base font-bold tracking-tight"
              >
                <span aria-hidden="true" className="marka-isaret">
                  SŞ
                </span>
                Panel
              </Link>

              <button
                type="button"
                onClick={kapat}
                className="focus-ring rounded-btn text-muted hover:text-primary ease-brand duration-micro p-2 transition-colors"
              >
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Menüyü kapat</span>
              </button>
            </div>

            <MenuIcerigi pathname={pathname} secildi={kapat} />

            {/* Telefonda üst çubukta "Siteye dön" yok (yer darlığı) — burada. */}
            <Link
              href="/"
              className="focus-ring rounded-btn border-line text-body hover:text-primary mt-auto border px-3 py-2.5 text-center text-sm"
            >
              Siteye dön
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
