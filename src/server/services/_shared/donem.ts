import { appDayToDate, appIsoWeek, appMonthRange, appYearRange, addAppDays } from './app-date';
import type { AppDay, AppDayRange } from './app-date';

/**
 * Dönemli hedeflerin dönem anahtarı — SAF (2026-10-29, Hayat).
 *
 * Hedefler haftalık, aylık ya da yıllık. Anahtar insan okunur ve sıralanabilir:
 *
 *   WEEKLY  → `2026-W44`  (ISO hafta; yıl sınırında ISO yılı — `appIsoWeek`)
 *   MONTHLY → `2026-10`
 *   YEARLY  → `2026`
 *
 * "Bugün" İstanbul gününe göre gelir (ADR-016); burada saat dilimi yok.
 */
export type Donem = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

const pad = (n: number): string => String(n).padStart(2, '0');

export function donemAnahtari(donem: Donem, gun: AppDay): string {
  if (donem === 'WEEKLY') {
    const { year, week } = appIsoWeek(gun);
    return `${year}-W${pad(week)}`;
  }
  const [yil = '', ay = ''] = gun.split('-');
  return donem === 'MONTHLY' ? `${yil}-${ay}` : yil;
}

/** Anahtarın biçimi dönemine uyuyor mu — dışarıdan gelen anahtar için. */
export function donemAnahtariGecerliMi(donem: Donem, anahtar: string): boolean {
  if (donem === 'WEEKLY') return /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(anahtar);
  if (donem === 'MONTHLY') return /^\d{4}-(0[1-9]|1[0-2])$/.test(anahtar);
  return /^\d{4}$/.test(anahtar);
}

/** Dönemin gün aralığı (iki uç dahil). */
export function donemAraligi(donem: Donem, anahtar: string): AppDayRange {
  if (donem === 'YEARLY') return appYearRange(Number(anahtar));
  if (donem === 'MONTHLY') {
    const [yil, ay] = anahtar.split('-').map(Number);
    return appMonthRange(yil ?? 0, ay ?? 0);
  }
  // ISO haftanın pazartesisi: o yılın 4 Ocak'ının haftasından (week-1) hafta sonra.
  const [yilMetni, haftaMetni] = anahtar.split('-W');
  const yil = Number(yilMetni);
  const hafta = Number(haftaMetni);
  const dortOcak = appDayToDate(`${yil}-01-04`);
  const gun = dortOcak.getUTCDay() || 7;
  const ilkPazartesi = addAppDays(`${yil}-01-04`, 1 - gun);
  const from = addAppDays(ilkPazartesi, (hafta - 1) * 7);
  return { from, to: addAppDays(from, 6) };
}

/** Bir önceki / sonraki dönemin anahtarı — ekrandaki ‹ › düğmeleri için. */
export function komsuDonem(donem: Donem, anahtar: string, yon: -1 | 1): string {
  const { from, to } = donemAraligi(donem, anahtar);
  return donemAnahtari(donem, yon === 1 ? addAppDays(to, 1) : addAppDays(from, -1));
}
