import { AuditAction } from '@/types';

/**
 * DENETİM KAYDI GÖRÜNÜMLERİ — §4.2 `/panel/ayarlar/denetim`.
 *
 * T-041f'in `mesaj-gorunumleri.ts` ve T-043f'in `icerik-gorunumleri.ts`
 * kalıbının üçüncü uygulaması: etiket, ürettiği filtre ve adres anahtarı TEK
 * YERDE. Üçü ayrı yerlerde yazılsaydı sekme "Silme" derken filtre başka bir
 * şey süzebilirdi ve kullanıcı bunu göremezdi.
 *
 * "HEPSİ" `action` ALANINI HİÇ VERMİYOR — `auditLogFilterSchema`da `action`
 * opsiyonel ve verilmediğinde süzmüyor. Buraya `'ALL'` gibi bir değer uydurmak,
 * şemada olmayan bir eylem türü icat etmek olurdu.
 */

export const EYLEM_ETIKET: Record<AuditAction, string> = {
  [AuditAction.CREATE]: 'Oluşturma',
  [AuditAction.UPDATE]: 'Güncelleme',
  [AuditAction.DELETE]: 'Silme',
  [AuditAction.ARCHIVE]: 'Arşivleme',
  [AuditAction.RESTORE]: 'Geri alma',
  [AuditAction.LOGIN]: 'Giriş',
  [AuditAction.LOGIN_FAILED]: 'Başarısız giriş',
  [AuditAction.LOGOUT]: 'Çıkış',
  [AuditAction.EXPORT]: 'Dışa aktarma',
};

/**
 * Rozet rengi. `LOGIN_FAILED` ve `DELETE` ayrı renkte: bu ikisi bir kolonu
 * TARAYARAK fark edilmesi gereken satırlar — denetim kaydının asıl işi.
 */
export const EYLEM_VARYANT: Record<
  AuditAction,
  'neutral' | 'success' | 'warning' | 'danger' | 'info'
> = {
  [AuditAction.CREATE]: 'success',
  [AuditAction.UPDATE]: 'info',
  [AuditAction.DELETE]: 'danger',
  [AuditAction.ARCHIVE]: 'warning',
  [AuditAction.RESTORE]: 'info',
  [AuditAction.LOGIN]: 'neutral',
  [AuditAction.LOGIN_FAILED]: 'danger',
  [AuditAction.LOGOUT]: 'neutral',
  [AuditAction.EXPORT]: 'warning',
};

export type DenetimGorunumu = {
  /** `?eylem=…`; "hepsi" için boş. */
  anahtar: string;
  etiket: string;
  /** Verilmezse tüm eylemler gelir. */
  eylem?: AuditAction;
};

export const DENETIM_GORUNUMLERI: readonly DenetimGorunumu[] = [
  { anahtar: 'hepsi', etiket: 'Hepsi' },
  { anahtar: 'olusturma', etiket: 'Oluşturma', eylem: AuditAction.CREATE },
  { anahtar: 'guncelleme', etiket: 'Güncelleme', eylem: AuditAction.UPDATE },
  { anahtar: 'silme', etiket: 'Silme', eylem: AuditAction.DELETE },
  { anahtar: 'arsivleme', etiket: 'Arşivleme', eylem: AuditAction.ARCHIVE },
  { anahtar: 'giris', etiket: 'Giriş', eylem: AuditAction.LOGIN },
  { anahtar: 'basarisiz-giris', etiket: 'Başarısız giriş', eylem: AuditAction.LOGIN_FAILED },
];

export function denetimGorunumuBul(anahtar: string | undefined): DenetimGorunumu {
  return (
    DENETIM_GORUNUMLERI.find((g) => g.anahtar === anahtar) ?? { anahtar: 'hepsi', etiket: 'Hepsi' }
  );
}

/** Liste adresi — bağlantılar tek yerden kuruluyor. */
export function denetimYolu({
  eylem,
  sayfa,
  from,
  to,
  sort,
}: {
  eylem?: string;
  sayfa?: number;
  from?: string;
  to?: string;
  sort?: 'asc' | 'desc';
}): string {
  const p = new URLSearchParams();
  if (eylem && eylem !== 'hepsi') p.set('eylem', eylem);
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  /* `desc` varsayılan — adrese yazmak gürültü olurdu. */
  if (sort === 'asc') p.set('sort', 'asc');
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  const sorgu = p.toString();
  return sorgu ? `/panel/ayarlar/denetim?${sorgu}` : '/panel/ayarlar/denetim';
}
