import Link from 'next/link';

/**
 * SPOR ALT GEZİNMESİ — §4.2 `/panel/spor`, T-114.
 *
 * Kenar menüsünde TEK satır var (`Spor`), ama modülün üç ayrı listesi var:
 * antrenmanlar, egzersiz kütüphanesi, rekorlar. Üçünü menüye koymak "Kişisel"
 * grubunu şişirirdi; hiç koymamak ise kütüphaneye ve rekorlara yalnızca adres
 * çubuğundan ulaşılabilmesi demekti — yani ölü bir yüzey.
 *
 * Sekme görünümü görünüm sekmeleriyle (müşteriler, sağlık aralığı) aynı dil,
 * ama bunlar AYRI SAYFALAR: `aria-current="page"` tam olarak bunu söylüyor.
 *
 * SUNUCU BİLEŞENİ — yalnızca bağlantı üretiyor.
 */

const SEKMELER = [
  { anahtar: 'program', etiket: 'Program', href: '/panel/spor' },
  { anahtar: 'antrenmanlar', etiket: 'Geçmiş', href: '/panel/spor/gecmis' },
  { anahtar: 'egzersizler', etiket: 'Egzersizler', href: '/panel/spor/egzersizler' },
  { anahtar: 'rekorlar', etiket: 'Rekorlar', href: '/panel/spor/rekorlar' },
  { anahtar: 'gelisim', etiket: 'Gelişim', href: '/panel/spor/gelisim' },
] as const;

export type SporSekmesi = (typeof SEKMELER)[number]['anahtar'];

export function SporSekmeleri({ secili }: { secili: SporSekmesi }) {
  return (
    <nav aria-label="Spor bölümleri" className="sekme-seridi">
      <ul className="flex min-w-max gap-1.5">
        {SEKMELER.map((s) => {
          const aktif = s.anahtar === secili;
          return (
            <li key={s.anahtar}>
              <Link
                href={s.href}
                aria-current={aktif ? 'page' : undefined}
                className="focus-ring sekme"
              >
                {s.etiket}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
