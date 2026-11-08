import type { WalletUnit } from '@/types';
import { guvenliUyari } from '@/lib/security/guvenli-log';
import { db } from '@/server/db';

import { computeBaseAmount, toMeasureString } from './_shared';

/**
 * CÜZDAN · CANLI KUR (2026-10-30).
 *
 * KAYNAK: Truncgil Finans (`finans.truncgil.com/v4/today.json`) — anahtarsız,
 * döviz VE altın (gram, has, çeyrek, yarım, tam, Cumhuriyet, Ata, 22 ayar
 * bilezik, gümüş) tek yanıtta. TCMB yalnızca döviz verdiği için seçilmedi.
 *
 * DEĞERLEME KURALI (ihtiyatlı):
 *   varlık → ALIŞ  (bozdurursan eline geçen)
 *   borç   → SATIŞ (kapatmak için ödeyeceğin)
 *
 * DAYANIKLILIK: yanıt 10 dk bellekte; her başarılı çekiş `PriceQuote`a yazılır.
 * Sayfa kaynağı beklemez (`fetchKurlar`). 1 saatten eski kur ekranda "bayat"
 * diye söylenir — uydurma ya da sıfır kur yok.
 */

export const KUR_KAYNAGI = 'Truncgil';
const ADRES = 'https://finans.truncgil.com/v4/today.json';
const ONBELLEK_MS = 10 * 60_000;
const ZAMAN_ASIMI_MS = 2_500;
/** Kaynak düşükken yeniden denemeden önce beklenen süre. */
const HATA_BEKLEME_MS = 60_000;
/** Bundan eski kur ekranda "bayat" diye söylenir. */
const BAYAT_MS = 60 * 60_000;

/** Birim → kaynaktaki anahtar. TRY kaynakta yok (her zaman 1). */
export const KAYNAK_ANAHTARI: Record<Exclude<WalletUnit, 'TRY'>, string> = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  GOLD_GRAM: 'GRA',
  GOLD_HAS: 'HAS',
  GOLD_QUARTER: 'CEYREKALTIN',
  GOLD_HALF: 'YARIMALTIN',
  GOLD_FULL: 'TAMALTIN',
  GOLD_REPUBLIC: 'CUMHURIYETALTINI',
  GOLD_ATA: 'ATAALTIN',
  GOLD_BANGLE_22: 'YIA',
  SILVER_GRAM: 'GUMUS',
};

export interface Kur {
  /** Alış — `"6452.3300"` (en fazla 4 ondalık, metin). */
  buying: string;
  selling: string;
}

export interface KurDurumu {
  kurlar: Partial<Record<WalletUnit, Kur>>;
  /** Kurların alındığı an (ISO). Hiç kur yoksa `null`. */
  guncellendi: string | null;
  /** Canlı kaynak bu istekte okunamadı; gösterilen son bilinen. */
  bayat: boolean;
}

/** Kaynaktaki sayıyı 4 ondalıklı metne çevirir; geçersizse `null`. SAF. */
function kurMetni(deger: unknown): string | null {
  const sayi = typeof deger === 'number' ? deger : Number(deger);
  if (!Number.isFinite(sayi) || sayi <= 0) return null;
  return sayi.toFixed(4);
}

/** Kaynak yanıtını birim → kur haritasına çevirir; eksik/bozuk birim atlanır. SAF. */
export function kaynagiCozumle(json: unknown): Partial<Record<WalletUnit, Kur>> {
  const sonuc: Partial<Record<WalletUnit, Kur>> = {};
  if (!json || typeof json !== 'object') return sonuc;
  const kayit = json as Record<string, { Buying?: unknown; Selling?: unknown } | undefined>;
  for (const [birim, anahtar] of Object.entries(KAYNAK_ANAHTARI) as [WalletUnit, string][]) {
    const satir = kayit[anahtar];
    const buying = kurMetni(satir?.Buying);
    const selling = kurMetni(satir?.Selling);
    if (buying && selling) sonuc[birim] = { buying, selling };
  }
  return sonuc;
}

let bellek: { durum: KurDurumu; zaman: number } | null = null;
/** Son başarısız deneme — kaynak düşükken her istek yeniden denemesin. */
let sonHata = 0;
let yenileniyor: Promise<void> | null = null;

type KurClient = Pick<typeof db, 'priceQuote' | '$transaction'>;

