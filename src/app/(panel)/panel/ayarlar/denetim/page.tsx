import type { Metadata } from 'next';
import Link from 'next/link';

import { DenetimEkrani } from '@/components/panel/denetim-ekrani';
import {
  DENETIM_GORUNUMLERI,
  denetimGorunumuBul,
  denetimYolu,
} from '@/components/panel/denetim-gorunumleri';
import { DenetimSuzgeci } from '@/components/panel/denetim-suzgeci';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { auditLogFilterSchema } from '@/lib/schemas/audit-log';
import { cn } from '@/lib/utils/cn';
import { fetchAuditLog } from '@/server/services/audit-log';

export const metadata: Metadata = {
  title: 'Denetim kaydı',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 50;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tek(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/ayarlar/denetim` — §4.2 "ne, ne zaman, hangi IP'den".
 *
 * ⚠️ `fetchAuditLog` SERVİSTEN doğrudan çağrılıyor, Server Action'dan DEĞİL.
 * Bu Backend'in açık uyarısı: `'use server'` dosyasından yeniden ihraç edilen
 * her işlev ağdan çağrılabilir bir POST ucuna dönüşür ve bu durumda denetim
 * kaydının TAMAMI kimlik doğrulamasız dışarı açılırdı. Kapı bunu kaynaktan
 * tarayarak sınıyor; buradan da aynı sınır korunuyor.
 *
 * SAYFA BOYUTU 50 (içerik listelerinde 25): denetim kaydı TARANAN bir liste,
 * okunan değil — bir kolonu gözle süzmek için daha çok satır işe yarıyor.
 * Adresten verilemiyor, yani kaynak tüketimi yüzeyi açılmıyor.
 */
export default async function DenetimPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const gorunum = denetimGorunumuBul(tek(parametreler.eylem) || 'hepsi');
  const sayfa = sayfaNumarasi(parametreler.sayfa);
  const from = tek(parametreler.from);
  const to = tek(parametreler.to);
  const sort = tek(parametreler.sort) === 'asc' ? 'asc' : 'desc';

  /*
   * Adres çubuğu kullanıcı girdisidir — filtre Backend'in şemasından geçiyor
   * (ADR-032). Şema ters aralığı (`from > to`) da reddediyor; reddedilirse
   * süzgeçsiz ilk sayfaya düşülüyor ve kullanıcıya aşağıda söyleniyor.
   */
  const cozum = auditLogFilterSchema.safeParse({
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    sort,
    ...(gorunum.eylem ? { action: gorunum.eylem } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const liste = await fetchAuditLog(
    cozum.success ? cozum.data : { page: 1, perPage: SAYFA_BOYUTU, sort: 'desc' },
  );

  return (
    <>
      <Topbar title="Denetim kaydı" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <p className="text-muted max-w-2xl text-sm">
            Panelde yapılan her değişiklik buraya yazılır.{' '}
            <span className="text-body">Değişen alanların adları</span> görünür,{' '}
            <span className="text-body">değerleri görünmez</span> — ele geçirilmiş bir oturumun
            geçmişteki her değeri topluca okumasını engellemek için (ADR-034).
          </p>

          {!cozum.success && (
            <p
              role="alert"
              className="rounded-input border-danger/40 bg-danger/8 text-danger border px-3 py-2.5 text-sm"
            >
              Süzgeç geçersizdi (muhtemelen bitiş tarihi başlangıçtan önce) — süzgeçsiz ilk sayfa
              gösteriliyor.
            </p>
          )}

          <nav aria-label="Eylem süzgeci" className="-mx-1 overflow-x-auto px-1 pb-1">
            <ul className="flex min-w-max gap-1.5">
              {DENETIM_GORUNUMLERI.map((g) => {
                const secili = g.anahtar === gorunum.anahtar;
                return (
                  <li key={g.anahtar}>
                    <Link
                      href={denetimYolu({
                        eylem: g.anahtar,
                        from: from || undefined,
                        to: to || undefined,
                        sort,
                      })}
                      aria-current={secili ? 'page' : undefined}
                      className={cn(
                        'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center border px-3 py-2 text-sm transition-colors',
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

          <DenetimSuzgeci eylem={gorunum.anahtar} from={from} to={to} sort={sort} />

          <div className="flex flex-col gap-3">
            <p className="text-muted text-sm">
              <span className="tabular">{liste.total}</span> kayıt
              {gorunum.eylem && ` · ${gorunum.etiket}`}
            </p>

            <DenetimEkrani kayitlar={liste.items} toplam={liste.total} />

            <Sayfalama
              sayfa={liste.page}
              perPage={liste.perPage}
              toplam={liste.total}
              yol={(s) =>
                denetimYolu({
                  eylem: gorunum.anahtar,
                  from: from || undefined,
                  to: to || undefined,
                  sort,
                  sayfa: s,
                })
              }
            />
          </div>
        </div>
      </main>
    </>
  );
}
