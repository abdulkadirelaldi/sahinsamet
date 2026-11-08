'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

/**
 * VERİ TABLOSU — F3/F4/F5'in liste ekranlarının ortak deseni (T-032).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜÇ DURUM TEK BİLEŞENDE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Yükleniyor · boş · dolu. Üçü tek yerde olduğu için bir ekranın birini
 * unutması imkânsız — "yükleniyor" ekranını unutmak, veri gelene kadar boş
 * durum göstermek demekti ve kullanıcıya "kayıt yok" yalanını söylerdi.
 *
 * İSKELET, YERİNE GEÇTİĞİ TABLOYLA AYNI ÖLÇÜDE — İKİ AYRI ŞART:
 *
 *   1. SATIR YÜKSEKLİĞİ aynı: `h-11` hem iskelet hem gerçek hücrede.
 *   2. SATIR SAYISI aynı: elde satır varken (liste tazeleniyorsa) iskelet O
 *      KADAR satır çiziyor, sabit bir sayı değil.
 *
 * İkincisi ÖLÇÜMLE eklendi: sabit 5 iskelet satırı, 4 satırlık bir listeyi
 * tazelerken tabloyu 216 → 260 px yapıyordu ve altındaki her şey kayıyordu
 * (girdi dışı CLS 0.0236). İlk yüklemede satır sayısı bilinemez; orada
 * `iskeletSatir` varsayılanı geçerli — o an altta kayacak içerik de yok.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SAYISAL SÜTUN — §3.2
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `sayisal: true` verilen sütun `.tabular` (JetBrains Mono + `tabular-nums`)
 * alır ve SAĞA yaslanır. İkisi birlikte olmadan sütun hizalanmıyor: sağa
 * yaslamak rakam genişliği değişkense yetmez, sekmeli rakam da sola yaslıysa
 * göz karşılaştıramaz.
 *
 * SIRALAMA İSTEMCİDE: `siralamaDegeri` veren sütunlar tıklanabilir. Sunucu
 * tarafı sıralama gerektiğinde (binlerce satır) çağıran taraf `siralanabilir`
 * vermez ve kendi bağlantılarını kurar — bu bileşen o yolu engellemiyor.
 */

export type Sutun<T> = {
  /** React anahtarı ve sıralama kimliği. */
  anahtar: string;
  baslik: string;
  /** Hücre içeriği. */
  deger: (satir: T) => ReactNode;
  /** §3.2 — sekmeli rakam + sağa yaslama. Tutar, adet, tarih. */
  sayisal?: boolean;
  /**
   * Sıralanabilir yapmak için karşılaştırma değeri. Verilmezse sütun başlığı
   * düğme olmaz — tıklanıp hiçbir şey yapmayan başlık, ölü bağlantının
   * tablodaki karşılığıdır.
   */
  siralamaDegeri?: (satir: T) => string | number;
  /** Dar ekranda gizlenecek ikincil sütun. */
  ikincil?: boolean;
};

export type VeriTablosuProps<T> = {
  satirlar: readonly T[];
  sutunlar: ReadonlyArray<Sutun<T>>;
  /** Satır kimliği — React anahtarı. Dizinin indeksi KULLANILMAZ (sıra değişir). */
  satirAnahtari: (satir: T) => string;
  /** Tablonun ne listelediği — ekran okuyucu için (`<caption>`). */
  baslik: string;
  yukleniyor?: boolean;
  /** Satır yokken gösterilecek şey. Eylem daveti İÇERMELİ (T-002 kuralı). */
  bosDurum: ReactNode;
  /** Yükleniyorken çizilecek iskelet satır sayısı. */
  iskeletSatir?: number;
  className?: string;
};

type Siralama = { anahtar: string; yon: 'artan' | 'azalan' };

