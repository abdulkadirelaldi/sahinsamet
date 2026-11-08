'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { ALT_SEKMELER } from '@/components/panel/panel-rotalar';
import { cn } from '@/lib/utils/cn';

/**
 * TELEFON ALT SEKME ÇUBUĞU — 2026-10-29.
 *
 * Panel çoğunlukla iPhone'dan, "Ana Ekrana Ekle" ile tam ekran kullanılıyor.
 * iOS uygulamalarındaki sekme çubuğu: başparmağın eriştiği yerde beş kişisel
 * bölüm. Geri kalan her şey üst çubuktaki "Daha" düğmesinde (`daha-dugmesi.tsx`).
 * Masaüstünde (`lg`) yok — orada yan menü var.
 *
 * GÜVENLİ ALAN: çubuk YÜZER — kenarlardan 12 px içeride, ana ekran
 * çubuğunun (home indicator) 8 px üstünde. Sayfa içeriği aynı payı panel
 * düzeninde bırakıyor (layout.tsx).
 *
 * DOKUNMA HEDEFİ: her sekme 64 px yüksek, ekran genişliğinin beşte biri.
 *
 * KAYAN GÖSTERGE (2026-11-01): tek bir hap sekmeler arasında yaylanarak kayar.
 * Dokunuşta hemen yola çıkar, yeni sayfayı beklemez.
 */
export function AltSekmeler() {
  const pathname = usePathname();
  const [dokunulan, setDokunulan] = useState<string | null>(null);
  const aktifMi = (href: string) =>
    href === '/panel' ? pathname === '/panel' : pathname.startsWith(href);

  useEffect(() => {
    setDokunulan(null);
  }, [pathname]);

  const hapSirasi = ALT_SEKMELER.findIndex((s) =>
    dokunulan ? s.href === dokunulan : aktifMi(s.href),
  );

  // Ders odak ekranı: geri bildirim paneli alt kenarı kullanıyor.
  if (pathname.startsWith('/panel/ingilizce/ders/')) return null;

  return (
    <nav
      aria-label="Ana sekmeler"
      data-yazdirmada-gizle
      className="border-line/70 bg-surface/78 fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-40 rounded-[1.75rem] border shadow-[0_18px_44px_-14px_rgb(0_0_0/0.38)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="relative grid grid-cols-5 px-1">
        {hapSirasi >= 0 && (
          <li
            aria-hidden="true"
            className="dock-hap"
            style={{ transform: `translateX(${hapSirasi * 100}%)` }}
          />
        )}
        {ALT_SEKMELER.map((sekme) => {
          const Icon = sekme.icon;
          const aktif = aktifMi(sekme.href);
          const vurgulu = dokunulan ? dokunulan === sekme.href : aktif;
          return (
            <li key={sekme.href} className="relative">
              <Link
                href={sekme.href}
                aria-current={aktif ? 'page' : undefined}
                onClick={() => setDokunulan(aktif ? null : sekme.href)}
                className={cn(
                  'focus-ring flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-[1.5rem] text-[0.6875rem] font-medium transition-colors duration-200 active:opacity-70',
                  vurgulu ? 'text-accent' : 'text-muted',
                )}
              >
                <SekmeSimgesi vurgulu={vurgulu}>
                  <Icon className="size-[1.375rem]" />
                </SekmeSimgesi>
                {sekme.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * ANINDA TEPKİ (2026-10-30). Panel sayfaları sunucuda üretiliyor; dokunuş ile
 * yeni sayfa arasında geçen sürede ekran hiç değişmezse telefonda "dondu" gibi
 * görünüyordu. `useLinkStatus` dokunulan bağlantının beklemede olduğunu söyler:
 * simge nabız atar. Üstteki ilerleme çizgisi `gezinme-gostergesi.tsx`te.
 *
 * `loading.tsx` DENENDİ ve geri alındı: sayfayı Suspense'e sarıp akışla
 * gönderiyordu; `router.push` + `router.refresh` yapan kaydet/sil akışları
 * üretim derlemesinde takılıyordu (CI e2e).
 */
function SekmeSimgesi({ vurgulu, children }: { vurgulu: boolean; children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        'ease-brand flex h-8 w-14 items-center justify-center transition-transform duration-300',
        vurgulu && 'scale-105',
        pending && 'text-accent animate-pulse',
      )}
    >
      {children}
    </span>
  );
}
