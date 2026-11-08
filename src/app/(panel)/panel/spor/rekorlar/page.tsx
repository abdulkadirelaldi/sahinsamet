import { X } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { RekorTablosu } from '@/components/panel/rekor-tablosu';
import { Sayfalama } from '@/components/panel/sayfalama';
import { SporSekmeleri } from '@/components/panel/spor-sekmeleri';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { personalRecordFilterSchema } from '@/lib/schemas/personal-record';
import { fetchExercises } from '@/server/services/exercise';
import { fetchPersonalRecords } from '@/server/services/personal-record';

export const metadata: Metadata = {
  title: 'Rekorlar',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 50;

/** Süzgeç seçicisinin tavanı — `paginationSchema.perPage` en fazla 100. */
const SECICI_TAVANI = 100;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tek(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

function yol(egzersiz: string | undefined, sayfa?: number): string {
  const p = new URLSearchParams();
  if (egzersiz) p.set('egzersiz', egzersiz);
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  const q = p.toString();
  return q ? `/panel/spor/rekorlar?${q}` : '/panel/spor/rekorlar';
}

/**
 * `/panel/spor/rekorlar` — §4.2 "PR takibi".
 *
 * ⚠️ `?egzersiz=` KULLANICI GİRDİSİ (ADR-032): `personalRecordFilterSchema`
 * `exerciseId`yi `cuidSchema` ile doğruluyor. Geçersiz değer hata sayfası
 * DEĞİL, süzgeçsiz listeye düşüyor — ve ekran bunu söylüyor, sessizce
 * yutmuyor.
 *
 * ⚠️ SÜZGEÇ SEÇİCİSİ ARŞİVİ DE GÖSTERİYOR ve bu set seçicisinin TERSİ:
 * arşivlenen hareketin rekorları YERİNDE duruyor (`archiveExercise` onlara
 * dokunmuyor) ve süzgecin işi GEÇMİŞİ okumak. `muhasebe-suzgeci.tsx`in
 * kategori süzgeciyle aynı karar.
 *
 * Süzgeç formu `method="get"` — JavaScript'siz de çalışıyor.
 */
export default async function RekorlarPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const hamEgzersiz = tek(parametreler.egzersiz).trim();
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = personalRecordFilterSchema.safeParse({
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    ...(hamEgzersiz ? { exerciseId: hamEgzersiz } : {}),
  });
  const gecersizSuzgec = Boolean(hamEgzersiz) && !cozum.success;
  const filtre = cozum.success ? cozum.data : { page: 1, perPage: SAYFA_BOYUTU };
  const egzersizId = cozum.success ? cozum.data.exerciseId : undefined;

  const [liste, egzersizler] = await Promise.all([
    fetchPersonalRecords(filtre),
    fetchExercises({ page: 1, perPage: SECICI_TAVANI }),
  ]);

  const seciliAd = egzersizler.items.find((e) => e.id === egzersizId)?.name;

  return (
    <>
      <Topbar title="Rekorlar" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <SporSekmeleri secili="rekorlar" />

          <p className="text-muted max-w-2xl text-sm">
            Rekorlar <span className="text-body">tekrar sayısına göre</span> ayrı tutulur (1RM,
            5RM…) ve ağırlıklı setlerden kendiliğinden hesaplanır. Bir rekoru düzeltmek için kaynağı
            olan seti düzelt ya da sil.
          </p>

          <form
            method="get"
            action="/panel/spor/rekorlar"
            className="flex flex-wrap items-end gap-3"
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="rekor-egzersiz">Hareket</Label>
              <select
                id="rekor-egzersiz"
                name="egzersiz"
                defaultValue={egzersizId ?? ''}
                className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 max-w-full border px-3 text-sm"
              >
                <option value="">Hepsi</option>
                {egzersizler.items.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.isArchived ? ' (arşivli)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Uygula
            </button>

            {egzersizId && (
              <Link
                href={yol(undefined)}
                className={buttonClasses({ variant: 'ghost', size: 'sm' })}
              >
                <X className="size-4" aria-hidden="true" />
                Süzgeci temizle
              </Link>
            )}
          </form>

          {gecersizSuzgec && (
            <p
              role="status"
              className="rounded-input border-warning/40 bg-warning/8 text-body border px-3 py-2.5 text-sm"
            >
              Adresteki hareket süzgeci geçersiz; tüm rekorlar gösteriliyor.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <p className="text-muted text-sm">
              <span className="tabular">{liste.total}</span> rekor
              {seciliAd ? ` · ${seciliAd}` : ''}
            </p>

            <RekorTablosu
              rekorlar={liste.items}
              hareketSutunu={!egzersizId}
              {...(egzersizId
                ? {
                    bosBaslik: 'Bu hareketin rekoru yok',
                    bosAciklama:
                      'Bu harekete ağırlıklı bir set girildiğinde rekorlar burada oluşur. Ağırlıksız setler rekora girmez.',
                  }
                : {})}
            />
          </div>

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) => yol(egzersizId, s)}
          />
        </div>
      </main>
    </>
  );
}
