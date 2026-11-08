'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { rotaEtiketi, rotaHazirMi } from '@/components/panel/panel-rotalar';

/**
 * Kırıntı yolu (breadcrumb) — §4.2 panel gezinmesi.
 *
 * Yol PATHNAME'DEN türetiliyor, sayfa elle vermiyor: elle verilseydi her yeni
 * sayfa kendi kırıntısını yazmak zorunda kalır ve biri mutlaka unuturdu.
 * Etiketler `panel-rotalar.ts`'ten geliyor; menüyle ayrışması imkânsız.
 *
 * SON PARÇA BAĞLANTI DEĞİL: bulunduğun sayfaya bağlantı vermek, tıklayınca
 * hiçbir şey olmayan bir hedef üretir. `aria-current="page"` ile işaretli.
 *
 * ARADA KALAN HAZIR OLMAYAN PARÇA da bağlantı değil (ör. `/panel/icerik`
 * yazılmadan `/panel/icerik/projeler`e girildiğinde): olmayan sayfaya
 * bağlantı vermek T-018'in yasakladığı ölü bağlantıdır.
 */
export function KirintiYolu() {
  const pathname = usePathname();

  const parcalar = pathname
    .split('/')
    .filter(Boolean)
    .map((_, sira, dizi) => `/${dizi.slice(0, sira + 1).join('/')}`);

  /* Tek parça (yalnızca /panel) varsa kırıntı bilgi taşımaz — çizilmez. */
  if (parcalar.length < 2) return null;

  return (
    <nav aria-label="Neredeyim" className="min-w-0">
      <ol className="text-muted flex min-w-0 items-center gap-1 text-xs">
        {parcalar.map((yol, sira) => {
          const sonuncu = sira === parcalar.length - 1;
          const etiket = rotaEtiketi(yol);

          return (
            <li key={yol} className="flex min-w-0 items-center gap-1">
              {sira > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}

              {sonuncu || !rotaHazirMi(yol) ? (
                <span
                  aria-current={sonuncu ? 'page' : undefined}
                  className={sonuncu ? 'text-body truncate' : 'truncate'}
                >
                  {etiket}
                </span>
              ) : (
                <Link
                  href={yol}
                  className="focus-ring rounded-btn hover:text-primary ease-brand duration-micro truncate transition-colors"
                >
                  {etiket}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
