'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type FormEvent } from 'react';

import { HAFTA_GUNLERI_KISA } from '@/components/panel/hayat-bicim';
import { YeniHareket } from '@/components/panel/yeni-hareket';
import { cn } from '@/lib/utils/cn';
import {
  addProgramHareketAction,
  archiveProgramGunAction,
  createProgramGunAction,
  moveProgramHareketAction,
  removeProgramHareketAction,
  updateProgramGunAction,
  updateProgramHareketAction,
} from '@/server/actions/antrenman-program';
import type { ProgramGunDuzenDto } from '@/server/services/antrenman-program';
import type { ApiResponse } from '@/types';

const ALAN =
  'focus-ring rounded-input border-line-strong bg-elevated text-primary placeholder:text-muted h-11 w-full min-w-0 border px-3 text-sm';
const BAGLANTI = 'Bağlantı kurulamadı. Yeniden dene.';

/** Eylemi çalıştırır; hata kullanıcıya, başarı `sonra`ya. */
function useEylem() {
  const router = useRouter();
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  const calistir = <T,>(eylem: () => Promise<ApiResponse<T>>, sonra?: (veri: T) => void) => {
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await eylem();
        if (!sonuc.ok) {
          // Alan hatası genel mesajdan daha açıklayıcıdır: "En az 1 set."
          return setHata(Object.values(sonuc.error.fields ?? {})[0] ?? sonuc.error.message);
        }
        if (sonra) sonra(sonuc.data);
        else router.refresh();
      } catch {
        setHata(BAGLANTI);
      }
    });
  };
  return { hata, setHata, bekliyor, calistir, router };
}

function Hata({ metin }: { metin: string | null }) {
  return metin ? (
    <p role="alert" className="text-danger text-sm">
      {metin}
    </p>
  ) : null;
}

