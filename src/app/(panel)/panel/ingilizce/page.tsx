import { Check, FastForward, Flame, Lock, RotateCcw, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { HedefSecici } from '@/components/panel/ingilizce/hedef-secici';
import { Topbar } from '@/components/panel/topbar';
import { dersBul, PARKURLAR, parkurBul } from '@/lib/ingilizce/mufredat';
import { cn } from '@/lib/utils/cn';
import { auth } from '@/server/auth';
import {
  acikMi,
  ATLA_HATA,
  ATLA_SORU,
  atlaKimligi,
  fetchIngilizceDurum,
  tekrarKimligi,
} from '@/server/services/ingilizce';

export const metadata: Metadata = {
  title: 'İngilizce',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const GUN_KISA = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

/** Ders yolu sağa sola kıvrılır (Duolingo gibi); piksel kayma, telefonda da sığar. */
const YOL_KAYMASI = [0, 44, 66, 44, 0, -44, -66, -44];

const UNITE_RENKLERI = [
  'from-teal-500 to-emerald-600',
  'from-sky-500 to-indigo-600',
  'from-violet-500 to-fuchsia-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-emerald-500 to-lime-600',
  'from-indigo-500 to-blue-700',
];

/**
 * `/panel/ingilizce` — üç parkur (günlük, yazılım, sınav), üniteler temelden ileriye
 * (2026-11-06). Ders sırayla açılır; seri, günlük XP hedefi ve zayıf soru tekrarı.
 */
export default async function IngilizcePage({ searchParams }: SayfaProps) {
  const ham = (await searchParams).parkur;
  const parkur = (typeof ham === 'string' && parkurBul(ham)) || PARKURLAR[0]!;
  const session = await auth();
  const d = await fetchIngilizceDurum(session?.user?.id ?? null);
  const tamamlanan = new Set(d.tamamlanan);

  const dersler = parkur.uniteler.flatMap((u) => u.dersler);
  const tekrar = d.tekrar[parkur.id];
  const tekrarSayisi = tekrar.zayif + tekrar.vadesi;
  const hicBaslamadi = !dersler.some((x) => tamamlanan.has(x.id));
  const siradaki = dersler.find((ders) => !tamamlanan.has(ders.id)) ?? null;
  const hedefOran = Math.min(1, d.bugunXp / d.hedefXp);
  const enCokXp = Math.max(d.hedefXp, ...d.hafta.map((h) => h.xp));

  return (
    <>
      <Topbar title="İngilizce" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <section className="aura aura-dil flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="ust-etiket">Seri</span>
                <span className="flex items-center gap-2 text-3xl font-semibold">
                  <Flame
                    className={cn(
                      'size-7',
                      d.bugunYapildi ? 'ing-alev text-orange-400' : 'text-white/40',
                    )}
                    aria-hidden="true"
                  />
                  <span className="tabular">{d.seri}</span>
                  <span className="text-base font-medium opacity-80">gün</span>
                </span>
                <span className="text-xs opacity-85">
                  {d.bugunYapildi
                    ? 'Bugünün dersi tamam.'
                    : d.seri > 0
                      ? 'Seri sürsün: bugün bir ders yap.'
                      : 'İlk dersle seriyi başlat.'}
                </span>
              </div>
              <div className="cam-kutu flex flex-col items-end gap-0.5 px-3 py-2">
                <span className="ust-etiket">Toplam</span>
                <span className="tabular flex items-center gap-1 text-lg font-semibold">
                  <Zap className="size-4 text-amber-300" aria-hidden="true" />
                  {d.toplamXp.toLocaleString('tr-TR')} XP
                </span>
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="opacity-85">Bugün</span>
                <span className="tabular">
                  {d.bugunXp} / {d.hedefXp} XP
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
                  style={{ width: `${hedefOran * 100}%` }}
                />
              </div>
            </div>
            <ol className="grid grid-cols-7 gap-1.5" aria-label="Son 7 gün">
              {d.hafta.map((h) => {
                const tarih = new Date(`${h.gun}T00:00:00Z`);
                return (
                  <li
                    key={h.gun}
                    aria-label={`${h.gun}: ${h.xp} XP`}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="flex h-10 w-full items-end overflow-hidden rounded-md bg-white/10">
                      {h.xp > 0 && (
                        <span
                          className={cn(
                            'w-full rounded-md',
                            h.xp >= d.hedefXp ? 'bg-amber-300' : 'bg-white/55',
                          )}
                          style={{ height: `${Math.max(12, (h.xp / enCokXp) * 100)}%` }}
                        />
                      )}
                    </span>
                    <span className="text-[10px] opacity-75">{GUN_KISA[tarih.getUTCDay()]}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <nav
            aria-label="Parkurlar"
            className="bg-elevated grid grid-cols-3 gap-1 rounded-2xl p-1"
          >
            {PARKURLAR.map((p) => {
              const hepsi = p.uniteler.flatMap((u) => u.dersler);
              const biten = hepsi.filter((x) => tamamlanan.has(x.id)).length;
              const aktif = p.id === parkur.id;
              return (
                <Link
                  key={p.id}
                  href={`/panel/ingilizce?parkur=${p.id}`}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'focus-ring flex flex-col items-center rounded-xl px-2 py-2 text-center transition-colors',
                    aktif ? 'bg-surface text-primary shadow-sm' : 'text-muted',
                  )}
                >
                  <span className="text-sm font-semibold">{p.ad.split(' ')[0]}</span>
                  <span className="tabular text-[11px]">
                    {biten}/{hepsi.length}
                  </span>
                </Link>
              );
            })}
          </nav>

          <p className="text-body text-sm">{parkur.aciklama}</p>
          {hicBaslamadi && (
            <p className="bg-accent/10 text-body rounded-2xl px-4 py-3 text-sm">
              İngilizcen iyiyse baştan başlamak zorunda değilsin: kilitli bir ünitenin{' '}
              <strong className="text-primary">Atla</strong> düğmesiyle {ATLA_SORU} soruluk sınava
              gir, en fazla {ATLA_HATA} hatayla geçersen o üniteye kadar her şey açılır.
            </p>
          )}

          {tekrarSayisi > 0 && (
            <Link
              href={`/panel/ingilizce/ders/${tekrarKimligi(parkur.id)}`}
              className="focus-ring rounded-card border-line bg-surface flex items-center gap-3 border p-4"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <RotateCcw className="size-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-primary text-sm font-semibold">Tekrar zamanı</span>
                <span className="text-muted text-xs">
                  {[
                    tekrar.zayif > 0 && `${tekrar.zayif} yanlış yaptığın`,
                    tekrar.vadesi > 0 && `${tekrar.vadesi} unutmaman gereken`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}{' '}
                  — bu turda en fazla 10 soru
                </span>
              </span>
            </Link>
          )}

          {parkur.uniteler.map((u, ui) => {
            const biten = u.dersler.filter((x) => tamamlanan.has(x.id)).length;
            const renk = UNITE_RENKLERI[ui % UNITE_RENKLERI.length]!;
            // İlk dersi kilitliyse ünite sınavla atlanabilir: geçince buraya kadar her şey açılır.
            const kilitli = !acikMi(dersBul(u.dersler[0]!.id)!, tamamlanan);
            return (
              <section
                key={u.id}
                aria-labelledby={`${u.id}-baslik`}
                className="flex flex-col gap-5"
              >
                <header
                  className={cn(
                    'flex items-center gap-3 rounded-[1.4rem] bg-gradient-to-br p-4 text-white shadow-[var(--golge-kart)]',
                    renk,
                  )}
                >
                  <span
                    className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl"
                    aria-hidden="true"
                  >
                    {u.gorsel}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[11px] font-bold tracking-wider text-white/85 uppercase">
                      {ui + 1}. ünite · {u.seviye}
                    </span>
                    <h2 id={`${u.id}-baslik`} className="font-semibold">
                      {u.baslik}
                    </h2>
                    <p className="text-xs text-white/85">{u.ozet}</p>
                  </div>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="tabular rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                      {biten}/{u.dersler.length}
                    </span>
                    {kilitli && (
                      <Link
                        href={`/panel/ingilizce/ders/${atlaKimligi(u.id)}`}
                        className="focus-ring flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
                      >
                        <FastForward className="size-3.5" aria-hidden="true" />
                        Atla
                      </Link>
                    )}
                  </span>
                </header>
                <ol className="flex flex-col items-center gap-4">
                  {u.dersler.map((ders, di) => {
                    const konum = dersBul(ders.id)!;
                    const bitti = tamamlanan.has(ders.id);
                    const acik = acikMi(konum, tamamlanan);
                    const simdi = siradaki?.id === ders.id;
                    const kayma = YOL_KAYMASI[(di + ui) % YOL_KAYMASI.length]!;
                    const daire = (
                      <span
                        className={cn(
                          'relative isolate flex size-[4.5rem] items-center justify-center rounded-full text-3xl transition-transform',
                          bitti
                            ? 'bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_6px_0_#b45309]'
                            : simdi
                              ? 'bg-accent ing-nabiz shadow-[0_6px_0_var(--accent-hover)]'
                              : acik
                                ? 'bg-accent/70 shadow-[0_6px_0_var(--accent-hover)]'
                                : 'bg-elevated shadow-[0_6px_0_var(--border)] grayscale',
                          acik && 'active:translate-y-1 active:shadow-none',
                        )}
                      >
                        <span aria-hidden="true" className={cn(!acik && 'opacity-40')}>
                          {ders.gorsel}
                        </span>
                        {bitti && (
                          <span className="bg-success absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full text-white ring-2 ring-[var(--bg-base)]">
                            <Check className="size-3.5" aria-hidden="true" />
                          </span>
                        )}
                        {!acik && (
                          <span className="bg-elevated text-muted absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full ring-2 ring-[var(--bg-base)]">
                            <Lock className="size-3" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                    );
                    const icerik = (
                      <>
                        {simdi && (
                          <span className="bg-surface text-accent border-line ing-suzul mb-1 rounded-xl border px-3 py-1 text-xs font-bold tracking-wide shadow-sm">
                            BAŞLA
                          </span>
                        )}
                        {daire}
                        <span
                          className={cn(
                            'mt-2 max-w-40 text-center text-xs leading-tight font-medium',
                            acik ? 'text-primary' : 'text-muted',
                          )}
                        >
                          {ders.baslik}
                        </span>
                      </>
                    );
                    return (
                      <li key={ders.id} style={{ transform: `translateX(${kayma}px)` }}>
                        {acik ? (
                          <Link
                            href={`/panel/ingilizce/ders/${ders.id}`}
                            aria-label={`${ders.baslik}${bitti ? ' — tamamlandı' : simdi ? ' — sıradaki ders' : ''}`}
                            className="focus-ring flex flex-col items-center rounded-2xl p-1"
                          >
                            {icerik}
                          </Link>
                        ) : (
                          <div
                            aria-label={`${ders.baslik} — kilitli`}
                            className="flex flex-col items-center p-1"
                          >
                            {icerik}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
          <HedefSecici hedef={d.hedefXp} />
        </div>
      </main>
    </>
  );
}
