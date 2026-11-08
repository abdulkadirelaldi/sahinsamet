import type { Equipment, GoalCategory, GoalStatus, MuscleGroup, WorkoutType } from '@/types';

/**
 * KİŞİSEL MODÜL ETİKETLERİ — §4.2 sağlık, spor, hayat (F5).
 *
 * Enum → ekran metni TEK YERDE. `Record<Enum, string>` tipi bir değer
 * eklendiğinde `tsc`yi kırar; yani şemaya yeni bir kas grubu girerse etiketi
 * eksik bir seçim listesi sessizce çizilmez.
 */

export const RUH_HALI: Record<number, string> = {
  1: 'Çok kötü',
  2: 'Kötü',
  3: 'Orta',
  4: 'İyi',
  5: 'Çok iyi',
};

export const ANTRENMAN_TURU: Record<WorkoutType, string> = {
  GYM: 'Salon',
  CARDIO: 'Kardiyo',
  KAYAK: 'Kayak',
  OTHER: 'Diğer',
};

export const KAS_GRUBU: Record<MuscleGroup, string> = {
  CHEST: 'Göğüs',
  BACK: 'Sırt',
  SHOULDERS: 'Omuz',
  ARMS: 'Kol',
  LEGS: 'Bacak',
  CORE: 'Karın',
  FULL_BODY: 'Tüm vücut',
  CARDIO: 'Kardiyo',
  OTHER: 'Diğer',
};

export const EKIPMAN: Record<Equipment, string> = {
  BARBELL: 'Halter',
  DUMBBELL: 'Dambıl',
  MACHINE: 'Makine',
  CABLE: 'Kablo',
  BODYWEIGHT: 'Vücut ağırlığı',
  KETTLEBELL: 'Kettlebell',
  BAND: 'Bant',
  OTHER: 'Diğer',
};

export const HEDEF_KATEGORISI: Record<GoalCategory, string> = {
  CAREER: 'Kariyer',
  FINANCE: 'Finans',
  HEALTH: 'Sağlık',
  FITNESS: 'Spor',
  LEARNING: 'Öğrenme',
  PERSONAL: 'Kişisel',
  OTHER: 'Diğer',
};

export const HEDEF_DURUMU: Record<GoalStatus, string> = {
  ACTIVE: 'Aktif',
  PAUSED: 'Duraklatıldı',
  ACHIEVED: 'Ulaşıldı',
  ABANDONED: 'Vazgeçildi',
};

/** Ondalık dizenin ekran yazımı — `82.50` → `82,50`. Sayıya ÇEVİRMEZ (ADR-014/D). */
export function olcuBicim(deger: string | null, birim?: string): string {
  if (deger === null) return '—';
  const metin = deger.replace('.', ',');
  return birim ? `${metin} ${birim}` : metin;
}

/** Tam sayının binlik gruplu yazımı — `12500` → `12.500`. */
export function tamSayiBicim(deger: number | null, birim?: string): string {
  if (deger === null) return '—';
  const metin = String(deger).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return birim ? `${metin} ${birim}` : metin;
}

/** Seçim listeleri için `[değer, etiket]` çiftleri — tanım sırasıyla. */
export function secenekler<K extends string>(etiketler: Record<K, string>): Array<[K, string]> {
  return Object.entries(etiketler) as Array<[K, string]>;
}
