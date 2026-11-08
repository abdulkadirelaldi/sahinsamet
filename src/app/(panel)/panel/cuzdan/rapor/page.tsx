import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { gunAy } from '@/components/panel/hayat-bicim';
import { paraBicim, tutarYaziBoyu } from '@/components/panel/para-bicim';
import { Topbar } from '@/components/panel/topbar';
import { TrendGrafigi } from '@/components/panel/trend-grafigi';
import { cn } from '@/lib/utils/cn';
import { appToday } from '@/server/services/_shared';
import { degisimYuzdesi, fetchAylikRapor, oncekiAy } from '@/server/services/cuzdan-rapor';

export const metadata: Metadata = {
  title: 'Aylık rapor',
  robots: { index: false, follow: false, nocache: true },
};

const AYLAR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];
const ayMetni = (ay: string) => `${AYLAR[Number(ay.slice(5)) - 1]} ${ay.slice(0, 4)}`;
const KATEGORI_RENK = [
  '#6d4aff',
  '#10b981',
  '#f59e0b',
  '#0ea5e9',
  '#f43f5e',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
];

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** `/panel/cuzdan/rapor` — aylık rapor ve net varlık geçmişi (2026-11-01). */
export default async function CuzdanRaporPage({ searchParams }: SayfaProps) {
  const ham = (await searchParams).ay;
  const buAy = appToday().slice(0, 7);
  const istenen = typeof ham === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(ham) ? ham : buAy;
  const ay = istenen > buAy ? buAy : istenen;

  const { ozet, onceki, alti, netGecmis, kurBayat } = await fetchAylikRapor(ay);
  // Süren ay tam ayla kıyaslanmaz: ayın 5'inde "düşüş" yanıltır.
  const degisim = ay < buAy ? degisimYuzdesi(ozet.harcamaTl, onceki.harcamaTl) : null;
  const enYuksek = Math.max(1, ...alti.map((a) => Number(a.harcamaTl)));
  const sonrakiAy =
    ay < buAy
      ? (() => {
          const [y, m] = ay.split('-').map(Number) as [number, number];
          return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
        })()
      : null;
  const eksi = ozet.kalanTl.startsWith('-');

  return (
    <>
      <Topbar title="Aylık rapor" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <nav aria-label="Ay seçimi" className="flex items-center justify-between">
            <AyDugmesi href={`/panel/cuzdan/rapor?ay=${oncekiAy(ay)}`} etiket="Önceki ay">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </AyDugmesi>
            <h2 className="text-primary text-lg font-semibold">{ayMetni(ay)}</h2>
            {sonrakiAy ? (
              <AyDugmesi href={`/panel/cuzdan/rapor?ay=${sonrakiAy}`} etiket="Sonraki ay">
                <ChevronRight className="size-5" aria-hidden="true" />
              </AyDugmesi>
            ) : (
              <span className="size-10" aria-hidden="true" />
            )}
          </nav>

          <section className="aura aura-para flex flex-col gap-1.5 p-5">
            <span className="ust-etiket">Ay sonunda kalan (tahmini)</span>
            <span className="tabular sayi-buyuk text-[clamp(1.75rem,9vw,2.25rem)] leading-none font-semibold whitespace-nowrap">
              {paraBicim(ozet.kalanTl, 'TRY')}
            </span>
            {eksi && <span className="text-xs opacity-90">Bu ay giderler gelirin üstünde.</span>}
          </section>

          <dl className="grid grid-cols-2 gap-3">
            <Kutu etiket="Gelir" deger={ozet.gelirTl} ton="text-success" />
            <Kutu etiket="Harcama" deger={ozet.harcamaTl} ton="text-danger" />
            <Kutu etiket="Düzenli gider" deger={ozet.duzenliGiderTl} ton="text-primary" />
            <Kutu
              etiket="Borç taksitleri"
              deger={(Number(ozet.borcOdemeTl) + Number(ozet.kalanTaksitTl)).toFixed(2)}
              ton="text-primary"
            />
          </dl>

          <section className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-primary text-base font-semibold">Harcama · son 6 ay</h3>
              {degisim !== null && (
                <span
                  className={cn(
                    'tabular flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                    degisim > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success',
                  )}
                >
                  {degisim > 0 ? (
                    <TrendingUp className="size-3.5" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="size-3.5" aria-hidden="true" />
                  )}
                  geçen aya göre %{Math.abs(degisim)}
                </span>
              )}
            </div>
            <ol className="grid h-32 grid-cols-6 gap-2">
              {alti.map((a) => (
                <li
                  key={a.ay}
                  aria-label={`${ayMetni(a.ay)}: ${paraBicim(a.harcamaTl, 'TRY')}`}
                  className="flex min-w-0 flex-col items-center gap-1.5"
                >
                  <span className="bg-elevated flex w-full flex-1 items-end overflow-hidden rounded-lg">
                    {Number(a.harcamaTl) > 0 && (
                      <span
                        className={cn(
                          'w-full rounded-lg',
                          a.ay === ay ? 'bg-gradient-accent' : 'bg-accent/45',
                        )}
                        style={{
                          height: `${Math.max(6, (Number(a.harcamaTl) / enYuksek) * 100)}%`,
                        }}
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-xs',
                      a.ay === ay ? 'text-primary font-semibold' : 'text-muted',
                    )}
                  >
                    {AYLAR[Number(a.ay.slice(5)) - 1]?.slice(0, 3)}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4">
            <h3 className="text-primary text-base font-semibold">Kategoriler</h3>
            {ozet.kategoriler.length === 0 ? (
              <p className="text-muted text-sm">Bu ay tek seferlik harcama yok.</p>
            ) : (
              <>
                <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
                  {ozet.kategoriler.map((k, i) => (
                    <span
                      key={k.kategori}
                      style={{
                        width: `${k.yuzde}%`,
                        background: KATEGORI_RENK[i % KATEGORI_RENK.length],
                      }}
                    />
                  ))}
                </div>
                <ul className="flex flex-col gap-2">
                  {ozet.kategoriler.map((k, i) => (
                    <li key={k.kategori} className="flex items-center gap-2 text-sm">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: KATEGORI_RENK[i % KATEGORI_RENK.length] }}
                      />
                      <span className="text-body min-w-0 flex-1 truncate">{k.kategori}</span>
                      <span className="tabular text-muted text-xs">%{k.yuzde}</span>
                      <span className="tabular text-primary font-medium">
                        {paraBicim(k.tl, 'TRY')}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {ozet.kalemler.length > 0 && (
            <section className="rounded-card border-line bg-surface flex flex-col gap-1 border p-4">
              <h3 className="text-primary text-base font-semibold">Harcamalar</h3>
              <ul className="divide-line flex flex-col divide-y">
                {ozet.kalemler.map((k) => (
                  <li key={k.id}>
                    <Link
                      href={`/panel/cuzdan/akis/${k.id}`}
                      className="focus-ring flex min-h-11 items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="text-primary truncate font-medium">{k.ad}</span>
                        <span className="text-muted text-xs">
                          {gunAy(k.gun)} · {k.kategori}
                        </span>
                      </span>
                      <span className="tabular text-primary shrink-0 font-medium">
                        {paraBicim(k.tl, 'TRY')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {netGecmis.length === 0 ? (
            <section className="rounded-card border-line bg-surface flex flex-col gap-1 border p-4">
              <h3 className="text-primary text-base font-semibold">Net varlık geçmişi</h3>
              <p className="text-muted text-sm">
                Henüz kayıt yok. Hesap ya da borç eklendiğinde her gün yazılır; kuru bilinmeyen
                kalem varken o gün atlanır.
              </p>
            </section>
          ) : (
            <TrendGrafigi
              baslik="Net varlık"
              birim="₺"
              renk="#6d4aff"
              noktalar={netGecmis.map((n) => ({ gun: n.gun, deger: n.netTl }))}
            />
          )}

          <p className="text-muted px-1 text-xs">
            Tek seferlik kalemler ve yapılan borç ödemeleri gerçek kayıtlardır. Düzenli gelir ve
            giderlerin geçmişi tutulmadığı için bugünkü tutarlarıyla hesaplanır. Dövizli kalemler
            bugünkü kurla çevrilir{kurBayat ? ' (kur güncel olmayabilir)' : ''}.
          </p>
        </div>
      </main>
    </>
  );
}

function Kutu({ etiket, deger, ton }: { etiket: string; deger: string; ton: string }) {
  const metin = paraBicim(deger, 'TRY');
  return (
    <div className="rounded-card border-line bg-surface flex min-w-0 flex-col gap-1 border p-3.5">
      <dt className="text-muted text-xs">{etiket}</dt>
      <dd
        className={cn(
          'tabular font-semibold tracking-tight whitespace-nowrap',
          tutarYaziBoyu(metin, 'text-lg'),
          ton,
        )}
      >
        {metin}
      </dd>
    </div>
  );
}

function AyDugmesi({
  href,
  etiket,
  children,
}: {
  href: string;
  etiket: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={etiket}
      className="focus-ring bg-surface text-body flex size-10 items-center justify-center rounded-full shadow-[var(--golge-kart)]"
    >
      {children}
    </Link>
  );
}
