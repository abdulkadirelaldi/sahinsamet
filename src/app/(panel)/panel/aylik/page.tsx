import { ChevronLeft, ChevronRight, Dumbbell, HeartPulse, Scale, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { GezinmeDugmesi, OzetKarti } from '@/components/panel/ozet-karti';
import { paraBicim } from '@/components/panel/para-bicim';
import { Topbar } from '@/components/panel/topbar';
import { litreBicim } from '@/lib/hedefler';
import { cn } from '@/lib/utils/cn';
import { appToday } from '@/server/services/_shared';
import { ayMetni, fetchAylikOzet } from '@/server/services/aylik-ozet';
import { degisimYuzdesi, oncekiAy } from '@/server/services/cuzdan-rapor';

export const metadata: Metadata = {
  title: 'Aylık özet',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const sayi = (n: number) => n.toLocaleString('tr-TR');
const kgMetni = (deger: string | number) => `${String(Number(deger)).replace('.', ',')} kg`;

function sonrakiAy(ay: string): string {
  const [y, m] = ay.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * `/panel/aylik` — bir ayda ne harcandı, ne yapıldı (2026-11-05). Varsayılan ÖNCEKİ ay:
 * ayın 1'indeki bildirim buraya açılır, süren ay henüz yarım. Gelecek ay ve bozuk değer
 * varsayılana düşer.
 */
export default async function AylikPage({ searchParams }: SayfaProps) {
  const ham = (await searchParams).ay;
  const buAy = appToday().slice(0, 7);
  const istenen = typeof ham === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(ham) ? ham : null;
  const ay = istenen && istenen <= buAy ? istenen : oncekiAy(buAy);

  const o = await fetchAylikOzet(ay);
  const surer = ay === buAy;
  // Süren ay tam ayla kıyaslanmaz: ayın 5'inde "düşüş" yanıltır.
  const harcamaDegisim = surer ? null : degisimYuzdesi(o.para.harcamaTl, o.para.oncekiHarcamaTl);
  const puanFark =
    o.aliskanlik.yuzde !== null && o.aliskanlik.oncekiYuzde !== null
      ? o.aliskanlik.yuzde - o.aliskanlik.oncekiYuzde
      : null;
  const antrenmanFark = o.spor.antrenman - o.spor.oncekiAntrenman;
  const eksi = o.para.kalanTl.startsWith('-');
  const saglikParcalari = [
    o.saglik.ortUyku !== null && `${String(o.saglik.ortUyku).replace('.', ',')} sa uyku`,
    o.saglik.ortAdim !== null && `${sayi(o.saglik.ortAdim)} adım`,
    o.saglik.ortSuMl !== null && `${litreBicim(o.saglik.ortSuMl)} L su`,
  ].filter((p): p is string => typeof p === 'string');

  return (
    <>
      <Topbar title="Aylık özet" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <nav aria-label="Ay seçimi" className="flex items-center justify-between">
            <GezinmeDugmesi href={`/panel/aylik?ay=${oncekiAy(ay)}`} etiket="Önceki ay">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </GezinmeDugmesi>
            <h2 className="text-primary text-lg font-semibold">
              {ayMetni(ay)}
              {surer && <span className="text-muted block text-center text-xs">sürüyor</span>}
            </h2>
            {ay < buAy ? (
              <GezinmeDugmesi href={`/panel/aylik?ay=${sonrakiAy(ay)}`} etiket="Sonraki ay">
                <ChevronRight className="size-5" aria-hidden="true" />
              </GezinmeDugmesi>
            ) : (
              <span className="size-10" aria-hidden="true" />
            )}
          </nav>

          <section className="aura aura-para flex flex-col gap-1.5 p-5">
            <span className="ust-etiket">Harcama</span>
            <span className="tabular sayi-buyuk text-[clamp(1.75rem,9vw,2.25rem)] leading-none font-semibold whitespace-nowrap">
              {paraBicim(o.para.harcamaTl, 'TRY')}
            </span>
            <span className="text-xs opacity-90">
              {harcamaDegisim === null
                ? 'Tek seferlik harcamalar'
                : `Geçen aya göre %${Math.abs(harcamaDegisim)} ${harcamaDegisim > 0 ? 'fazla' : 'az'}`}
            </span>
          </section>

          <section className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4">
            <dl className="grid grid-cols-3 gap-2 text-center">
              <Rakam etiket="Gelir" deger={paraBicim(o.para.gelirTl, 'TRY')} />
              <Rakam
                etiket="Düzenli + borç"
                deger={paraBicim(
                  (Number(o.para.duzenliGiderTl) + Number(o.para.borcOdemeTl)).toFixed(2),
                  'TRY',
                )}
              />
              <Rakam
                etiket="Kalan"
                deger={paraBicim(o.para.kalanTl, 'TRY')}
                ton={eksi ? 'text-danger' : 'text-success'}
              />
            </dl>
            {o.para.kategoriler.length > 0 && (
              <ul className="flex flex-col gap-2">
                {o.para.kategoriler.map((k) => (
                  <li key={k.kategori} className="flex flex-col gap-1">
                    <span className="flex justify-between gap-3 text-sm">
                      <span className="text-body truncate">{k.kategori}</span>
                      <span className="tabular text-primary shrink-0">
                        {paraBicim(k.tl, 'TRY')}
                      </span>
                    </span>
                    <span className="bg-elevated h-1.5 overflow-hidden rounded-full">
                      <span
                        className="bg-gradient-accent block h-full rounded-full"
                        style={{ width: `${Math.max(3, k.yuzde)}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-muted text-xs">
              Düzenli gelir ve giderler bugünkü tutarla tahmin edilir.
              {o.para.kurBayat && ' Döviz kuru güncel değil.'}{' '}
              <Link
                href={`/panel/cuzdan/rapor?ay=${ay}`}
                className="text-accent focus-ring rounded"
              >
                Cüzdan raporu
              </Link>
            </p>
          </section>

          <OzetKarti
            href="/panel/hayat/rapor"
            ikon={<Sparkles className="size-4" aria-hidden="true" />}
            renk="from-violet-500 to-purple-500"
            baslik="Alışkanlık"
            deger={o.aliskanlik.yuzde === null ? '—' : `%${o.aliskanlik.yuzde}`}
            alt={
              puanFark === null ? null : `Geçen aya göre ${puanFark > 0 ? '+' : ''}${puanFark} puan`
            }
          >
            {o.aliskanlik.enCok.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {o.aliskanlik.enCok.map((h) => (
                  <li key={h.ad} className="flex justify-between gap-3">
                    <span className="text-body truncate">{h.ad}</span>
                    <span className="tabular text-muted shrink-0">{h.gun} gün</span>
                  </li>
                ))}
              </ul>
            )}
          </OzetKarti>

          <div className="grid gap-3 sm:grid-cols-3">
            <OzetKarti
              href="/panel/spor/gecmis"
              ikon={<Dumbbell className="size-4" aria-hidden="true" />}
              renk="from-orange-500 to-amber-500"
              baslik="Spor"
              deger={`${o.spor.antrenman} antrenman`}
              alt={
                o.spor.antrenman > 0 || o.spor.oncekiAntrenman > 0
                  ? `${sayi(o.spor.hacimKg)} kg hacim · geçen ay ${o.spor.oncekiAntrenman}${surer || antrenmanFark === 0 ? '' : antrenmanFark > 0 ? ' ↑' : ' ↓'}`
                  : null
              }
            />
            <OzetKarti
              href="/panel/saglik"
              ikon={<Scale className="size-4" aria-hidden="true" />}
              renk="from-rose-500 to-pink-500"
              baslik="Kilo"
              deger={o.saglik.kiloSon ? kgMetni(o.saglik.kiloSon) : '—'}
              alt={
                o.saglik.kiloFark !== null
                  ? `Ay içinde ${Number(o.saglik.kiloFark) > 0 ? '+' : ''}${kgMetni(o.saglik.kiloFark)}`
                  : o.saglik.kiloSon
                    ? null
                    : 'Bu ay tartı yok'
              }
            />
            <OzetKarti
              href="/panel/saglik"
              ikon={<HeartPulse className="size-4" aria-hidden="true" />}
              renk="from-sky-500 to-blue-600"
              baslik="Günlük ortalama"
              deger={saglikParcalari[0] ?? '—'}
              alt={saglikParcalari.length > 1 ? saglikParcalari.slice(1).join(' · ') : null}
            />
          </div>
        </div>
      </main>
    </>
  );
}

function Rakam({ etiket, deger, ton }: { etiket: string; deger: string; ton?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted text-xs">{etiket}</dt>
      <dd className={cn('tabular truncate text-sm font-semibold', ton ?? 'text-primary')}>
        {deger}
      </dd>
    </div>
  );
}
