import { ChartColumn, ChevronRight, Plus, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ButceKarti } from '@/components/panel/butce-karti';
import {
  ayinGunu,
  HESAP_TURU,
  miktarBicim,
  SIKLIK,
  tlBicim,
} from '@/components/panel/cuzdan-bicim';
import { gunAy } from '@/components/panel/hayat-bicim';
import { OdemeOnay } from '@/components/panel/odeme-onay';
import { paraBicim, tutarYaziBoyu } from '@/components/panel/para-bicim';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import {
  butceOzeti,
  fetchButceLimitleri,
  fetchCuzdan,
  type AkisDto,
  type HesapDto,
} from '@/server/services/cuzdan';
import { fetchBekleyenOdemeler, fetchIslenenOdemeler } from '@/server/services/odeme-onay';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: 'Cüzdan',
  robots: { index: false, follow: false, nocache: true },
};

const SAAT = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

/**
 * CÜZDAN (2026-10-30, telefon öncelikli) — muhasebenin yerine.
 *
 * En üstte NET (varlık − borç) ve bu ayın hesabı (gelir − gider − taksit);
 * altta hesaplar (altın/döviz dahil, güncel TL karşılığıyla), borçlar (kalan,
 * taksit, bitişe kalan ay), gelirler ve giderler. Kur zamanı ve "bayat" uyarısı
 * görünür — uydurma ya da sıfır kur yok.
 */
