import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

/** Haftalık ve aylık özetin kartı ve dönem düğmesi (2026-11-05: haftalık sayfadan ayrıldı). */
export function OzetKarti({
  href,
  ikon,
  renk,
  baslik,
  deger,
  alt,
  children,
}: {
  href: string;
  ikon: ReactNode;
  renk: string;
  baslik: string;
  deger: string;
  alt: string | null;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="focus-ring rounded-card border-line bg-surface flex min-w-0 flex-col gap-1.5 border p-4"
    >
      <span className="text-muted flex items-center gap-2 text-sm">
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-lg bg-gradient-to-br text-white',
            renk,
          )}
        >
          {ikon}
        </span>
        {baslik}
      </span>
      <span className="tabular text-primary truncate text-2xl font-semibold tracking-tight">
        {deger}
      </span>
      {alt && <span className="text-muted text-xs">{alt}</span>}
      {children}
    </Link>
  );
}

export function GezinmeDugmesi({
  href,
  etiket,
  children,
}: {
  href: string;
  etiket: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={etiket}
      className="focus-ring bg-surface text-body flex size-10 items-center justify-center rounded-full shadow-[var(--golge-kart)]"
    >
      {children}
    </Link>
  );
}