export function VeriTablosu<T>({
  satirlar,
  sutunlar,
  satirAnahtari,
  baslik,
  yukleniyor = false,
  bosDurum,
  iskeletSatir = 5,
  className,
}: VeriTablosuProps<T>) {
  const [siralama, setSiralama] = useState<Siralama | null>(null);

  const siraliSatirlar = useMemo(() => {
    if (!siralama) return satirlar;
    const sutun = sutunlar.find((s) => s.anahtar === siralama.anahtar);
    if (!sutun?.siralamaDegeri) return satirlar;

    const yon = siralama.yon === 'artan' ? 1 : -1;
    return [...satirlar].sort((a, b) => {
      const x = sutun.siralamaDegeri!(a);
      const y = sutun.siralamaDegeri!(b);
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * yon;
      /* Metin sıralaması TÜRKÇE: `localeCompare` olmadan "İ" ve "ı" yanlış yere düşer. */
      return String(x).localeCompare(String(y), 'tr') * yon;
    });
  }, [satirlar, sutunlar, siralama]);

  const siralamayiDegistir = (anahtar: string) => {
    setSiralama((onceki) =>
      onceki?.anahtar === anahtar
        ? { anahtar, yon: onceki.yon === 'artan' ? 'azalan' : 'artan' }
        : { anahtar, yon: 'artan' },
    );
  };

  if (!yukleniyor && satirlar.length === 0) return <>{bosDurum}</>;

  /* Tazelemede eldeki satır sayısı, ilk yüklemede varsayılan (yukarıdaki not). */
  const iskeletAdedi = satirlar.length > 0 ? satirlar.length : iskeletSatir;

  return (
    /*
      `relative` ŞART, süs değil — T-043f'te ÖLÇÜLDÜ ve sebebi şaşırtıcı.

      Proje tablosu 7 sütuna çıkınca 360px'te sayfaya 53px YATAY TAŞMA düştü.
      İlk tahminim flex `min-width: auto` tuzağıydı; `min-w-0` ekledim ve
      DEĞİŞMEDİ — sarmalayıcı zaten 328px'ti ve düzgün kaydırıyordu
      (`scrollWidth` 427 > `clientWidth` 326).

      Gerçek sebep, hücrelerdeki `.sr-only` etiketleri: Tailwind'in `sr-only`si
      `position: absolute` veriyor ve bu kutuda KONUMLANDIRILMIŞ BİR ATA
      olmadığı için onların içeren bloğu kaydırma kutusunun DIŞINDA kalıyordu.
      Yani mutlak konumlu o elemanlar kutunun kırpmasından kaçıp tablonun doğal
      x konumuna (≈427px) düşüyor ve taşmayı sayfaya taşıyorlardı. Ölçüm:
      `.sr-only`ler gizlenince sayfa genişliği 413 → 360.

      `relative` içeren bloğu bu kutu yapıyor; kırpma yeniden geçerli oluyor.
      Tabloyu `table-layout: fixed` yapmak da taşmayı kapatıyordu ama o, sütun
      genişliklerini içeriğe göre hesaplamayı bırakmak demekti — sebebi değil
      belirtisini düzeltirdi.
    */
    <div className={cn('border-line rounded-card relative overflow-x-auto border', className)}>
      <table role="table" className="veri-tablo w-full border-collapse text-sm">
        <caption className="sr-only">{baslik}</caption>

        <thead role="rowgroup" className="bg-elevated">
          <tr role="row">
            {sutunlar.map((sutun) => {
              const aktif = siralama?.anahtar === sutun.anahtar;
              const Ikon = !aktif ? ChevronsUpDown : siralama.yon === 'artan' ? ArrowUp : ArrowDown;

              return (
                <th
                  key={sutun.anahtar}
                  role="columnheader"
                  scope="col"
                  /*
                   * `aria-sort`: ekran okuyucu sütunun sıralı olduğunu ve yönünü
                   * duyurur. Yalnızca ikonla göstermek görme engelli kullanıcıya
                   * hiçbir şey söylemezdi.
                   */
                  aria-sort={
                    aktif ? (siralama.yon === 'artan' ? 'ascending' : 'descending') : undefined
                  }
                  className={cn(
                    'text-muted border-line border-b px-3 py-2.5 text-xs font-medium tracking-wider uppercase',
                    sutun.sayisal ? 'text-right' : 'text-left',
                    sutun.ikincil && 'hidden sm:table-cell',
                  )}
                >
                  {sutun.siralamaDegeri ? (
                    <button
                      type="button"
                      onClick={() => siralamayiDegistir(sutun.anahtar)}
                      className={cn(
                        'focus-ring rounded-btn hover:text-primary ease-brand duration-micro inline-flex items-center gap-1.5 transition-colors',
                        sutun.sayisal && 'flex-row-reverse',
                      )}
                    >
                      {sutun.baslik}
                      <Ikon className="size-3.5 shrink-0" aria-hidden="true" />
                    </button>
                  ) : (
                    sutun.baslik
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody role="rowgroup" aria-busy={yukleniyor || undefined}>
          {yukleniyor
            ? Array.from({ length: iskeletAdedi }, (_, sira) => (
                <tr key={`iskelet-${sira}`} className="border-line border-b last:border-b-0">
                  {sutunlar.map((sutun) => (
                    <td
                      key={sutun.anahtar}
                      className={cn('h-11 px-3', sutun.ikincil && 'hidden sm:table-cell')}
                    >
                      <Skeleton className={cn('h-3.5', sutun.sayisal ? 'ml-auto w-16' : 'w-28')} />
                    </td>
                  ))}
                </tr>
              ))
            : siraliSatirlar.map((satir) => (
                <tr
                  role="row"
                  key={satirAnahtari(satir)}
                  className="border-line hover:bg-elevated/60 ease-brand duration-micro border-b transition-colors last:border-b-0"
                >
                  {sutunlar.map((sutun) => (
                    <td
                      role="cell"
                      key={sutun.anahtar}
                      data-baslik={sutun.baslik}
                      data-eylem={sutun.baslik === 'İşlem' ? '' : undefined}
                      className={cn(
                        'text-body h-11 px-3',
                        sutun.sayisal ? 'tabular text-right' : 'text-left',
                        sutun.ikincil && 'hidden sm:table-cell',
                      )}
                    >
                      {sutun.deger(satir)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
