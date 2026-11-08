'use client';

import { Flame, Heart, Loader2, Target, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Alistirma } from '@/lib/ingilizce/tipler';
import { cn } from '@/lib/utils/cn';
import { ingilizceDersBitirAction } from '@/server/actions/ingilizce';
import type { DersSonucu } from '@/server/services/ingilizce';

import {
  DinleSoru,
  EslestirSoru,
  KonusSoru,
  SecmeliSoru,
  SonucIsareti,
  YazSoru,
  type Cevap,
} from './alistirmalar';
import { HataBildir } from './hata-bildir';
import { Konfeti, Sayac } from './kutlama';
import { Maskot } from './maskot';
import { NotMetni } from './not-metni';

interface Props {
  dersId: string;
  baslik: string;
  ust: string;
  /** Dersin simgesi (emoji). */
  gorsel: string;
  /** Tekrar dersinde yok. */
  not: string | null;
  alistirmalar: readonly Alistirma[];
  geriHref: string;
  sonrakiHref: string | null;
  /** Atlama sınavı: yanlış tekrar sorulmaz, hata hakkı dolunca biter. */
  sinav?: { hataSiniri: number };
}

interface GeriBildirim extends Cevap {
  aciklama?: string;
}

function aciklamasi(a: Alistirma): string | undefined {
  if (a.tur === 'bosluk' || a.tur === 'secmeli') return a.aciklama;
  if (a.tur === 'dinle' || a.tur === 'yaz') return a.aciklama;
  if (a.tur === 'konus') return a.ipucu;
  return undefined;
}

const BIRINCIL =
  'focus-ring bg-accent hover:bg-accent-hover flex h-12 w-full items-center justify-center rounded-full font-semibold text-white transition-colors disabled:opacity-50';

/**
 * Ders oynatıcısı (2026-11-06). Duolingo gibi: yanlış soru sıranın sonuna eklenir ve
 * doğru bilinene kadar döner; ilerleme çubuğu doğru bilinen soru sayısıdır. Sonuç
 * sunucuya yalnızca kimliklerle gider, XP orada hesaplanır.
 */
