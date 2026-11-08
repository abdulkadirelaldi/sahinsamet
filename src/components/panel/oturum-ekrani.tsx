'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Minus,
  Plus,
  SkipForward,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { finishSessionAction } from '@/server/actions/antrenman-oturumu';
import {
  createWorkoutSetAction,
  deleteWorkoutSetAction,
  updateWorkoutSetAction,
} from '@/server/actions/workout-set';
import type { MuscleGroup } from '@/types';
import type {
  OturumDto,
  OturumHareketiDto,
  OturumSetiDto,
} from '@/server/services/antrenman-oturumu';
import { cn } from '@/lib/utils/cn';

/** "6-10" → 6, "10-12 / kol" → 10, "15-20 dk" → 15; sayı yoksa 10. */
function ilkSayi(metin: string): number {
  const m = /\d+/.exec(metin);
  return m ? Number(m[0]) : 10;
}

/** Saniye → "1:05" / "12:30" / "1:02:03". */
function sure(saniye: number): string {
  const s = Math.max(0, Math.floor(saniye));
  const sa = Math.floor(s / 3600);
  const dk = Math.floor((s % 3600) / 60);
  const sn = String(s % 60).padStart(2, '0');
  return sa > 0 ? `${sa}:${String(dk).padStart(2, '0')}:${sn}` : `${dk}:${sn}`;
}

/** "40.5" ↔ 40,5 — ekranda virgül, sunucuya nokta (decimalSchema). */
const kgYaz = (kg: string) => String(Number(kg)).replace('.', ',');
const kgOku = (metin: string) => metin.replace(',', '.').trim();

/**
 * CANLI ANTRENMAN OTURUMU (2026-10-30) — telefonda tek elle.
 *
 * Akış: hareket → set gir (tekrar · kg, geçen seferden dolu) → "Set
 * tamamlandı" (sunucuya yazılır, rekor hesabı orada) → dinlenme sayacı →
 * setler bitince sonraki hareket. "Bitir" süreyi ve tahmini kaloriyi yazar.
 *
 * Sayfa kapanıp açılırsa kaldığı yerden: yapılan setler sunucudan geliyor,
 * dinlenme sayacı ise yalnızca ekranda (kaybolması zararsız).
 */
