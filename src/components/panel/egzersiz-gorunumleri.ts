import type { ExerciseFilterInput } from '@/lib/schemas/exercise';

/**
 * EGZERSİZ KÜTÜPHANESİ GÖRÜNÜMLERİ — §4.2 `/panel/spor/egzersizler`, T-114.
 *
 * `musteri-gorunumleri.ts`in kalıbı. ⚠️ "HEPSİ" ARŞİVİ GİZLEMİYOR ve gerekçe
 * aynı: `buildExerciseWhere`in `isArchived` varsayılanı YOK (bilinçli, servis
 * dosyasında yazılı) ve liste yüzeyi bunu korumalı — varsayılanın gizlemesi
 * "hareketim ve rekorlarım kayboldu" sorusunu üretirdi. Arşivlenen hareketin
 * rekorları YERİNDE duruyor; kütüphanede de görünür kalmalı.
 *
 * Bu, set seçicisinin ihtiyacının TERSİ — orası `isArchived: false` gönderiyor
 * (`spor/[id]/page.tsx`). Zıt ihtiyacı çözen yer varsayılan değil ÇAĞIRAN.
 */

export type EgzersizGorunumu = {
  /** `?gorunum=…`; "hepsi" için boş. */
  anahtar: string;
  etiket: string;
  /** Sayfalama ve arama ayrıca eklenir. */
  filtre: Pick<ExerciseFilterInput, 'isArchived'>;
  bosBaslik: string;
  bosAciklama: string;
};

export const VARSAYILAN_EGZERSIZ_GORUNUMU: EgzersizGorunumu = {
  anahtar: 'hepsi',
  etiket: 'Hepsi',
  /* `isArchived` VERİLMİYOR — yukarıdaki nota bakınız. */
  filtre: {},
  bosBaslik: 'Kütüphane boş',
  bosAciklama: 'Set girebilmek için önce hareketleri ekle: ad, kas grubu ve ekipman yeterli.',
};

export const EGZERSIZ_GORUNUMLERI: readonly EgzersizGorunumu[] = [
  VARSAYILAN_EGZERSIZ_GORUNUMU,
  {
    anahtar: 'aktif',
    etiket: 'Aktif',
    filtre: { isArchived: false },
    bosBaslik: 'Aktif egzersiz yok',
    bosAciklama:
      'Tüm hareketler arşivlenmiş. Arşiv sekmesinden geri alabilir ya da yeni ekleyebilirsin.',
  },
  {
    anahtar: 'arsiv',
    etiket: 'Arşiv',
    filtre: { isArchived: true },
    bosBaslik: 'Arşiv boş',
    bosAciklama: 'Henüz hiçbir hareketi arşivlemedin.',
  },
];

export function egzersizGorunumuBul(anahtar: string | undefined): EgzersizGorunumu {
  return EGZERSIZ_GORUNUMLERI.find((g) => g.anahtar === anahtar) ?? VARSAYILAN_EGZERSIZ_GORUNUMU;
}

/** Liste adresi — bağlantılar tek yerden kuruluyor. */
export function egzersizlerYolu({
  gorunum,
  q,
  sayfa,
}: {
  gorunum: string;
  q?: string;
  sayfa?: number;
}): string {
  const p = new URLSearchParams();
  if (gorunum && gorunum !== 'hepsi') p.set('gorunum', gorunum);
  if (q) p.set('q', q);
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  const sorgu = p.toString();
  return sorgu ? `/panel/spor/egzersizler?${sorgu}` : '/panel/spor/egzersizler';
}
