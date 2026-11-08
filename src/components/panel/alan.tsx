'use client';

import { FormError } from '@/components/ui/form-error';
import { Label } from '@/components/ui/label';

/**
 * Etiket + alan + hata üçlüsü.
 *
 * Çocuk bir FONKSİYON: `aria-invalid` ve `aria-describedby` alanın KENDİSİNE
 * gitmeli, sarmalayıcıya değil. Elemanı klonlamak da olurdu ama klonlama
 * tipleri kaybettiriyor ve `any` gerektiriyordu (§2 yasağı). Fonksiyon,
 * bağlantıları açıkça ve tip güvenli biçimde geçiriyor.
 */
export function Alan({
  id,
  etiket,
  hata,
  yardim,
  children,
}: {
  id: string;
  etiket: string;
  hata?: string;
  yardim?: string;
  children: (baglantilar: {
    'aria-invalid'?: true;
    'aria-describedby'?: string;
  }) => React.ReactNode;
}) {
  const yardimId = yardim ? `${id}-yardim` : undefined;
  const hataId = hata ? `${id}-hata` : undefined;
  const tanim = [yardimId, hataId].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{etiket}</Label>

      {children({
        'aria-invalid': hata ? true : undefined,
        'aria-describedby': tanim || undefined,
      })}

      {yardim && (
        <p id={yardimId} className="text-muted text-xs">
          {yardim}
        </p>
      )}
      {hata && <FormError id={hataId}>{hata}</FormError>}
    </div>
  );
}

/* ===========================================================================
 * HTML GİRDİSİ ↔ ŞEMA — `register` dönüştürücüleri
 *
 * T-034'te ÖLÇÜLDÜ, varsayılmadı: iki ayrı sessiz kırık vardı ve ikisi de
 * gönderimi sunucuya HİÇ ulaştırmıyordu.
 *
 *   1. Doldurulmamış bir metin/tarih girdisi `''` verir; şemada alan
 *      `optional()` — yani `undefined` bekliyor. `''` "geçersiz bağlantı",
 *      "geçersiz tarih" diye hata üretiyordu, hâlbuki kullanıcı alanı hiç
 *      doldurmamıştı.
 *   2. `<input type="datetime-local">` `2026-09-09T14:30` yazar; `instantSchema`
 *      (`z.iso.datetime()`) saniye ve saat dilimi ister. Yani alan DOLU
 *      olduğunda da HER ZAMAN reddediliyordu.
 *
 * Kural bu yüzden şemada değil BURADA düzeltiliyor: şema sunucunun kabul
 * ettiği biçimi tarif ediyor (§7.3 — kural tek yerde), tarayıcının ürettiği
 * biçimden şemanınkine çeviren şey ise arayüzün kendi işi.
 * ======================================================================== */

/** Boş bırakılmış alan = alan hiç yok. */
export const BOS_ISE_YOK = {
  setValueAs: (deger: unknown) =>
    typeof deger === 'string' && deger.trim() === '' ? undefined : deger,
};

/**
 * Sayı girdisi — boşaltılmışsa `undefined`.
 *
 * `valueAsNumber` boş alanda `NaN` üretiyor ve Zod buna İNGİLİZCE bir tip
 * hatası basıyordu ("expected number, received NaN"). `undefined` ise şemadaki
 * `.default(0)` dalına düşüyor: kullanıcı alanı boşaltınca sıra 0 oluyor.
 */
export const SAYI_YA_DA_YOK = {
  setValueAs: (deger: unknown) => {
    if (deger === '' || deger === null || deger === undefined) return undefined;
    const sayi = Number(deger);
    return Number.isNaN(sayi) ? undefined : sayi;
  },
};

/**
 * Ondalık ölçü girdisi (kilo, uyku saati) — boşsa `undefined`, VİRGÜL → NOKTA.
 *
 * Türkçe klavyede ondalık ayırıcı virgül; `decimalSchema` ise `82.5` bekliyor.
 * Çevrilmeseydi "82,5" yazan kullanıcı biçim hatası görürdü — doğru değeri
 * doğru yazımla girdiği hâlde. Sayıya ÇEVRİLMİYOR (ADR-014/D): dize olarak
 * kalıyor, yalnızca ayırıcı değişiyor.
 */
export const ONDALIK_YA_DA_YOK = {
  setValueAs: (deger: unknown) => {
    if (typeof deger !== 'string') return deger;
    const temiz = deger.trim();
    return temiz === '' ? undefined : temiz.replace(',', '.');
  },
};

/** `datetime-local` çıktısını ISO 8601 anına çevirir. */
export const ANI_ISOYA = {
  setValueAs: (deger: unknown) => {
    if (typeof deger !== 'string' || deger.trim() === '') return undefined;
    const an = new Date(deger);
    /* Çözülemeyen metni OLDUĞU GİBİ geçir: hatayı şema söylesin, biz yutmayalım. */
    return Number.isNaN(an.getTime()) ? deger : an.toISOString();
  },
};

/**
 * Ters yön — düzenlemede ISO değeri `datetime-local` girdisine yazmak için.
 * Girdi `YYYY-AA-GGTSS:dd` ister; ISO metnini olduğu gibi verirsek alan BOŞ
 * görünür ve kullanıcı yayın tarihini kaybettiğini sanır.
 */
export function isodanYerelAna(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const an = new Date(iso);
  if (Number.isNaN(an.getTime())) return undefined;
  const p = (s: number) => String(s).padStart(2, '0');
  return `${an.getFullYear()}-${p(an.getMonth() + 1)}-${p(an.getDate())}T${p(an.getHours())}:${p(an.getMinutes())}`;
}

/**
 * DÜZENLEMEDE "BOŞALT" — kayıtta DOLU olup formda BOŞALTILAN alanları `null`
 * yapar; diğer her şeye dokunmaz.
 *
 * Form boş alanı `undefined` olarak taşıyor (`BOS_ISE_YOK` ve kardeşleri) ve
 * T-031 kuralında `undefined` = "dokunma". Bu yüzden dolu bir alanı boşaltmak
 * eski değeri SESSİZCE koruyordu; F5 formları bunu ekranda uyarı olarak
 * yazıyordu. Güncelleme şemaları artık temizlenebilir sütunlarda `null`
 * kabul ediyor; burası "kullanıcı boşalttı" niyetini o değere çeviriyor.
 *
 * ⚠️ ZATEN BOŞ OLAN alana `null` GÖNDERİLMİYOR: gönderilseydi sonuç aynı
 * olurdu ama denetim kaydı o alanı "değişti" diye yazardı — dokunulmayan
 * alanların listesi, değişikliğin kaydını yalana çevirirdi.
 */
export function bosaltilanlariNullYap<T extends Record<string, unknown>, R extends object>(
  degerler: T,
  kayit: R,
  /** Ad HEM formda HEM kayıtta olmalı — yanlış yazılmış bir ad derleme hatası. */
  temizlenebilir: readonly (keyof T & keyof R & string)[],
): { [K in keyof T]: T[K] | null } {
  const sonuc: Record<string, unknown> = { ...degerler };
  const eski = kayit as Record<string, unknown>;
  for (const alan of temizlenebilir) {
    if (sonuc[alan] === undefined && eski[alan] != null) sonuc[alan] = null;
  }
  return sonuc as { [K in keyof T]: T[K] | null };
}
