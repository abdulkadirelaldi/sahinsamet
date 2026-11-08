import Link from 'next/link';
import type { ReactNode } from 'react';

import { DahaDugmesi } from '@/components/panel/daha-dugmesi';
import { KirintiYolu } from '@/components/panel/kirinti-yolu';
import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * Panel üst çubuğu — SUNUCU BİLEŞENİ, iki istemci yaprağıyla.
 *
 * `KirintiYolu` istemci; küçük ve uçta (telefonda çekmeceyi alt sekmelerdeki "Daha" açıyor). Topbar'ın
 * kendisini istemciye çevirmek, her panel sayfasının başlığını istemci
 * paketine taşımak olurdu — T-023'ün ölçtüğü şey tam olarak bunun bedeliydi.
 *
 * §5.2.1 gereği efekt yok: yalnızca renk geçişi ve arka plan bulanıklığı.
 *
 * BAŞLIK `<h1>`: her panel sayfasında tek başlık burasıdır, sayfa gövdesi
 * `<h2>` ile devam eder (T-024'ün başlık sırası dersi).
 */
export function Topbar({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    /*
      `data-yazdirmada-gizle` — panel kabuğu KÂĞITTA YOK. Üst çubuk gezinme,
      tema düğmesi ve kırıntı yolu taşıyor; hiçbiri basılı bir rapora ait
      değil. Dönem bilgisi kartların kendi başlıklarında yazılı, o yüzden
      çubuğu gizlemek kâğıttan bilgi EKSİLTMİYOR.
    */
    <header
      data-yazdirmada-gizle
      className="border-line/40 bg-canvas/72 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 flex-col">
          {/* Telefonda kırıntı yolu yok: yer dar ve kayıt kimliği (cuid) okunmuyor; başlık yeterli. */}
          <div className="hidden sm:block">
            <KirintiYolu />
          </div>
          <h1 className="truncate text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] lg:text-xl">
            {title}
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {actions && <div className="topbar-eylem flex items-center gap-2">{actions}</div>}

          <Link
            href="/"
            className="focus-ring ease-brand duration-micro rounded-btn border-line bg-surface text-body hover:border-line-hover hover:text-primary hidden border px-3 py-2 text-sm transition-colors sm:inline-flex"
          >
            Siteye dön
          </Link>

          <ThemeToggle className="rounded-full border-transparent shadow-[var(--golge-kart)]" />
          <DahaDugmesi />
        </div>
      </div>
    </header>
  );
}
