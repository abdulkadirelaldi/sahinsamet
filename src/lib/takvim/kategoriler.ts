import type { TakvimKategori } from '@/types';

/**
 * TAKVİM KATEGORİLERİ (2026-11-10) — ad, simge ve renk tek yerde.
 *
 * Renkler iki temada da okunur: dolu zemin her zaman beyaz yazıyla (600 tonu), açık zemin yarı
 * saydam (`/15`) ve yazı temanın kendi `text-primary`'si. `dark:` varyantı kullanılmıyor: panel
 * teması `html.dark`/`html.light` sınıfıyla seçiliyor, Tailwind'in `dark:`'ı ise sistem tercihine
 * bakıyor — ikisi ayrışınca renk yanlış temaya göre seçilirdi.
 *
 * Sınıflar TAM METİN olarak yazılı: Tailwind derlemede kaynağı tarıyor, birleştirilen sınıf adı
 * (`bg-${renk}-500`) CSS'e girmezdi.
 */
export interface KategoriBilgisi {
  ad: string;
  emoji: string;
  /** Nokta ve sol şerit. */
  nokta: string;
  /** Saydam zemin + kenar: saatli etkinlik kutusu. */
  acik: string;
  /** Dolu zemin: tüm gün şeridi. */
  dolu: string;
}

export const TAKVIM_KATEGORILERI: Readonly<Record<TakvimKategori, KategoriBilgisi>> = {
  SPOR: {
    ad: 'Spor',
    emoji: '🏋️',
    nokta: 'bg-orange-500',
    acik: 'bg-orange-500/15 border-orange-500',
    dolu: 'bg-orange-600 text-white',
  },
  TOPLANTI: {
    ad: 'Toplantı',
    emoji: '👥',
    nokta: 'bg-sky-500',
    acik: 'bg-sky-500/15 border-sky-500',
    dolu: 'bg-sky-600 text-white',
  },
  SAGLIK: {
    ad: 'Sağlık / Doktor',
    emoji: '🩺',
    nokta: 'bg-rose-500',
    acik: 'bg-rose-500/15 border-rose-500',
    dolu: 'bg-rose-600 text-white',
  },
  HATIRLATICI: {
    ad: 'Hatırlatıcı',
    emoji: '🔔',
    nokta: 'bg-amber-500',
    acik: 'bg-amber-500/15 border-amber-500',
    dolu: 'bg-amber-600 text-white',
  },
  KISISEL: {
    ad: 'Kişisel',
    emoji: '✨',
    nokta: 'bg-violet-500',
    acik: 'bg-violet-500/15 border-violet-500',
    dolu: 'bg-violet-600 text-white',
  },
  IS: {
    ad: 'İş',
    emoji: '💼',
    nokta: 'bg-emerald-500',
    acik: 'bg-emerald-500/15 border-emerald-500',
    dolu: 'bg-emerald-600 text-white',
  },
  DIGER: {
    ad: 'Diğer',
    emoji: '📌',
    nokta: 'bg-slate-500',
    acik: 'bg-slate-500/15 border-slate-500',
    dolu: 'bg-slate-600 text-white',
  },
};

/** Formdaki sıra. */
export const KATEGORI_SIRASI: readonly TakvimKategori[] = [
  'KISISEL',
  'SPOR',
  'TOPLANTI',
  'SAGLIK',
  'HATIRLATICI',
  'IS',
  'DIGER',
];