/** Program gününün adı, odağı ve haftanın günü; `gun` yoksa yeni gün. */
export function ProgramGunFormu({ gun }: { gun?: ProgramGunDuzenDto }) {
  const { hata, setHata, bekliyor, calistir, router } = useEylem();
  const [ad, setAd] = useState(gun?.name ?? '');
  const [odak, setOdak] = useState(gun?.focus ?? '');
  const [hafta, setHafta] = useState(gun?.weekday ? String(gun.weekday) : '');
  const [silOnay, setSilOnay] = useState(false);

  useEffect(() => {
    if (!silOnay) return;
    const t = setTimeout(() => setSilOnay(false), 5000);
    return () => clearTimeout(t);
  }, [silOnay]);

  const kaydet = (o: FormEvent) => {
    o.preventDefault();
    if (!ad.trim()) return setHata('Gün adı zorunludur.');
    const girdi = { name: ad, focus: odak.trim() || null, weekday: hafta ? Number(hafta) : null };
    if (gun) calistir(() => updateProgramGunAction({ id: gun.id, ...girdi }));
    else
      calistir(
        () => createProgramGunAction(girdi),
        (v) => router.push(`/panel/spor/program/${v.id}`),
      );
  };

  return (
    <form
      onSubmit={kaydet}
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <label className="text-muted flex flex-col gap-1 text-xs">
        Gün adı
        <input
          value={ad}
          onChange={(o) => setAd(o.target.value)}
          maxLength={80}
          required
          placeholder="İtiş (Push)"
          className={ALAN}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
          Odak
          <input
            value={odak}
            onChange={(o) => setOdak(o.target.value)}
            maxLength={120}
            placeholder="Göğüs / Omuz"
            className={ALAN}
          />
        </label>
        <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
          Haftanın günü
          <select value={hafta} onChange={(o) => setHafta(o.target.value)} className={ALAN}>
            <option value="">Serbest</option>
            {HAFTA_GUNLERI_KISA.map((g, i) => (
              <option key={g} value={i + 1}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Hata metin={hata} />
      <button
        type="submit"
        disabled={bekliyor}
        className="focus-ring bg-accent min-h-11 rounded-full text-sm font-semibold text-white disabled:opacity-60"
      >
        {gun ? 'Günü kaydet' : 'Günü oluştur'}
      </button>
      {gun && (
        <button
          type="button"
          disabled={bekliyor}
          onClick={() => {
            if (!silOnay) return setSilOnay(true);
            calistir(
              () => archiveProgramGunAction({ id: gun.id }),
              () => router.push('/panel/spor/program'),
            );
          }}
          className={cn(
            'focus-ring min-h-11 rounded-full border px-4 text-sm font-medium',
            silOnay ? 'border-danger bg-danger text-white' : 'border-line text-danger',
          )}
        >
          {silOnay ? 'Emin misin? Geçmiş antrenmanlar kalır' : 'Günü programdan çıkar'}
        </button>
      )}
    </form>
  );
}

const sayiOku = (metin: string) => Number(metin.replace(/\D/g, '') || 0);

/** Set, tekrar ve dinlenme alanları: satırda ve yeni harekette ortak. */
function HareketAlanlari({
  sets,
  reps,
  rest,
  setSets,
  setReps,
  setRest,
  ad,
}: {
  sets: string;
  reps: string;
  rest: string;
  setSets: (v: string) => void;
  setReps: (v: string) => void;
  setRest: (v: string) => void;
  ad: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
        Set
        <input
          aria-label={`${ad}: set`}
          inputMode="numeric"
          value={sets}
          onChange={(o) => setSets(o.target.value)}
          className={cn(ALAN, 'tabular')}
        />
      </label>
      <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
        Tekrar
        <input
          aria-label={`${ad}: tekrar`}
          value={reps}
          onChange={(o) => setReps(o.target.value)}
          maxLength={40}
          placeholder="8-12"
          className={cn(ALAN, 'tabular')}
        />
      </label>
      <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
        Dinlenme (sn)
        <input
          aria-label={`${ad}: dinlenme`}
          inputMode="numeric"
          value={rest}
          onChange={(o) => setRest(o.target.value)}
          className={cn(ALAN, 'tabular')}
        />
      </label>
    </div>
  );
}

function HareketSatiri({
  hareket,
  ilk,
  son,
}: {
  hareket: ProgramGunDuzenDto['hareketler'][number];
  ilk: boolean;
  son: boolean;
}) {
  const { hata, bekliyor, calistir } = useEylem();
  const [sets, setSets] = useState(String(hareket.sets));
  const [reps, setReps] = useState(hareket.reps);
  const [rest, setRest] = useState(String(hareket.restSec));
  const [silOnay, setSilOnay] = useState(false);
  const degisti =
    sets !== String(hareket.sets) || reps !== hareket.reps || rest !== String(hareket.restSec);

  useEffect(() => {
    if (!silOnay) return;
    const t = setTimeout(() => setSilOnay(false), 5000);
    return () => clearTimeout(t);
  }, [silOnay]);

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-1">
        <span className="text-primary min-w-0 flex-1 truncate text-sm font-medium">
          {hareket.ad}
        </span>
        <button
          type="button"
          disabled={bekliyor || ilk}
          aria-label={`${hareket.ad}: yukarı`}
          onClick={() =>
            calistir(() => moveProgramHareketAction({ id: hareket.id, yon: 'yukari' }))
          }
          className="focus-ring text-body flex size-10 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={bekliyor || son}
          aria-label={`${hareket.ad}: aşağı`}
          onClick={() => calistir(() => moveProgramHareketAction({ id: hareket.id, yon: 'asagi' }))}
          className="focus-ring text-body flex size-10 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ArrowDown className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={bekliyor}
          aria-label={
            silOnay ? `${hareket.ad}: çıkarmak için tekrar dokun` : `${hareket.ad}: çıkar`
          }
          onClick={() => {
            if (!silOnay) return setSilOnay(true);
            calistir(() => removeProgramHareketAction({ id: hareket.id }));
          }}
          className={cn(
            'focus-ring flex size-10 items-center justify-center rounded-full',
            silOnay ? 'bg-danger text-white' : 'text-danger',
          )}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
      <HareketAlanlari
        ad={hareket.ad}
        sets={sets}
        reps={reps}
        rest={rest}
        setSets={setSets}
        setReps={setReps}
        setRest={setRest}
      />
      {degisti && (
        <button
          type="button"
          disabled={bekliyor}
          onClick={() =>
            calistir(() =>
              updateProgramHareketAction({
                id: hareket.id,
                sets: sayiOku(sets),
                reps,
                restSec: sayiOku(rest),
              }),
            )
          }
          className="focus-ring bg-accent min-h-10 self-start rounded-full px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          Kaydet
        </button>
      )}
      <Hata metin={hata} />
    </li>
  );
}

/** Günün hareketleri: listeleme, sıralama, çıkarma ve yeni hareket. */
export function ProgramHareketleri({
  gun,
  egzersizler,
}: {
  gun: ProgramGunDuzenDto;
  egzersizler: { id: string; name: string }[];
}) {
  const { hata, setHata, bekliyor, calistir, router } = useEylem();
  const [secili, setSecili] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('8-12');
  const [rest, setRest] = useState('90');
  /* Seçiciden yeni açılan hareketler: sunucu listesi yenilenene kadar seçenekte dursun. */
  const [eklenenler, setEklenenler] = useState<{ id: string; name: string }[]>([]);
  const programda = new Set(gun.hareketler.map((h) => h.exerciseId));
  const secenekler = [
    ...egzersizler,
    ...eklenenler.filter((e) => !egzersizler.some((x) => x.id === e.id)),
  ];

  const ekle = (o: FormEvent) => {
    o.preventDefault();
    if (!secili) return setHata('Hareket seç.');
    calistir(
      () =>
        addProgramHareketAction({
          dayId: gun.id,
          exerciseId: secili,
          sets: sayiOku(sets),
          reps,
          restSec: sayiOku(rest),
        }),
      // Seçim yalnızca BAŞARIDA temizlenir: hata olursa kullanıcı yeniden seçmek zorunda kalmasın.
      () => {
        setSecili('');
        router.refresh();
      },
    );
  };

  return (
    <section className="rounded-card border-line bg-surface flex flex-col gap-2 border p-4">
      <h2 className="text-primary text-base font-semibold">Hareketler</h2>
      {gun.hareketler.length === 0 ? (
        <p className="text-muted text-sm">Henüz hareket yok. Aşağıdan ekleyin.</p>
      ) : (
        <ol className="divide-line flex flex-col divide-y">
          {gun.hareketler.map((h, i) => (
            <HareketSatiri
              key={h.id}
              hareket={h}
              ilk={i === 0}
              son={i === gun.hareketler.length - 1}
            />
          ))}
        </ol>
      )}

      <form onSubmit={ekle} className="border-line mt-2 flex flex-col gap-3 border-t pt-4">
        <label className="text-muted flex flex-col gap-1 text-xs">
          Hareket ekle
          <select value={secili} onChange={(o) => setSecili(o.target.value)} className={ALAN}>
            <option value="">Seç…</option>
            {secenekler
              .filter((e) => !programda.has(e.id))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
        </label>
        <YeniHareket
          eklendi={(e) => {
            setEklenenler((l) => [...l, { id: e.id, name: e.name }]);
            setSecili(e.id);
            setHata(null);
          }}
        />
        <HareketAlanlari
          ad="Yeni hareket"
          sets={sets}
          reps={reps}
          rest={rest}
          setSets={setSets}
          setReps={setReps}
          setRest={setRest}
        />
        <Hata metin={hata} />
        <button
          type="submit"
          disabled={bekliyor}
          className="focus-ring border-line text-body min-h-11 rounded-full border text-sm font-medium disabled:opacity-60"
        >
          Programa ekle
        </button>
      </form>
    </section>
  );
}
