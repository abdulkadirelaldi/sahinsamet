import Link from 'next/link';

import { buttonClasses } from '@/components/ui/button';

/**
 * 404 — hem `(public)/not-found.tsx` hem kök `not-found.tsx` bunu çiziyor;
 * iki ayrı metin bakımı olmasın. Sitenin tek sayfası ana sayfa, tek çıkış ona.
 */
export function Bulunamadi() {
  return (
    <main
      id="icerik"
      className="profil-zemin flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <p aria-hidden="true" className="font-display text-accent text-7xl font-bold tracking-tight">
        404
      </p>
      <h1 className="font-display text-primary text-2xl font-bold sm:text-3xl">
        Aradığın sayfa burada değil
      </h1>
      <p className="text-body max-w-md">Adres yanlış yazılmış ya da sayfa kaldırılmış olabilir.</p>
      <Link href="/" className={buttonClasses({ variant: 'primary', size: 'md' })}>
        Ana sayfaya dön
      </Link>
    </main>
  );
}
