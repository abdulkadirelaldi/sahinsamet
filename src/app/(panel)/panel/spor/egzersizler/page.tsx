import { Plus, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EgzersizListesi } from '@/components/panel/egzersiz-listesi';
import {
  EGZERSIZ_GORUNUMLERI,
  egzersizGorunumuBul,
  egzersizlerYolu,
} from '@/components/panel/egzersiz-gorunumleri';
import { Sayfalama } from '@/components/panel/sayfalama';
import { SporSekmeleri } from '@/components/panel/spor-sekmeleri';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { exerciseFilterSchema } from '@/lib/schemas/exercise';
import { cn } from '@/lib/utils/cn';
import { fetchExercises } from '@/server/services/exercise';

export const metadata: Metadata = {
  title: 'Egzersizler',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 25;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tek(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/spor/egzersizler` — §4.2 "egzersiz kütüphanesi".
 *
 * ⚠️ VARSAYILAN GÖRÜNÜM ARŞİVİ GİZLEMİYOR — gerekçe `egzersiz-gorunumleri.ts`te.
 *
 * Filtre `exerciseFilterSchema`'dan geçiyor (adres çubuğu kullanıcı girdisi,
 * ADR-032). `q` 120 karakteri aşarsa şema reddediyor ve sayfa aramasız
 * görünüme düşüyor — hata sayfası değil.
 *
 * ARAMA FORMU `method="get"` — JavaScript'siz de çalışıyor ve sonuç adresi
 * paylaşılabilir. Görünüm gizli alanla korunuyor: Arşiv sekmesinde arama
 * yapan kullanıcı "Hepsi"ne fırlatılmıyor.
 */
export default async function EgzersizlerPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const gorunum = egzersizGorunumuBul(tek(parametreler.gorunum) || 'hepsi');
  const arama = tek(parametreler.q).trim();
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = exerciseFilterSchema.safeParse({
    ...gorunum.filtre,
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    ...(arama ? { q: arama } : {}),
  });

  const liste = await fetchExercises(
    cozum.success ? cozum.data : { ...gorunum.filtre, page: 1, perPage: SAYFA_BOYUTU },
  );
  const gecerliArama = cozum.success ? arama : '';

  return (
    <>
      <Topbar
        title="Egzersizler"
        actions={
          <Link href="/panel/spor/egzersizler/yeni" className={buttonClasses({ size: 'sm' })}>
            <Plus className="size-4" aria-hidden="true" />
            Yeni egzersiz
          </Link>
        }
      />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <SporSekmeleri secili="egzersizler" />

          <div className="flex flex-wrap items-end justify-between gap-3">
            <nav aria-label="Egzersiz görünümleri" className="-mx-1 overflow-x-auto px-1 pb-1">
              <ul className="flex min-w-max gap-1.5">
                {EGZERSIZ_GORUNUMLERI.map((g) => {
                  const secili = g.anahtar === gorunum.anahtar;
                  return (
                    <li key={g.anahtar}>
                      <Link
                        href={egzersizlerYolu({ gorunum: g.anahtar, q: gecerliArama || undefined })}
                        aria-current={secili ? 'page' : undefined}
                        className={cn(
                          'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center border px-3 py-1.5 text-sm transition-colors',
                          secili
                            ? 'border-accent/40 bg-accent/12 text-accent-soft'
                            : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
                        )}
                      >
                        {g.etiket}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <form
              method="get"
              action="/panel/spor/egzersizler"
              role="search"
              className="flex w-full items-end gap-2 sm:w-auto"
            >
              {gorunum.anahtar !== 'hepsi' && (
                <input type="hidden" name="gorunum" value={gorunum.anahtar} />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor="egzersiz-ara">Ada göre ara</Label>
                <Input
                  id="egzersiz-ara"
                  name="q"
                  type="search"
                  defaultValue={gecerliArama}
                  maxLength={120}
                  placeholder="Squat"
                />
              </div>
              <button type="submit" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                <Search className="size-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Ara</span>
              </button>
            </form>
          </div>

          <EgzersizListesi
            egzersizler={liste.items}
            toplam={liste.total}
            bosBaslik={gecerliArama ? 'Arama sonuç vermedi' : gorunum.bosBaslik}
            bosAciklama={
              gecerliArama
                ? `“${gecerliArama}” için bu görünümde eşleşen hareket yok.`
                : gorunum.bosAciklama
            }
          />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) =>
              egzersizlerYolu({ gorunum: gorunum.anahtar, q: gecerliArama || undefined, sayfa: s })
            }
          />
        </div>
      </main>
    </>
  );
}