export function OturumEkrani({
  oturum,
  egzersizler,
}: {
  oturum: OturumDto;
  egzersizler: { id: string; name: string; kas: MuscleGroup }[];
}) {
  const router = useRouter();
  const [hareketler, setHareketler] = useState<OturumHareketiDto[]>(oturum.hareketler);
  const ilkEksik = hareketler.findIndex((h) => h.yapilanSetler.length < h.sets);
  const [sira, setSira] = useState(ilkEksik === -1 ? 0 : ilkEksik);
  // Sunucu ve istemci aynı saniyeyi çizmeyebilir: ilk çizim başlangıçtan, saat etkide.
  const [simdi, setSimdi] = useState(() => new Date(oturum.startedAt).getTime());
  const [dinlenmeBitis, setDinlenmeBitis] = useState<number | null>(null);
  const [bitirOnay, setBitirOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [rekor, setRekor] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  useEffect(() => {
    setSimdi(Date.now());
    const t = window.setInterval(() => setSimdi(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Onay yapışkan kalmasın: vazgeçilen dokunuş dakikalar sonra antrenmanı bitirmesin.
  useEffect(() => {
    if (!bitirOnay) return;
    const t = setTimeout(() => setBitirOnay(false), 5000);
    return () => clearTimeout(t);
  }, [bitirOnay]);

  // Set ve dinlenme arasında ekran kapanmasın; destek yoksa sessizce geçilir.
  useEffect(() => {
    let kilit: WakeLockSentinel | null = null;
    const al = () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      navigator.wakeLock
        .request('screen')
        .then((k) => {
          kilit = k;
        })
        .catch(() => undefined);
    };
    al();
    document.addEventListener('visibilitychange', al);
    return () => {
      document.removeEventListener('visibilitychange', al);
      void kilit?.release().catch(() => undefined);
    };
  }, []);

  const hareket = hareketler[sira];
  const gecen = (simdi - new Date(oturum.startedAt).getTime()) / 1000;
  const dinlenmeKalan = dinlenmeBitis === null ? 0 : (dinlenmeBitis - simdi) / 1000;
  const dinleniyor = dinlenmeKalan > 0;
  const toplamSet = hareketler.reduce((t, h) => t + h.sets, 0);
  const yapilanSet = hareketler.reduce((t, h) => t + Math.min(h.yapilanSetler.length, h.sets), 0);
  const hepsiBitti = yapilanSet >= toplamSet && toplamSet > 0;

  if (!hareket) {
    return (
      <p className="text-muted p-6 text-center text-sm">
        Bu programda hareket yok. Spor ekranından başka bir gün seç.
      </p>
    );
  }

  const setEkle = (reps: number, kg: string) => {
    // Silinen setten sonra numara çakışmasın.
    const setNo = Math.max(0, ...hareket.yapilanSetler.map((s) => s.setNo)) + 1;
    setHata(null);
    basla(async () => {
      let sonuc;
      try {
        sonuc = await createWorkoutSetAction({
          workoutId: oturum.id,
          exerciseId: hareket.exerciseId,
          setNo,
          reps,
          ...(kg ? { weightKg: kg } : {}),
        });
      } catch {
        return setHata('Bağlantı kurulamadı. Yeniden dene.');
      }
      // Önceki denemenin yanıtı kaybolmuş, set yazılmış: ekranı sunucudan yeniden kur.
      if (!sonuc.ok && sonuc.error.code === 'CONFLICT') return window.location.reload();
      if (!sonuc.ok) return setHata(sonuc.error.message);
      setRekor(sonuc.data.yeniRekor ? `${hareket.ad} · ${kg} kg × ${reps}` : null);
      const yeni: OturumSetiDto = {
        id: sonuc.data.set.id,
        setNo: sonuc.data.set.setNo,
        reps: sonuc.data.set.reps,
        weightKg: sonuc.data.set.weightKg,
      };
      const guncel = hareketler.map((h, i) =>
        i === sira ? { ...h, yapilanSetler: [...h.yapilanSetler, yeni] } : h,
      );
      setHareketler(guncel);
      const tamam = guncel[sira]!.yapilanSetler.length === hareket.sets;
      if (hareket.restSec > 0) setDinlenmeBitis(Date.now() + hareket.restSec * 1000);
      if (tamam) {
        const sonraki = guncel.findIndex((h, i) => i > sira && h.yapilanSetler.length < h.sets);
        if (sonraki !== -1) setSira(sonraki);
      }
    });
  };

  const setDuzelt = (setId: string, reps: number, kg: string) => {
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await updateWorkoutSetAction({ id: setId, reps, weightKg: kg || null });
        if (!sonuc.ok) return setHata(sonuc.error.message);
        setHareketler((liste) =>
          liste.map((h) => ({
            ...h,
            yapilanSetler: h.yapilanSetler.map((s) =>
              s.id === setId ? { ...s, reps, weightKg: kg || null } : s,
            ),
          })),
        );
      } catch {
        setHata('Bağlantı kurulamadı. Yeniden dene.');
      }
    });
  };

  const setSil = (setId: string) => {
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await deleteWorkoutSetAction({ id: setId });
        if (!sonuc.ok) return setHata(sonuc.error.message);
        setHareketler((liste) =>
          liste.map((h) => ({
            ...h,
            yapilanSetler: h.yapilanSetler.filter((s) => s.id !== setId),
          })),
        );
      } catch {
        setHata('Bağlantı kurulamadı. Yeniden dene.');
      }
    });
  };

  const hareketEkle = (id: string) => {
    const e = egzersizler.find((x) => x.id === id);
    if (!e) return;
    const mevcut = hareketler.findIndex((h) => h.exerciseId === id);
    if (mevcut !== -1) return setSira(mevcut);
    setHareketler([
      ...hareketler,
      {
        id: `ek-${e.id}`,
        exerciseId: e.id,
        ad: e.name,
        ipucu: null,
        kas: e.kas,
        sets: 3,
        reps: e.kas === 'CARDIO' ? '20-30' : '8-12',
        restSec: 90,
        yapilanSetler: [],
        oncekiSet: null,
        oneri: null,
      },
    ]);
    setSira(hareketler.length);
  };

  const bitir = () => {
    if (!hepsiBitti && !bitirOnay) {
      setBitirOnay(true);
      return;
    }
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await finishSessionAction({ id: oturum.id });
        if (!sonuc.ok) return setHata(sonuc.error.message);
        router.refresh();
      } catch {
        setHata('Bağlantı kurulamadı. Antrenman açık duruyor, yeniden dene.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── ÜST: süre ve ilerleme ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="tabular text-primary flex items-center gap-1.5 text-lg font-semibold">
          <Timer className="text-accent size-5" aria-hidden="true" />
          {sure(gecen)}
        </span>
        <span className="tabular text-muted text-sm">
          {yapilanSet} / {toplamSet} set
        </span>
      </div>
      <div className="bg-elevated h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-accent h-full rounded-full transition-[width] duration-500"
          style={{ width: `${toplamSet ? (yapilanSet / toplamSet) * 100 : 0}%` }}
        />
      </div>

      {/* ── HAREKET GEZİNTİSİ ─────────────────────────────────────────── */}
      <nav aria-label="Hareketler" className="-mx-4 overflow-x-auto px-4">
        <ol className="flex min-w-max gap-1.5">
          {hareketler.map((h, i) => {
            const tamam = h.yapilanSetler.length >= h.sets;
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setSira(i)}
                  aria-current={i === sira ? 'step' : undefined}
                  className={cn(
                    'focus-ring flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-medium',
                    i === sira && 'border-accent bg-accent text-white',
                    i !== sira && tamam && 'border-success/50 bg-success/10 text-success',
                    i !== sira && !tamam && 'border-line text-muted',
                  )}
                >
                  {tamam && i !== sira ? (
                    <Check className="size-4" aria-label={`${h.ad} tamam`} />
                  ) : (
                    i + 1
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {dinleniyor ? (
        <Dinlenme
          kalan={dinlenmeKalan}
          toplam={hareket.restSec}
          onAtla={() => setDinlenmeBitis(null)}
        />
      ) : (
        <HareketKarti
          key={`${hareket.id}-${hareket.yapilanSetler.length}`}
          hareket={hareket}
          bekliyor={bekliyor}
          onSet={setEkle}
          onDuzelt={setDuzelt}
          onSil={setSil}
        />
      )}

      {!dinleniyor && (
        <label className="text-muted flex items-center gap-2 text-sm">
          <span className="shrink-0">Hareket ekle</span>
          <select
            value=""
            onChange={(o) => hareketEkle(o.target.value)}
            className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 min-w-0 flex-1 border px-3 text-sm"
          >
            <option value="">Yedek makine, fazladan hareket…</option>
            {egzersizler.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {rekor && (
        <p
          role="status"
          className="rounded-card flex items-center gap-2 bg-amber-500/12 p-3 text-sm font-medium text-amber-700 dark:text-amber-400"
        >
          <span aria-hidden="true">🏆</span> Yeni rekor! {rekor}
        </p>
      )}
      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}

      {/* ── ALT: önceki / sonraki / bitir ─────────────────────────────── */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          type="button"
          onClick={() => setSira((s) => Math.max(0, s - 1))}
          disabled={sira === 0}
          aria-label="Önceki hareket"
          className="focus-ring border-line text-body flex size-12 items-center justify-center rounded-full border disabled:opacity-40"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={bitir}
          disabled={bekliyor}
          className={cn(
            'focus-ring flex h-12 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
            hepsiBitti
              ? 'border-success bg-success text-white'
              : bitirOnay
                ? 'border-danger bg-danger text-white'
                : 'border-line text-body',
          )}
        >
          <Flag className="size-4" aria-hidden="true" />
          {hepsiBitti
            ? 'Antrenmanı bitir'
            : bitirOnay
              ? 'Eksik setlerle bitir — emin misin?'
              : 'Antrenmanı bitir'}
        </button>
        <button
          type="button"
          onClick={() => setSira((s) => Math.min(hareketler.length - 1, s + 1))}
          disabled={sira === hareketler.length - 1}
          aria-label="Sonraki hareket"
          className="focus-ring border-line text-body flex size-12 items-center justify-center rounded-full border disabled:opacity-40"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function HareketKarti({
  hareket,
  bekliyor,
  onSet,
  onDuzelt,
  onSil,
}: {
  hareket: OturumHareketiDto;
  bekliyor: boolean;
  onSet: (reps: number, kg: string) => void;
  onDuzelt: (setId: string, reps: number, kg: string) => void;
  onSil: (setId: string) => void;
}) {
  const kardiyo = hareket.kas === 'CARDIO';
  const son = hareket.yapilanSetler.at(-1) ?? null;
  // Bu oturumda set varsa son set; yoksa çift ilerleme önerisi; o da yoksa geçen set.
  const oneri = son ?? hareket.oneri ?? hareket.oncekiSet;
  const [reps, setReps] = useState(oneri?.reps ?? ilkSayi(hareket.reps));
  const [kg, setKg] = useState(oneri?.weightKg ? kgYaz(oneri.weightKg) : '');
  const [fazladan, setFazladan] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const tamam = hareket.yapilanSetler.length >= hareket.sets && !fazladan;
  // Öneriyle aynı adım: 20 kg altında 1, üstünde 2,5 kg.
  const kgAdim = (yon: 1 | -1) => {
    const mevcut = Number(kgOku(kg) || '0');
    const adim = (yon > 0 ? mevcut >= 20 : mevcut > 20) ? 2.5 : 1;
    const yeni = Math.max(0, Math.round((mevcut + yon * adim) * 10) / 10);
    setKg(yeni === 0 ? '' : kgYaz(String(yeni)));
  };
  const seciliSet = hareket.yapilanSetler.find((s) => s.id === duzenlenen) ?? null;
  const kgGecerli = kg === '' || /^\d{1,4}([.,]\d{1,2})?$/.test(kg.trim());

  const oncekiMetni = useMemo(() => {
    const o = hareket.oncekiSet;
    if (!o) return null;
    return o.weightKg ? `${kgYaz(o.weightKg)} kg × ${o.reps}` : `${o.reps} tekrar`;
  }, [hareket.oncekiSet]);

  return (
    <section className="rounded-card border-line bg-surface flex flex-col gap-4 border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-primary text-xl font-semibold">{hareket.ad}</h2>
        <p className="tabular text-accent text-sm font-medium">
          {hareket.sets} × {hareket.reps}
          {hareket.restSec > 0 && (
            <span className="text-muted"> · {hareket.restSec} sn dinlenme</span>
          )}
        </p>
        {hareket.ipucu && <p className="text-muted text-sm">{hareket.ipucu}</p>}
        {oncekiMetni && <p className="text-body text-xs">Geçen sefer: {oncekiMetni}</p>}
        {hareket.oneri && hareket.yapilanSetler.length === 0 && (
          <p className="bg-accent/10 text-primary mt-1 flex items-start gap-2 rounded-xl px-3 py-2 text-xs">
            <TrendingUp className="text-accent mt-px size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="tabular font-semibold">
                Bugün: {hareket.oneri.weightKg ? `${kgYaz(hareket.oneri.weightKg)} kg × ` : ''}
                {hareket.oneri.reps}
              </span>{' '}
              — {hareket.oneri.neden}
            </span>
          </p>
        )}
      </div>

      {/* Yapılan setler */}
      <ol className="flex flex-wrap gap-1.5">
        {Array.from({ length: Math.max(hareket.sets, hareket.yapilanSetler.length) }, (_, i) => {
          const s = hareket.yapilanSetler[i];
          const metin = s
            ? `${s.weightKg ? `${kgYaz(s.weightKg)}×` : ''}${s.reps}`
            : `Set ${i + 1}`;
          return (
            <li key={s?.id ?? i}>
              {s ? (
                <button
                  type="button"
                  aria-label={`Set ${i + 1}, ${metin}: düzelt`}
                  aria-expanded={duzenlenen === s.id}
                  onClick={() => setDuzenlenen(duzenlenen === s.id ? null : s.id)}
                  className={cn(
                    'focus-ring tabular min-h-10 rounded-lg border px-3 text-sm',
                    duzenlenen === s.id
                      ? 'border-accent bg-accent/12 text-primary'
                      : 'border-success/40 bg-success/10 text-primary',
                  )}
                >
                  {metin}
                </button>
              ) : (
                <span className="border-line text-muted tabular flex min-h-10 items-center rounded-lg border px-3 text-sm">
                  {metin}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {seciliSet && (
        <SetDuzeltici
          key={seciliSet.id}
          set={seciliSet}
          kardiyo={kardiyo}
          bekliyor={bekliyor}
          kapat={() => setDuzenlenen(null)}
          onDuzelt={onDuzelt}
          onSil={onSil}
        />
      )}

      {tamam ? (
        <div className="flex flex-col gap-2">
          <p className="text-success text-sm font-medium">Bu hareket tamam ✓ — sıradakine geç.</p>
          <button
            type="button"
            onClick={() => setFazladan(true)}
            className="focus-ring border-line text-body min-h-11 rounded-full border px-4 text-sm font-medium"
          >
            Fazladan set ekle
          </button>
        </div>
      ) : (
        <>
          <div className={cn('grid gap-3', kardiyo ? 'grid-cols-1' : 'grid-cols-2')}>
            <Sayac
              etiket={kardiyo ? 'Dakika' : 'Tekrar'}
              deger={String(reps)}
              onEksi={() => setReps((r) => Math.max(1, r - 1))}
              onArti={() => setReps((r) => Math.min(1000, r + 1))}
              giris={
                <input
                  inputMode="numeric"
                  value={reps || ''}
                  onChange={(o) =>
                    setReps(Math.min(1000, Number(o.target.value.replace(/\D/g, '')) || 0))
                  }
                  aria-label={kardiyo ? 'Dakika' : 'Tekrar'}
                  className="tabular text-primary w-full bg-transparent text-center text-2xl font-semibold outline-none"
                />
              }
            />
            {!kardiyo && (
              <Sayac
                etiket="Kg"
                deger={kg}
                bos="—"
                onEksi={() => kgAdim(-1)}
                onArti={() => kgAdim(1)}
                giris={
                  <input
                    inputMode="decimal"
                    value={kg}
                    onChange={(o) => setKg(o.target.value)}
                    aria-label="Ağırlık (kg)"
                    placeholder="—"
                    className="tabular text-primary w-full bg-transparent text-center text-2xl font-semibold outline-none"
                  />
                }
              />
            )}
          </div>
          {!kgGecerli && <p className="text-danger text-xs">Ağırlık örn. 40 ya da 42,5 olmalı.</p>}
          <button
            type="button"
            disabled={bekliyor || !kgGecerli || reps < 1}
            onClick={() => onSet(reps, kgOku(kg))}
            className="focus-ring bg-accent hover:bg-accent-hover flex h-14 items-center justify-center gap-2 rounded-full text-base font-semibold text-white transition-[transform,background-color] active:scale-[0.98] disabled:opacity-50"
          >
            <Check className="size-5" aria-hidden="true" />
            {bekliyor ? 'Kaydediliyor…' : `Set ${hareket.yapilanSetler.length + 1} tamamlandı`}
          </button>
        </>
      )}
    </section>
  );
}

/** Yapılan seti düzeltir ya da siler: rekor sunucuda yeniden hesaplanır. */
function SetDuzeltici({
  set,
  kardiyo,
  bekliyor,
  kapat,
  onDuzelt,
  onSil,
}: {
  set: OturumSetiDto;
  kardiyo: boolean;
  bekliyor: boolean;
  kapat: () => void;
  onDuzelt: (setId: string, reps: number, kg: string) => void;
  onSil: (setId: string) => void;
}) {
  const [reps, setReps] = useState(String(set.reps));
  const [kg, setKg] = useState(set.weightKg ? kgYaz(set.weightKg) : '');
  const [silOnay, setSilOnay] = useState(false);
  const gecerli = Number(reps) >= 1 && (kg === '' || /^\d{1,4}([.,]\d{1,2})?$/.test(kg.trim()));
  const ALAN =
    'focus-ring rounded-input border-line-strong bg-elevated text-primary tabular h-11 w-full border px-3';

  return (
    <div className="bg-canvas border-line flex flex-col gap-3 rounded-2xl border p-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-muted flex flex-col gap-1 text-xs">
          {kardiyo ? 'Dakika' : 'Tekrar'}
          <input
            inputMode="numeric"
            value={reps}
            onChange={(o) => setReps(o.target.value.replace(/\D/g, ''))}
            className={ALAN}
          />
        </label>
        {!kardiyo && (
          <label className="text-muted flex flex-col gap-1 text-xs">
            Kg
            <input
              inputMode="decimal"
              value={kg}
              onChange={(o) => setKg(o.target.value)}
              className={ALAN}
            />
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={bekliyor || !gecerli}
          onClick={() => {
            onDuzelt(set.id, Number(reps), kgOku(kg));
            kapat();
          }}
          className="focus-ring bg-accent min-h-11 flex-1 rounded-full text-sm font-semibold text-white disabled:opacity-50"
        >
          Kaydet
        </button>
        <button
          type="button"
          disabled={bekliyor}
          onClick={() => {
            if (!silOnay) return setSilOnay(true);
            onSil(set.id);
            kapat();
          }}
          className={cn(
            'focus-ring min-h-11 rounded-full border px-4 text-sm font-medium',
            silOnay ? 'border-danger bg-danger text-white' : 'border-line text-danger',
          )}
        >
          {silOnay ? 'Emin misin?' : 'Seti sil'}
        </button>
      </div>
    </div>
  );
}

function Sayac({
  etiket,
  deger,
  bos,
  onEksi,
  onArti,
  giris,
}: {
  etiket: string;
  deger: string;
  bos?: string;
  onEksi: () => void;
  onArti: () => void;
  giris?: React.ReactNode;
}) {
  return (
    <div className="border-line bg-canvas flex flex-col gap-1 rounded-2xl border p-2">
      <span className="text-muted text-center text-xs">{etiket}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEksi}
          aria-label={`${etiket} azalt`}
          className="focus-ring bg-elevated flex size-11 shrink-0 items-center justify-center rounded-full active:scale-90"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <div className="flex min-w-0 flex-1 justify-center">
          {giris ?? (
            <span className="tabular text-primary text-2xl font-semibold">{deger || bos}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onArti}
          aria-label={`${etiket} artır`}
          className="focus-ring bg-elevated flex size-11 shrink-0 items-center justify-center rounded-full active:scale-90"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Dinlenme({
  kalan,
  toplam,
  onAtla,
}: {
  kalan: number;
  toplam: number;
  onAtla: () => void;
}) {
  const oran = toplam > 0 ? Math.max(0, Math.min(1, kalan / toplam)) : 0;
  return (
    <section
      aria-live="polite"
      className="rounded-card border-line bg-surface flex flex-col items-center gap-4 border p-6"
    >
      <span className="text-muted text-sm">Dinlen</span>
      <span className="tabular text-primary text-6xl font-semibold">{sure(Math.ceil(kalan))}</span>
      <div className="bg-elevated h-2 w-full overflow-hidden rounded-full">
        <div className="bg-accent h-full rounded-full" style={{ width: `${oran * 100}%` }} />
      </div>
      <button
        type="button"
        onClick={onAtla}
        className="focus-ring border-line text-body flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium"
      >
        <SkipForward className="size-4" aria-hidden="true" />
        Dinlenmeyi atla
      </button>
    </section>
  );
}
