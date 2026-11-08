import { Search, X } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { GunlukListesi } from '@/components/panel/gunluk-listesi';
import { HayatAltMenu } from '@/components/panel/hayat-alt-menu';
import { gunlukYolu } from '@/components/panel/hayat-bicim';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { journalEntryFilterSchema } from '@/lib/schemas/journal-entry';
import { fetchJournalEntries } from '@/server/services/journal-entry';

export const metadata: Metadata = {
  title: 'Günlük',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 20;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tek(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/hayat/gunluk` — §4.2 günlük listesi.
 *
 * İKİ SÜZGEÇ, İKİSİ DE ADRESTE: `?q=` (başlık VE içerik — günlükte aranan şey
 * çoğu zaman metnin içinde, `buildJournalEntryWhere`) ve `?etiket=` (tam
 * eşleşme, `tags has`). Adres çubuğu kullanıcı girdisidir (ADR-032):
 * `journalEntryFilterSchema` reddederse (120 karakterden uzun arama, 32'den
 * uzun etiket) SÜZGEÇSİZ listeye düşülüyor ve bu ekranda SÖYLENİYOR.
 *
 * Arama düz GET formu (`hedefler/page.tsx` gerekçesi); etiket süzgeci formda
 * gizli alanla taşınıyor — aramak etiketi düşürmesin.
 */
export default async function GunlukPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const arama = tek(parametreler.q).trim();
  const etiket = tek(parametreler.etiket).trim();
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = journalEntryFilterSchema.safeParse({
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    ...(arama ? { q: arama } : {}),
    ...(etiket ? { tag: etiket } : {}),
  });

  const liste = await fetchJournalEntries(
    cozum.success ? cozum.data : { page: 1, perPage: SAYFA_BOYUTU },
  );
  const etkinArama = cozum.success ? (cozum.data.q ?? '') : '';
  const etkinEtiket = cozum.success ? (cozum.data.tag ?? '') : '';

  return (
    <>
      <Topbar title="Günlük" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl min-w-0 flex-col gap-6">
          <HayatAltMenu aktif="gunluk" />

          <form
            role="search"
            method="get"
            action="/panel/hayat/gunluk"
            className="flex flex-wrap items-center gap-2"
          >
            {etkinEtiket && <input type="hidden" name="etiket" value={etkinEtiket} />}
            <div className="relative min-w-0 flex-1">
              <Search
                className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                type="search"
                name="q"
                defaultValue={arama}
                maxLength={120}
                placeholder="Başlık veya yazı içinde ara"
                aria-label="Günlükte ara"
                className="pl-9"
              />
            </div>
            <button type="submit" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Ara
            </button>
          </form>

          {(etkinArama || etkinEtiket) && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Süzgeç:</span>
              {etkinArama && (
                <Link
                  href={gunlukYolu({ etiket: etkinEtiket || undefined })}
                  className="focus-ring rounded-pill border-line bg-elevated text-body hover:text-primary inline-flex items-center gap-1 border px-2.5 py-0.5 text-xs"
                >
                  “{etkinArama}”
                  <X className="size-3" aria-hidden="true" />
                  <span className="sr-only">aramasını kaldır</span>
                </Link>
              )}
              {etkinEtiket && (
                <Link
                  href={gunlukYolu({ q: etkinArama || undefined })}
                  className="focus-ring rounded-pill border-accent/40 bg-accent/12 text-accent-soft inline-flex items-center gap-1 border px-2.5 py-0.5 text-xs"
                >
                  #{etkinEtiket}
                  <X className="size-3" aria-hidden="true" />
                  <span className="sr-only">etiket süzgecini kaldır</span>
                </Link>
              )}
            </div>
          )}

          {(arama || etiket) && !cozum.success && (
            <p role="status" className="text-warning text-sm">
              Süzgeç geçersiz (arama en fazla 120, etiket en fazla 32 karakter) — süzgeçsiz liste
              gösteriliyor.
            </p>
          )}

          <GunlukListesi
            kayitlar={liste.items}
            toplam={liste.total}
            aramaVar={Boolean(etkinArama || etkinEtiket)}
            q={etkinArama || undefined}
            etiket={etkinEtiket || undefined}
          />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) =>
              gunlukYolu({
                q: etkinArama || undefined,
                etiket: etkinEtiket || undefined,
                sayfa: s,
              })
            }
          />
        </div>
      </main>
    </>
  );
}
