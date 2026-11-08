import { headers } from 'next/headers';
import Script from 'next/script';
import type { ReactNode } from 'react';

import { analitikAyari } from '@/lib/analitik';

/**
 * Public layout — tek sayfa (`/`) ve 404.
 *
 * Gezinme çubuğu ve alt bilgi YOK: site tek sayfa, sayfa kendi başlığını ve
 * alt satırını çiziyor. Tema kök token'lardan (koyu/açık, tema çerezi).
 *
 * "İçeriğe geç" bağlantısı klavye kullanıcısı için (WCAG 2.4.1); odaklanana
 * kadar görünmez.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  // Analitik YALNIZCA public sitede (panel ölçülmez) ve yalnızca yapılandırıldıysa.
  const analitik = analitikAyari();
  const nonce = analitik ? ((await headers()).get('x-nonce') ?? undefined) : undefined;

  return (
    <div className="bg-canvas text-body flex min-h-dvh flex-col">
      <a
        href="#icerik"
        className="focus-ring rounded-btn bg-elevated text-primary sr-only px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100"
      >
        İçeriğe geç
      </a>

      {children}

      {analitik && (
        // `afterInteractive`: ölçüm betiği ilk boyamayı ve LCP'yi beklemez.
        // Nonce middleware'den — CSP `'strict-dynamic'` nonce'suz betiği reddeder.
        <Script
          src={analitik.betik}
          data-website-id={analitik.siteId}
          strategy="afterInteractive"
          nonce={nonce}
        />
      )}
    </div>
  );
}