export function DersOynatici({
  dersId,
  baslik,
  ust,
  gorsel,
  not,
  alistirmalar,
  geriHref,
  sonrakiHref,
  sinav,
}: Props) {
  const router = useRouter();
  const [asama, setAsama] = useState<'not' | 'soru' | 'bitti'>(not ? 'not' : 'soru');
  const [kuyruk, setKuyruk] = useState<Alistirma[]>(() => [...alistirmalar]);
  const [sira, setSira] = useState(0);
  const [deneme, setDeneme] = useState(0);
  const [geri, setGeri] = useState<GeriBildirim | null>(null);
  const [bilinen, setBilinen] = useState<Set<string>>(() => new Set());
  const [hatalar, setHatalar] = useState<Set<string>>(() => new Set());
  const [ilkDogru, setIlkDogru] = useState<Set<string>>(() => new Set());
  /** Üst üste doğru sayısı: 3 ve katlarında geri bildirimde kutlanır. */
  const [ustUste, setUstUste] = useState(0);
  const [kayit, setKayit] = useState<
    { durum: 'bekliyor' } | { durum: 'tamam'; sonuc: DersSonucu } | { durum: 'hata'; mesaj: string }
  >({ durum: 'bekliyor' });

  const toplam = useMemo(() => new Set(alistirmalar.map((a) => a.id)).size, [alistirmalar]);
  const simdiki = kuyruk[sira];

  const cevapla = (c: Cevap) => {
    if (!simdiki || geri) return;
    const id = simdiki.id;
    setUstUste((n) => (c.dogru ? n + 1 : 0));
    if (c.dogru) {
      if (!hatalar.has(id)) setIlkDogru((s) => new Set(s).add(id));
      setBilinen((s) => new Set(s).add(id));
    } else {
      setHatalar((s) => new Set(s).add(id));
      if (c.tekrarla === false) setBilinen((s) => new Set(s).add(id));
    }
    setGeri({ ...c, aciklama: aciklamasi(simdiki) });
  };

  const devam = () => {
    if (!simdiki || !geri) return;
    let yeniKuyruk = kuyruk;
    // Sınavda hata hakkı dolunca kalan sorular sorulmaz.
    if (sinav && hatalar.size > sinav.hataSiniri) {
      setGeri(null);
      setAsama('bitti');
      return;
    }
    if (!geri.dogru && geri.tekrarla !== false && !sinav) {
      yeniKuyruk = [...kuyruk, simdiki];
      setKuyruk(yeniKuyruk);
    }
    setGeri(null);
    setDeneme((d) => d + 1);
    if (sira + 1 >= yeniKuyruk.length) setAsama('bitti');
    else setSira(sira + 1);
  };

  /** Konuşma atlanırsa dersin geri kalan konuşma soruları da çıkar; sayılmaz. */
  const konusmayiAtla = () => {
    const kalan = kuyruk.filter((a, i) => i <= sira || a.tur !== 'konus');
    const atlanan = new Set(kuyruk.filter((a) => a.tur === 'konus').map((a) => a.id));
    setBilinen((s) => new Set([...s, ...atlanan]));
    const yeni = kalan.filter((_, i) => i !== sira);
    setKuyruk(yeni);
    setDeneme((d) => d + 1);
    if (sira >= yeni.length) setAsama('bitti');
  };

  const kaydet = useCallback(async () => {
    setKayit({ durum: 'bekliyor' });
    try {
      const sonuc = await ingilizceDersBitirAction({
        dersId,
        hatalar: [...hatalar],
        dogrular: [...ilkDogru],
      });
      if (sonuc.ok) {
        setKayit({ durum: 'tamam', sonuc: sonuc.data });
        router.refresh();
      } else setKayit({ durum: 'hata', mesaj: sonuc.error.message });
    } catch {
      setKayit({ durum: 'hata', mesaj: 'Bağlantı kurulamadı. İnternet gelince yeniden dene.' });
    }
  }, [dersId, hatalar, ilkDogru, router]);

  useEffect(() => {
    if (asama === 'bitti') void kaydet();
    // Yalnızca bitişte bir kez.
  }, [asama]);

  // Her yeni adım sayfanın başından: uzun ders notundan sonra ilk soru yukarıdan kesik kalıyordu.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [asama, deneme]);

  useEffect(() => {
    if (!geri) return;
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        devam();
      }
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  });

  if (asama === 'not' && not) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <div className="flex items-center gap-3">
          <span
            className="bg-accent/12 ing-suzul flex size-16 shrink-0 items-center justify-center rounded-3xl text-4xl"
            aria-hidden="true"
          >
            {gorsel}
          </span>
          <div className="min-w-0 flex-1">
            <p className="ust-etiket">{ust}</p>
            <h1 className="text-primary text-xl font-semibold tracking-tight">{baslik}</h1>
          </div>
          <Maskot boyut={52} className="shrink-0" />
        </div>
        <article className="rounded-card border-line bg-surface border p-5">
          <NotMetni metin={not} />
        </article>
        <button type="button" onClick={() => setAsama('soru')} className={BIRINCIL}>
          Derse başla · {toplam} soru
        </button>
        <Link href={geriHref} className="text-muted text-center text-sm">
          Sonra
        </Link>
      </div>
    );
  }

  if (asama === 'bitti') {
    const dogruluk = toplam === 0 ? 100 : Math.round((ilkDogru.size / toplam) * 100);
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 pt-6 text-center">
        {kayit.durum === 'tamam' && kayit.sonuc.atla?.gecti !== false && <Konfeti />}
        <Maskot
          hal={
            kayit.durum === 'hata' || (kayit.durum === 'tamam' && kayit.sonuc.atla?.gecti === false)
              ? 'uzgun'
              : 'kutlama'
          }
          boyut={104}
        />
        <h1 className="text-primary text-2xl font-semibold tracking-tight">
          {!sinav
            ? 'Ders bitti!'
            : kayit.durum === 'tamam' && kayit.sonuc.atla?.gecti
              ? 'Sınavı geçtin!'
              : kayit.durum === 'tamam'
                ? 'Bu sefer olmadı'
                : 'Sınav bitti'}
        </h1>
        {kayit.durum === 'tamam' && (
          <p className="text-muted -mt-3 text-sm">
            {kayit.sonuc.atla
              ? kayit.sonuc.atla.gecti
                ? kayit.sonuc.atla.acilan > 0
                  ? `${kayit.sonuc.atla.acilan} ders açıldı; sıradaki üniteden devam edebilirsin.`
                  : 'Bu üniteye kadar her şey zaten açıktı.'
                : `${hatalar.size} hata yaptın (en fazla ${sinav?.hataSiniri ?? 0}). Dersleri sırayla yapabilir ya da yarın farklı sorularla yeniden deneyebilirsin.`
              : hatalar.size === 0
                ? 'Hatasız! Kusursuz bir ders 🏆'
                : 'Yanlışların tekrar listene eklendi.'}
          </p>
        )}
        {kayit.durum === 'bekliyor' && (
          <Loader2 className="text-muted size-6 animate-spin" aria-label="Kaydediliyor" />
        )}
        {kayit.durum === 'hata' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-danger text-sm">{kayit.mesaj}</p>
            <button type="button" onClick={() => void kaydet()} className={cn(BIRINCIL, 'w-48')}>
              Yeniden kaydet
            </button>
          </div>
        )}
        {kayit.durum === 'tamam' && (
          <>
            <div className="grid w-full grid-cols-3 gap-2">
              <Kutu
                ikon={<Zap className="size-4" />}
                renk="text-amber-500"
                etiket="XP"
                deger={<Sayac hedef={kayit.sonuc.xp} onEk="+" />}
              />
              <Kutu
                ikon={<Target className="size-4" />}
                renk="text-emerald-500"
                etiket="Doğruluk"
                deger={`%${dogruluk}`}
              />
              <Kutu
                ikon={<Flame className="size-4" />}
                renk="text-orange-500"
                etiket="Seri"
                deger={`${kayit.sonuc.seri} gün`}
              />
            </div>
            <div className="w-full">
              <div className="text-muted mb-1 flex justify-between text-xs">
                <span>Günlük hedef</span>
                <span className="tabular">
                  {kayit.sonuc.bugunXp} / {kayit.sonuc.hedefXp} XP
                </span>
              </div>
              <div className="bg-elevated h-2.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  style={{
                    width: `${Math.min(100, (kayit.sonuc.bugunXp / kayit.sonuc.hedefXp) * 100)}%`,
                  }}
                />
              </div>
              {kayit.sonuc.bugunXp >= kayit.sonuc.hedefXp && (
                <p className="text-success mt-2 text-sm font-medium">Bugünün hedefi tamam 🎯</p>
              )}
            </div>
            <div className="flex w-full flex-col gap-2">
              {sonrakiHref && (
                <Link href={sonrakiHref} className={BIRINCIL}>
                  Sonraki ders
                </Link>
              )}
              <Link
                href={geriHref}
                className="focus-ring text-primary border-line flex h-12 items-center justify-center rounded-full border font-medium"
              >
                Parkura dön
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!simdiki) return null;
  // Sınavda yanlış soru geri gelmediği için ilerleme cevaplanan soru sayısıdır.
  const ilerleme = Math.round(
    ((sinav ? sira + (geri ? 1 : 0) : bilinen.size) / Math.max(1, toplam)) * 100,
  );
  const ortak = { kilitli: geri !== null, onCevap: cevapla };
  const anahtar = `${simdiki.id}-${deneme}`;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-72">
      <div className="flex items-center gap-3">
        <Link
          href={geriHref}
          aria-label="Dersten çık"
          className="focus-ring text-muted -m-1 rounded p-1"
        >
          <X className="size-6" aria-hidden="true" />
        </Link>
        <div
          className="bg-elevated h-3 flex-1 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={ilerleme}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Ders ilerlemesi"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-[width] duration-500"
            style={{ width: `${ilerleme}%` }}
          />
        </div>
        {sinav ? (
          <span
            className="flex items-center gap-0.5"
            aria-label={`Kalan hata hakkı: ${Math.max(0, sinav.hataSiniri - hatalar.size)}`}
          >
            {Array.from({ length: sinav.hataSiniri + 1 }, (_, i) => (
              <Heart
                key={i}
                aria-hidden="true"
                className={cn(
                  'size-4',
                  i < sinav.hataSiniri + 1 - hatalar.size
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-muted',
                )}
              />
            ))}
          </span>
        ) : (
          hatalar.has(simdiki.id) && (
            <span className="text-warning text-xs font-medium whitespace-nowrap">Tekrar</span>
          )
        )}
      </div>

      <div
        key={`kap-${anahtar}`}
        data-alistirma={simdiki.id}
        className={cn(geri && (geri.dogru ? 'ing-zipla' : 'ing-salla'))}
      >
        {(simdiki.tur === 'bosluk' || simdiki.tur === 'secmeli') && (
          <SecmeliSoru key={anahtar} a={simdiki} {...ortak} />
        )}
        {simdiki.tur === 'dinle' && <DinleSoru key={anahtar} a={simdiki} {...ortak} />}
        {simdiki.tur === 'konus' && (
          <KonusSoru key={anahtar} a={simdiki} {...ortak} onAtla={konusmayiAtla} />
        )}
        {simdiki.tur === 'yaz' && <YazSoru key={anahtar} a={simdiki} {...ortak} />}
        {simdiki.tur === 'eslestir' && <EslestirSoru key={anahtar} a={simdiki} {...ortak} />}
      </div>

      {geri && (
        <div
          role="status"
          className={cn(
            'ing-yuksel fixed inset-x-0 bottom-0 z-[60] border-t px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]',
            geri.dogru
              ? 'border-success/30 bg-[color-mix(in_oklab,var(--success)_14%,var(--bg-base))]'
              : 'border-danger/30 bg-[color-mix(in_oklab,var(--danger)_14%,var(--bg-base))]',
          )}
        >
          <div className="mx-auto flex max-w-xl flex-col gap-2">
            <p
              className={cn(
                'flex items-center gap-2 text-lg font-semibold',
                geri.dogru ? 'text-success' : 'text-danger',
              )}
            >
              <Maskot hal={geri.dogru ? 'mutlu' : 'uzgun'} boyut={40} className="shrink-0" />
              <SonucIsareti dogru={geri.dogru} />
              {geri.dogru ? (geri.not ? 'Neredeyse kusursuz' : 'Harika!') : 'Doğru cevap:'}
              {geri.dogru && ustUste >= 3 && (
                <span className="ml-auto rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                  🔥 {ustUste} üst üste
                </span>
              )}
            </p>
            {!geri.dogru && geri.dogruCevap && (
              <p className="text-primary whitespace-pre-line">{geri.dogruCevap}</p>
            )}
            {geri.not && <p className="text-primary text-sm">{geri.not}</p>}
            {geri.aciklama && (
              <p className="text-body max-h-40 overflow-y-auto text-sm leading-relaxed">
                {geri.aciklama}
              </p>
            )}
            <HataBildir key={simdiki.id} alistirmaId={simdiki.id} dersId={dersId} />
            <button
              type="button"
              autoFocus
              onClick={devam}
              className={cn(
                BIRINCIL,
                geri.dogru
                  ? 'bg-success hover:bg-success text-white'
                  : 'bg-danger hover:bg-danger text-white',
              )}
            >
              Devam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Kutu({
  ikon,
  renk,
  etiket,
  deger,
}: {
  ikon: React.ReactNode;
  renk: string;
  etiket: string;
  deger: React.ReactNode;
}) {
  return (
    <div className="rounded-card border-line bg-surface flex flex-col items-center gap-1 border p-3">
      <span className={cn('flex items-center gap-1 text-xs font-medium', renk)}>
        {ikon}
        {etiket}
      </span>
      <span className="tabular text-primary text-xl font-semibold">{deger}</span>
    </div>
  );
}
