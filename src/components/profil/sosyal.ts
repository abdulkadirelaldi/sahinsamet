import { SOSYAL_AGLAR, type SosyalAg, type Socials } from '@/lib/schemas/profile';

/**
 * Profilin sosyal bağlantılarını SAYFADA GÖSTERİLECEK sırayla ve biçimde verir.
 *
 * SAF — hem public ana sayfa hem testler kullanıyor. Yalnızca DOLU anahtarlar
 * döner; boş profil boş liste demek (sayfa o bölümü hiç çizmez).
 * E-posta en sonda ve `mailto:` bağlantısı olarak.
 */
export type SosyalAnahtar = SosyalAg | 'email';

export interface SosyalBaglanti {
  anahtar: SosyalAnahtar;
  /** Platform adı — "Instagram", "E-posta". */
  etiket: string;
  /** Bağlantı hedefi — `https://…` ya da `mailto:…`. */
  href: string;
  /** Etiketin altındaki kısa ayrıntı — "@kullanici", "ornek.com", adres. */
  ayrinti: string;
  /** Yeni sekmede açılsın mı (dış site). E-posta için hayır. */
  dis: boolean;
}

/** URL'den okunabilir kısa ayrıntı: platformlarda `@kullanıcı`, web sitesinde alan adı. */
export function adrestenAyrinti(anahtar: SosyalAg, adres: string): string {
  let url: URL;
  try {
    url = new URL(adres);
  } catch {
    return adres;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (anahtar === 'website') return host + (url.pathname === '/' ? '' : url.pathname);

  const parcalar = url.pathname.split('/').filter(Boolean);
  // LinkedIn `/in/<ad>` ve `/company/<ad>`, YouTube `/@kanal` ve `/c/<kanal>` — anlamlı parça.
  const ilk = ['in', 'company', 'c', 'channel', 'user'].includes(parcalar[0] ?? '')
    ? parcalar[1]
    : parcalar[0];
  if (!ilk) return host;
  const ad = decodeURIComponent(ilk).replace(/^@/, '');
  return `@${ad}`;
}

export function sosyalBaglantilar(socials: Socials | null | undefined): SosyalBaglanti[] {
  if (!socials) return [];
  const liste: SosyalBaglanti[] = [];

  for (const { anahtar, etiket } of SOSYAL_AGLAR) {
    const adres = socials[anahtar];
    if (!adres) continue;
    liste.push({
      anahtar,
      etiket,
      href: adres,
      ayrinti: adrestenAyrinti(anahtar, adres),
      dis: true,
    });
  }

  if (socials.email) {
    liste.push({
      anahtar: 'email',
      etiket: 'E-posta',
      href: `mailto:${socials.email}`,
      ayrinti: socials.email,
      dis: false,
    });
  }

  return liste;
}
