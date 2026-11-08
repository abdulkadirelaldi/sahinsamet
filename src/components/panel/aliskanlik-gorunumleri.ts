import type { HabitFilterInput } from '@/lib/schemas/habit';

/**
 * ALIŞKANLIK GÖRÜNÜMLERİ — §4.2 `/panel/hayat/aliskanliklar`, T-115.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İKİ BAYRAK, DÖRT GÖRÜNÜM — "AKTİF" TEK BAŞINA BELİRSİZDİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `isActive=false` "ara verdim", `isArchived=true` "bıraktım" (`services/habit.ts`).
 * Tek bir "Aktif" sekmesi hangisini süzdüğünü söyleyemezdi; ara verilen
 * alışkanlık arşivde değil ama panoda da değil. Sekmeler bu yüzden panonun
 * diliyle adlandırıldı: "Panoda" = haftalık panoda görünenler.
 *
 * ⚠️ "HEPSİ" ARŞİVİ GİZLEMİYOR — `musteri-gorunumleri.ts`teki gerekçe:
 * varsayılanın gizlemesi "alışkanlığım kayboldu" sorusunu üretirdi. Servis de
 * bayraklara VARSAYILAN vermiyor (`buildHabitWhere`, ADR-033).
 */

export type AliskanlikGorunumu = {
  /** `?gorunum=…`; "hepsi" için boş. */
  anahtar: string;
  etiket: string;
  filtre: Omit<HabitFilterInput, 'page' | 'perPage'>;
  bosBaslik: string;
  bosAciklama: string;
};

export const VARSAYILAN_ALISKANLIK_GORUNUMU: AliskanlikGorunumu = {
  anahtar: 'hepsi',
  etiket: 'Hepsi',
  filtre: {},
  bosBaslik: 'Henüz alışkanlık yok',
  bosAciklama:
    'Haftada kaç gün yapmak istediğini söyle; haftalık panoda işaretledikçe seri kendiliğinden hesaplanır.',
};

export const ALISKANLIK_GORUNUMLERI: readonly AliskanlikGorunumu[] = [
  VARSAYILAN_ALISKANLIK_GORUNUMU,
  {
    anahtar: 'panoda',
    etiket: 'Panoda',
    filtre: { isActive: true, isArchived: false },
    bosBaslik: 'Panoda alışkanlık yok',
    bosAciklama: 'Ara verilen ve arşivlenen alışkanlıklar haftalık panoda görünmez.',
  },
  {
    anahtar: 'ara',
    etiket: 'Ara verildi',
    filtre: { isActive: false, isArchived: false },
    bosBaslik: 'Ara verilen alışkanlık yok',
    bosAciklama: 'Bir alışkanlığa ara vermek için formundaki "Panoda göster" kutusunu kaldır.',
  },
  {
    anahtar: 'arsiv',
    etiket: 'Arşiv',
    filtre: { isArchived: true },
    bosBaslik: 'Arşiv boş',
    bosAciklama: 'Henüz hiçbir alışkanlığı arşivlemedin.',
  },
];

export function aliskanlikGorunumuBul(anahtar: string | undefined): AliskanlikGorunumu {
  return (
    ALISKANLIK_GORUNUMLERI.find((g) => g.anahtar === anahtar) ?? VARSAYILAN_ALISKANLIK_GORUNUMU
  );
}