export default async function CuzdanPage() {
  const [c, limitler, odemeler, islenenler] = await Promise.all([
    fetchCuzdan(),
    fetchButceLimitleri(),
    fetchBekleyenOdemeler(),
    fetchIslenenOdemeler(),
  ]);
  const { ozet } = c;
  const eksi = ozet.netTl.startsWith('-');

  return (
    <>
      <Topbar
        title="Cüzdan"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/panel/cuzdan/ara"
              aria-label="Cüzdan'da ara"
              className={buttonClasses({ size: 'sm', variant: 'secondary' })}
            >
              <Search className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/panel/cuzdan/rapor"
              className={buttonClasses({ size: 'sm', variant: 'secondary' })}
            >
              <ChartColumn className="size-4" aria-hidden="true" />
              Aylık rapor
            </Link>
          </div>
        }
      />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {/* ── NET ───────────────────────────────────────────────────── */}
          <section className="aura aura-para flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <span className="ust-etiket">Net varlık</span>
              <span className="tabular sayi-buyuk text-[clamp(1.875rem,9.5vw,2.625rem)] leading-none font-semibold whitespace-nowrap">
                {paraBicim(ozet.netTl, 'TRY')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-sm">
              <div className="cam-kutu flex min-w-0 flex-col gap-0.5 p-3">
                <span className="text-muted text-xs">Varlıklar</span>
                <span
                  className={cn(
                    'tabular font-semibold whitespace-nowrap',
                    tutarYaziBoyu(paraBicim(ozet.varlikTl, 'TRY'), 'text-base'),
                  )}
                >
                  {paraBicim(ozet.varlikTl, 'TRY')}
                </span>
              </div>
              <div className="cam-kutu flex min-w-0 flex-col gap-0.5 p-3">
                <span className="text-muted text-xs">Borçlar</span>
                <span
                  className={cn(
                    'tabular font-semibold whitespace-nowrap',
                    tutarYaziBoyu(paraBicim(ozet.borcTl, 'TRY'), 'text-base'),
                  )}
                >
                  {paraBicim(ozet.borcTl, 'TRY')}
                </span>
              </div>
            </div>
            {eksi && <span className="text-xs opacity-90">Borçların varlıklarından fazla.</span>}
          </section>

          <Dagilim hesaplar={c.hesaplar} />

          {/* ── BU AY ─────────────────────────────────────────────────── */}
          <section className="rounded-card border-line bg-surface grid grid-cols-2 gap-3 border p-4 text-sm">
            <Satir etiket="Aylık gelir" deger={ozet.aylikGelirTl} ton="text-success" />
            <Satir etiket="Aylık gider" deger={ozet.aylikGiderTl} ton="text-danger" />
            <Satir etiket="Borç taksitleri" deger={ozet.aylikTaksitTl} ton="text-warning" />
            <Satir
              etiket="Ay sonunda kalan"
              deger={ozet.aylikKalanTl}
              ton={ozet.aylikKalanTl.startsWith('-') ? 'text-danger' : 'text-primary'}
            />
          </section>

          <p className="text-muted -mt-2 text-xs">
            Kurlar: {c.kur.guncellendi ? SAAT.format(new Date(c.kur.guncellendi)) : 'alınamadı'}{' '}
            (Truncgil · varlık alış, borç satış)
            {c.kur.bayat && (
              <span className="text-warning"> — son bilinen kur, güncel olmayabilir</span>
            )}
            {ozet.kursuzKalem > 0 && (
              <span className="text-warning">
                {' '}
                · {ozet.kursuzKalem} kalemin kuru yok, toplamlara girmedi
              </span>
            )}
          </p>

          <OdemeOnay odemeler={odemeler} hesaplar={c.hesaplar} islenenler={islenenler} />

          {/* ── HESAPLAR ──────────────────────────────────────────────── */}
          <Bolum baslik="Hesaplar" ekle="/panel/cuzdan/yeni?tur=hesap" ekleEtiket="Hesap ekle">
            {c.hesaplar.length === 0 ? (
              <Bos>Banka, nakit, altın ya da döviz — hepsi hesap olarak eklenir.</Bos>
            ) : (
              c.hesaplar.map((h) => (
                <Kalem
                  key={h.id}
                  href={`/panel/cuzdan/hesap/${h.id}`}
                  baslik={h.name}
                  alt={`${HESAP_TURU[h.kind]} · ${miktarBicim(h.balance, h.unit)}`}
                  deger={tlBicim(h.tl)}
                />
              ))
            )}
          </Bolum>

          {/* ── BORÇLAR ───────────────────────────────────────────────── */}
          <Bolum baslik="Borçlar" ekle="/panel/cuzdan/yeni?tur=borc" ekleEtiket="Borç ekle">
            {c.borclar.length === 0 ? (
              <Bos>Kredi, kart, kişiye borç — altın borcu da güncel TL karşılığıyla görünür.</Bos>
            ) : (
              c.borclar.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/panel/cuzdan/borc/${b.id}`}
                    className="focus-ring rounded-card border-line bg-surface flex flex-col gap-2 border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 flex-col">
                        <span className="text-primary truncate font-medium">{b.name}</span>
                        <span className="text-muted truncate text-xs">
                          Kalan {miktarBicim(b.remainingAmount, b.unit)}
                          {b.lender && ` · ${b.lender}`}
                        </span>
                      </span>
                      <span className="tabular text-danger shrink-0 text-sm font-semibold">
                        {tlBicim(b.kalanTl)}
                      </span>
                    </div>
                    <div className="bg-elevated h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-success h-full rounded-full"
                        style={{ width: `${b.odenenYuzde}%` }}
                      />
                    </div>
                    <span className="tabular text-muted text-xs">
                      %{b.odenenYuzde} ödendi
                      {b.monthlyPayment && ` · aylık ${miktarBicim(b.monthlyPayment, b.unit)}`}
                      {b.paymentDay && ` · ${ayinGunu(b.paymentDay)}`}
                      {b.kalanAy !== null && ` · ${b.kalanAy} ay kaldı`}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </Bolum>

          <AkisBolumu baslik="Gelirler" tur="gelir" akislar={c.gelirler} />
          <AkisBolumu baslik="Düzenli giderler" tur="gider" akislar={c.giderler} />
          <ButceKarti satirlar={butceOzeti(c.harcamalar, limitler)} />
          <Harcamalar harcamalar={c.harcamalar} />
          <Link
            href="/panel/cuzdan/arsiv"
            className="focus-ring text-muted min-h-11 content-center self-center px-3 text-sm font-medium"
          >
            Arşiv: kapanan borçlar, kaldırılan hesaplar →
          </Link>
          <Link
            href="/panel/cuzdan/transfer"
            className="focus-ring text-muted min-h-11 content-center self-center px-3 text-sm font-medium"
          >
            Hesaplar arası transfer →
          </Link>
        </div>
      </main>
    </>
  );
}

function Satir({ etiket, deger, ton }: { etiket: string; deger: string; ton: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted text-xs">{etiket}</span>
      <span className={cn('tabular font-semibold', ton)}>{paraBicim(deger, 'TRY')}</span>
    </div>
  );
}

function Bolum({
  baslik,
  ekle,
  ekleEtiket,
  children,
}: {
  baslik: string;
  ekle: string;
  ekleEtiket: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-primary text-base font-semibold">{baslik}</h2>
        <Link
          href={ekle}
          aria-label={ekleEtiket}
          className="focus-ring bg-accent/10 text-accent flex size-9 items-center justify-center rounded-full"
        >
          <Plus className="size-5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

function Kalem({
  href,
  baslik,
  alt,
  deger,
  ton = 'text-primary',
}: {
  href: string;
  baslik: string;
  alt: string;
  deger: string;
  ton?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="focus-ring rounded-card border-line bg-surface flex items-center justify-between gap-3 border p-3"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-primary truncate font-medium">{baslik}</span>
          <span className="text-muted truncate text-xs">{alt}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className={cn('tabular text-sm font-semibold', ton)}>{deger}</span>
          <ChevronRight className="text-muted size-4" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

function Bos({ children }: { children: ReactNode }) {
  return (
    <li className="text-muted rounded-card border-line bg-surface border border-dashed p-4 text-center text-sm">
      {children}
    </li>
  );
}

function AkisBolumu({
  baslik,
  tur,
  akislar,
}: {
  baslik: string;
  tur: 'gelir' | 'gider';
  akislar: AkisDto[];
}) {
  return (
    <Bolum
      baslik={baslik}
      ekle={`/panel/cuzdan/yeni?tur=${tur}`}
      ekleEtiket={tur === 'gelir' ? 'Gelir ekle' : 'Gider ekle'}
    >
      {akislar.length === 0 ? (
        <Bos>
          {tur === 'gelir'
            ? 'Maaş, burs, serbest iş — kimden, ne zaman, ne kadar.'
            : 'Kira, abonelik, fatura — kime, ne zaman, ne kadar.'}
        </Bos>
      ) : (
        akislar.map((a) => (
          <Kalem
            key={a.id}
            href={`/panel/cuzdan/akis/${a.id}`}
            baslik={a.name}
            alt={[
              a.counterparty,
              SIKLIK[a.frequency],
              a.frequency === 'MONTHLY' && a.day ? ayinGunu(a.day) : null,
              a.date ? gunAy(a.date) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            deger={miktarBicim(a.amount, a.unit)}
            ton={tur === 'gelir' ? 'text-success' : 'text-danger'}
          />
        ))
      )}
    </Bolum>
  );
}

const DAGILIM_RENK = ['#6d4aff', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6'];

/**
 * VARLIK DAĞILIMI — hesapların TL karşılığına göre tek şerit + açıklama.
 * Oran yalnızca GÖSTERİM (yüzde, tam sayı); tutarlar yine metin ve kayıpsız.
 * Kuru olmayan ya da sıfır/eksi bakiyeli hesap şeride girmez.
 */
function Dagilim({ hesaplar }: { hesaplar: HesapDto[] }) {
  const kalemler = hesaplar
    .map((h) => ({ ad: h.name, tl: h.tl === null ? 0 : Number(h.tl) }))
    .filter((k) => k.tl > 0)
    .sort((a, b) => b.tl - a.tl);
  const toplam = kalemler.reduce((t, k) => t + k.tl, 0);
  if (kalemler.length < 2 || toplam <= 0) return null;

  return (
    <section
      aria-label="Varlık dağılımı"
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <span className="text-muted text-xs font-medium">Varlık dağılımı</span>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {kalemler.map((k, i) => (
          <span
            key={k.ad}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(k.tl / toplam) * 100}%`,
              background: DAGILIM_RENK[i % DAGILIM_RENK.length],
            }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {kalemler.map((k, i) => (
          <li key={k.ad} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: DAGILIM_RENK[i % DAGILIM_RENK.length] }}
            />
            <span className="text-body truncate">{k.ad}</span>
            <span className="tabular text-muted ml-auto">%{Math.round((k.tl / toplam) * 100)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const GUN = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * BU AYIN HARCAMALARI (2026-10-30) — tek seferlik giderler; çoğu "+" düğmesinden
 * gelir. Toplam bu ayın gider hesabına zaten dahil (`aylikGiderTl`).
 */
function Harcamalar({ harcamalar }: { harcamalar: AkisDto[] }) {
  const toplam = harcamalar.reduce((t, h) => t + (h.aylikTl === null ? 0 : Number(h.aylikTl)), 0);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-primary text-base font-semibold">Bu ayın harcamaları</h2>
        {harcamalar.length > 0 && (
          <span className="tabular text-danger text-sm font-semibold">
            {paraBicim(toplam.toFixed(2), 'TRY')}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {harcamalar.length === 0 ? (
          <Bos>Market, yemek, ulaşım… sağ alttaki + ile saniyeler içinde eklenir.</Bos>
        ) : (
          harcamalar.map((h) => (
            <Kalem
              key={h.id}
              href={`/panel/cuzdan/akis/${h.id}`}
              baslik={h.name}
              alt={[h.category, h.date ? GUN.format(new Date(`${h.date}T00:00:00Z`)) : null]
                .filter(Boolean)
                .join(' · ')}
              deger={miktarBicim(h.amount, h.unit)}
              ton="text-danger"
            />
          ))
        )}
      </ul>
    </section>
  );
}
