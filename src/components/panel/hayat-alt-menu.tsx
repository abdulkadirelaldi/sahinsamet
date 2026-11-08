import Link from 'next/link';

/**
 * HAYAT ALT MENÜSÜ — §4.2 `/panel/hayat`'ın dört yüzeyi arasında gezinme.
 *
 * Kenar menüsünde `/panel/hayat` TEK satır (`panel-rotalar.ts`); alışkanlık,
 * hedef ve günlük ekranlarına oradan ulaşılamıyor. Bu menü olmadan alt
 * sayfalara yalnızca genel bakıştaki "tümü" bağlantılarından girilebilirdi.
 *
 * `durum-sekmeleri.tsx` ile AYNI karar: her öğe bir ADRES → `Link` + `nav`,
 * `tablist` değil. Dar ekranda menü kendi kabında kayıyor, sayfa değil.
 *
 * SERVER COMPONENT — `aktif` çağırandan geliyor, `usePathname` gerekmiyor.
 */

const OGELER = [
  { anahtar: 'genel', etiket: 'Bugün', href: '/panel/hayat' },
  { anahtar: 'hedefler', etiket: 'Hedefler', href: '/panel/hayat/hedefler' },
  { anahtar: 'rapor', etiket: 'Rapor', href: '/panel/hayat/rapor' },
  { anahtar: 'gunluk', etiket: 'Günlük', href: '/panel/hayat/gunluk' },
  { anahtar: 'aliskanliklar', etiket: 'Alışkanlıklar', href: '/panel/hayat/aliskanliklar' },
] as const;

export type HayatBolumu = (typeof OGELER)[number]['anahtar'];

export function HayatAltMenu({ aktif }: { aktif: HayatBolumu }) {
  return (
    <nav aria-label="Hayat bölümleri" className="sekme-seridi">
      <ul className="flex min-w-max gap-1.5">
        {OGELER.map((oge) => {
          const secili = oge.anahtar === aktif;
          return (
            <li key={oge.anahtar}>
              <Link
                href={oge.href}
                aria-current={secili ? 'page' : undefined}
                className="focus-ring sekme"
              >
                {oge.etiket}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Görünüm sekmeleri — alışkanlık ve hedef listelerinin ortak çizimi.
 * Görünüm tablosu ve adres üretici çağırandan geliyor.
 */
export function HayatGorunumSekmeleri({
  etiket,
  gorunumler,
  aktif,
  yol,
}: {
  etiket: string;
  gorunumler: ReadonlyArray<{ anahtar: string; etiket: string }>;
  aktif: string;
  yol: (anahtar: string) => string;
}) {
  return (
    <nav aria-label={etiket} className="sekme-seridi">
      <ul className="flex min-w-max gap-1.5">
        {gorunumler.map((g) => {
          const secili = g.anahtar === aktif;
          return (
            <li key={g.anahtar}>
              <Link
                href={yol(g.anahtar)}
                aria-current={secili ? 'page' : undefined}
                className="focus-ring sekme"
              >
                {g.etiket}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
