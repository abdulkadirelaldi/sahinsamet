import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SITE_NAME } from '@/lib/constants';

/**
 * Kimlik doğrulama route group'u — §4.3, §10.1.
 *
 * Neden ayrı bir group: giriş sayfası ne public layout'a (Navbar/Footer bir
 * giriş ekranında gürültü) ne panel layout'una (Sidebar oturum varsayar,
 * oturumu olmayan kullanıcıya panel menüsü göstermek yanlış) aittir.
 *
 * §8.7 — kimlik doğrulama ekranları dizine eklenmez.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 p-4">
        <Link
          href="/"
          className="focus-ring rounded-btn font-display text-primary text-lg font-bold tracking-tight"
        >
          Samet<span className="text-accent-soft">.</span>
        </Link>

        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="p-4 text-center">
        <p className="text-muted text-xs">{SITE_NAME}</p>
      </footer>
    </div>
  );
}