/** Canlı kaynaktan okur, `PriceQuote`a yazar, belleği günceller; başarısızsa fırlatır. */
async function kaynaktanYenile(
  client: KurClient,
  getir: typeof fetch,
  simdi: Date,
): Promise<KurDurumu> {
  const yanit = await getir(ADRES, {
    signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    cache: 'no-store',
  });
  if (!yanit.ok) throw new Error(`kur kaynağı ${yanit.status}`);
  const kurlar = kaynagiCozumle(await yanit.json());
  if (Object.keys(kurlar).length === 0) throw new Error('kur kaynağı boş');

  await client.$transaction(
    (Object.entries(kurlar) as [WalletUnit, Kur][]).map(([unit, k]) =>
      client.priceQuote.upsert({
        where: { unit },
        create: {
          unit,
          buying: k.buying,
          selling: k.selling,
          source: KUR_KAYNAGI,
          fetchedAt: simdi,
        },
        update: { buying: k.buying, selling: k.selling, source: KUR_KAYNAGI, fetchedAt: simdi },
      }),
    ),
  );
  // Kaynak bir birimi atladıysa son bilinen kuru korunur: kalem "kur yok"a düşüp toplamdan
  // çıkmasın; o birim eskidiyse `bayat` uyarısı ayrıca çalışır.
  const satirlar = await client.priceQuote.findMany();
  const atlanan = satirlar.filter((s) => !(s.unit in kurlar));
  const eski = atlanan.length > 0 ? satirlardanDurum(atlanan, simdi) : null;
  const durum: KurDurumu = {
    kurlar: { ...eski?.kurlar, ...kurlar },
    guncellendi: simdi.toISOString(),
    bayat: eski?.bayat ?? false,
  };
  bellek = { durum, zaman: simdi.getTime() };
  sonHata = 0;
  return durum;
}

/** Arka planda tek yenileme — sayfa BEKLEMEZ, eşzamanlı istekler çoğalmaz. */
function arkaPlandaYenile(client: KurClient, getir: typeof fetch, simdi: Date): void {
  if (yenileniyor || simdi.getTime() - sonHata < HATA_BEKLEME_MS) return;
  yenileniyor = kaynaktanYenile(client, getir, simdi)
    .then(() => undefined)
    .catch((error: unknown) => {
      sonHata = simdi.getTime();
      guvenliUyari('[kur] kaynak okunamadı:', error instanceof Error ? error.message : error);
    })
    .finally(() => {
      yenileniyor = null;
    });
}

/** `PriceQuote`taki son bilinen kurlar. Hiç yoksa `null`. */
async function sonBilinen(client: KurClient, simdi: Date): Promise<KurDurumu | null> {
  const satirlar = await client.priceQuote.findMany();
  return satirlar.length === 0 ? null : satirlardanDurum(satirlar, simdi);
}

/** Kur satırları → durum: `bayat`, EN ESKİ satıra göre (bir birim bile eskiyse uyarır). */
function satirlardanDurum(
  satirlar: Awaited<ReturnType<KurClient['priceQuote']['findMany']>>,
  simdi: Date,
): KurDurumu {
  const kurlar: Partial<Record<WalletUnit, Kur>> = {};
  let enYeni = new Date(0);
  let enEski = simdi;
  for (const s of satirlar) {
    kurlar[s.unit as WalletUnit] = {
      buying: toMeasureString(s.buying, 4) ?? '0',
      selling: toMeasureString(s.selling, 4) ?? '0',
    };
    if (s.fetchedAt > enYeni) enYeni = s.fetchedAt;
    if (s.fetchedAt < enEski) enEski = s.fetchedAt;
  }
  return {
    kurlar,
    guncellendi: enYeni.toISOString(),
    bayat: simdi.getTime() - enEski.getTime() > BAYAT_MS,
  };
}

/**
 * Güncel kurlar — SAYFAYI BEKLETMEZ (2026-10-30).
 *
 * Bugün ve Cüzdan her açılışta burayı çağırıyor. Eski hâl canlı kaynağı
 * bekliyordu: kaynak yavaşsa sayfa 5 sn duruyor, hata önbelleklenmediği için
 * her istekte yeniden duruyordu (telefonda "dondu", CI'da giriş sonrası
 * yönlendirme zaman aşımı). Şimdi: bellek taze → o; değilse veritabanındaki son
 * kur HEMEN döner, yenileme arka planda; kaynak düşükse 1 dk denenmez. Yalnızca
 * HİÇ kur yoksa (ilk çalıştırma) kaynak beklenir.
 *
 * `bayat`: gösterilen kur 1 saatten eski.
 */
export async function fetchKurlar(
  client: KurClient = db,
  getir: typeof fetch = fetch,
  simdi: Date = new Date(),
): Promise<KurDurumu> {
  const yas = bellek ? simdi.getTime() - bellek.zaman : Infinity;
  if (bellek && yas >= 0 && yas < ONBELLEK_MS) return bellek.durum;

  const eldeki = await sonBilinen(client, simdi);
  if (eldeki) {
    arkaPlandaYenile(client, getir, simdi);
    return eldeki;
  }

  try {
    return await kaynaktanYenile(client, getir, simdi);
  } catch (error) {
    sonHata = simdi.getTime();
    guvenliUyari('[kur] kaynak okunamadı:', error instanceof Error ? error.message : error);
    return { kurlar: {}, guncellendi: null, bayat: true };
  }
}

/**
 * Bir miktarın TL karşılığı — kayıpsız (`computeBaseAmount`, kuruşa yarım
 * yukarı). TRY ise miktarın kendisi. Kur yoksa `null` ("bilinmiyor", 0 DEĞİL).
 */
export function tlKarsiligi(
  miktar: string,
  birim: WalletUnit,
  kurlar: KurDurumu['kurlar'],
  yon: 'alis' | 'satis',
): string | null {
  if (birim === 'TRY') return miktar;
  const kur = kurlar[birim];
  if (!kur) return null;
  return computeBaseAmount(miktar, yon === 'alis' ? kur.buying : kur.selling);
}
