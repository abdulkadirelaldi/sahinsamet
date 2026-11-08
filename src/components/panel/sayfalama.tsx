import Link from 'next/link';

import { buttonClasses } from '@/components/ui/button';

/**
 * Sayfalama — `PagedResult` için.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `opacity-60` KALDIRILDI — ÖLÇÜLEN KONTRAST İHLALİ (T-055f)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sınırdaki devre dışı öğe `text-muted opacity-60` taşıyordu. Açık temada
 * `--text-muted: #686885` zemine (`#f8f8fc`) karşı 5.05 — GEÇİYOR; ama %60
 * saydamlık onu zeminle harmanlayıp `#a2a2b5`e indiriyor ve kontrast
 * 2.36'ya düşüyor. Lighthouse erişilebilirlik puanını 100 → 96 yapan tek
 * denetim buydu (`color-contrast`).
 *
 * ⚠️ GİZLİ BİR KUSURDU: `Sayfalama` tek sayfada `null` döndürüyor, yani
 * blog/projeler/deneyim/mesajlar ekranları 100 ölçmüştü SADECE fikstürleri
 * tek sayfaya sığdığı için. 125 denetim satırı ilk kez ikinci sayfayı
 * doğurdu ve kusur ortaya çıktı — T-043f'teki `.sr-only` taşmasıyla aynı
 * sınıf: sütun/satır sayısı azken görünmeyen bir hata.
 *
 * SAYDAMLIK YERİNE `aria-hidden`: öğe zaten bir bağlantı DEĞİL ve hiçbir yere
 * gitmiyor; "Önceki" kelimesini ekran okuyucuya iki kez (biri işlevsiz)
 * duyurmak yerine görsel bir sınır işareti olarak bırakılıyor. Gezinme
 * bilgisini "Sayfa 1 / 3" metni zaten veriyor.
 *
 * T-041f'te mesaj listesinde satır içinde yazılmıştı; içerik ekranlarıyla
 * birlikte ÜÇÜNCÜ kullanım oldu ve ortak bileşene taşındı.
 *
 * SINIRDAKİ DÜĞME BAĞLANTI OLARAK ÇİZİLMİYOR, devre dışı bir metne dönüyor:
 * tıklanıp aynı sayfada kalan bir bağlantı, ölü bağlantının sayfalamadaki
 * hâli olurdu.
 *
 * SERVER COMPONENT — yalnızca bağlantı üretiyor.
 */
export function Sayfalama({
  sayfa,
  perPage,
  toplam,
  yol,
}: {
  sayfa: number;
  perPage: number;
  toplam: number;
  /** Sayfa numarasından adres üretir. */
  yol: (sayfa: number) => string;
}) {
  const sonSayfa = Math.max(1, Math.ceil(toplam / perPage));
  if (sonSayfa <= 1) return null;

  return (
    <nav aria-label="Sayfalama" className="flex flex-wrap items-center justify-between gap-3">
      <p className="tabular text-muted text-sm">
        Sayfa {sayfa} / {sonSayfa}
      </p>

      <div className="flex gap-2">
        {sayfa > 1 ? (
          <Link
            href={yol(sayfa - 1)}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            Önceki
          </Link>
        ) : (
          <span
            aria-hidden="true"
            className="text-muted rounded-btn border-line border px-3 py-2 text-sm"
          >
            Önceki
          </span>
        )}

        {sayfa < sonSayfa ? (
          <Link
            href={yol(sayfa + 1)}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            Sonraki
          </Link>
        ) : (
          <span
            aria-hidden="true"
            className="text-muted rounded-btn border-line border px-3 py-2 text-sm"
          >
            Sonraki
          </span>
        )}
      </div>
    </nav>
  );
}
