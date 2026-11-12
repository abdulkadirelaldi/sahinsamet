'use client';

import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type FormEvent } from 'react';

import { HatirlatmaSecici } from '@/components/panel/takvim/hatirlatma-secici';
import { SPOR_SURE_DK } from '@/lib/schemas/takvim';
import { GUN_ADLARI, GUN_KISA, gunAyMetni } from '@/lib/takvim/bicim';
import { hatirlatmaEtiketi, sureMetni, varsayilanHatirlatmalar } from '@/lib/takvim/hatirlatma';
import { sporPlanOzeti } from '@/lib/takvim/spor';
import { cn } from '@/lib/utils/cn';
import { sporTakvimKaldirAction, sporTakvimKaydetAction } from '@/server/actions/takvim';
import type { AppDay } from '@/server/services/_shared/app-date';
import type { SporTakvimPlani } from '@/server/services/takvim';

/**
 * PROGRAM GÜNÜNÜ TAKVİME EKLE (2026-11-12). Program günü (ör. "İtiş") seçilen hafta günlerinde,
 * aynı saatte, haftalık tekrarlanan bir Spor etkinliği olur; takvimdeki etkinlikten
 * "Antrenmana başla" o günün oturumunu açar. Mevcut plan burada görünür, düzenlenir, kaldırılır.
 *
 * Aynı gün ikinci kez eklenmek istenirse sunucu CONFLICT döner (sessiz çift yok); ekran
 * mevcut planı düzenlemeyi önerir.
 */

const ALAN =
  'focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full min-w-0 border px-3 text-sm';
const SURELER = [45, 60, 75, 90, 120] as const;

export function SporTakvimi({
  dayId,
  gunAdi,
  haftaGunu,
  planlar,
  bugun,
}: {
  dayId: string;
  gunAdi: string;
  /** Program gününün kayıtlı haftanın günü — yeni planda ön seçili. */
  haftaGunu: number | null;
  planlar: SporTakvimPlani[];
  bugun: AppDay;
}) {
  const router = useRouter();
  /* `null`: form kapalı · `'yeni'` · plan kimliği: o planı düzenle. */
  const [acik, setAcik] = useState<string | null>(null);
  const duzenlenen = planlar.find((p) => p.id === acik);

  return (
    <section
      id="takvim"
      aria-labelledby="spor-takvim-baslik"
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="spor-takvim-baslik" className="text-primary text-base font-semibold">
          Takvim
        </h2>
        <Link href="/panel/takvim?gorunum=hafta" className="text-accent text-sm font-medium">
          Takvimi aç →
        </Link>
      </div>

      {planlar.length === 0 && acik === null && (
        <p className="text-muted text-sm">
          {gunAdi} henüz takvimde değil. Ekle: seçtiğin günlerde hatırlatma gelir, takvimden tek
          dokunuşla antrenmana başlarsın.
        </p>
      )}

      {planlar.length > 0 && (
        <ul className="flex flex-col gap-2">
          {planlar.map((p) => (
            <PlanSatiri
              key={p.id}
              plan={p}
              duzenle={() => setAcik(p.id)}
              kaldirildi={() => {
                if (acik === p.id) setAcik(null);
                router.refresh();
              }}
            />
          ))}
        </ul>
      )}

      {acik === null ? (
        <button
          type="button"
          onClick={() => setAcik('yeni')}
          className="focus-ring border-line text-body flex min-h-11 items-center justify-center gap-2 rounded-full border text-sm font-medium"
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
          Takvime ekle
        </button>
      ) : (
        <PlanFormu
          key={acik}
          dayId={dayId}
          plan={duzenlenen}
          varsayilanGunler={haftaGunu ? [haftaGunu] : []}
          bugun={bugun}
          mevcuduDuzenle={(id) => setAcik(id)}
          kapat={() => setAcik(null)}
          kaydedildi={() => {
            setAcik(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

function PlanSatiri({
  plan,
  duzenle,
  kaldirildi,
}: {
  plan: SporTakvimPlani;
  duzenle: () => void;
  kaldirildi: () => void;
}) {
  const [onay, setOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  useEffect(() => {
    if (!onay) return;
    const t = setTimeout(() => setOnay(false), 5000);
    return () => clearTimeout(t);
  }, [onay]);

  return (
    <li className="bg-elevated flex flex-col gap-2 rounded-xl p-3">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-primary text-sm font-medium">{sporPlanOzeti(plan)}</span>
          <span className="text-muted text-xs">
            {plan.bitisGun
              ? `${gunAyMetni(plan.bitisGun)} ${plan.bitisGun.slice(0, 4)} tarihine kadar`
              : 'Bitiş yok'}{' '}
            ·{' '}
            {plan.hatirlatmalar.length === 0
              ? 'hatırlatma yok'
              : plan.hatirlatmalar.map((dk) => hatirlatmaEtiketi(dk, false)).join(', ')}
          </span>
        </div>
        <button
          type="button"
          onClick={duzenle}
          aria-label="Planı düzenle"
          className="focus-ring text-body flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={bekliyor}
          aria-label={onay ? 'Kaldırmak için tekrar dokun' : 'Takvimden kaldır'}
          onClick={() => {
            if (!onay) return setOnay(true);
            setHata(null);
            basla(async () => {
              try {
                const sonuc = await sporTakvimKaldirAction({ id: plan.id });
                if (!sonuc.ok) return setHata(sonuc.error.message);
                kaldirildi();
              } catch {
                setHata('Bağlantı kurulamadı. Yeniden dene.');
              }
            });
          }}
          className={cn(
            'focus-ring flex size-10 shrink-0 items-center justify-center rounded-full',
            onay ? 'bg-danger text-white' : 'text-danger',
          )}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}
    </li>
  );
}

function PlanFormu({
  dayId,
  plan,
  varsayilanGunler,
  bugun,
  mevcuduDuzenle,
  kapat,
  kaydedildi,
}: {
  dayId: string;
  plan?: SporTakvimPlani;
  varsayilanGunler: number[];
  bugun: AppDay;
  mevcuduDuzenle: (id: string) => void;
  kapat: () => void;
  kaydedildi: () => void;
}) {
  const [gunler, setGunler] = useState<number[]>(plan?.gunler ?? varsayilanGunler);
  const [saat, setSaat] = useState(plan?.saat ?? '18:00');
  const [sure, setSure] = useState(String(plan?.sureDk ?? SPOR_SURE_DK.varsayilan));
  const [baslangic, setBaslangic] = useState<string>(plan?.baslangicGun ?? bugun);
  const [bitis, setBitis] = useState<string>(plan?.bitisGun ?? '');
  const [hatirlatmalar, setHatirlatmalar] = useState<number[]>(
    plan?.hatirlatmalar ?? varsayilanHatirlatmalar(false),
  );
  const [hata, setHata] = useState<string | null>(null);
  const [mevcutId, setMevcutId] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  const gunuDegistir = (g: number) =>
    setGunler((l) => (l.includes(g) ? l.filter((x) => x !== g) : [...l, g].sort((a, b) => a - b)));

  const gonder = (o: FormEvent) => {
    o.preventDefault();
    if (gunler.length === 0) return setHata('En az bir gün seç.');
    setHata(null);
    setMevcutId(null);
    basla(async () => {
      try {
        const sonuc = await sporTakvimKaydetAction({
          ...(plan ? { id: plan.id } : {}),
          dayId,
          gunler,
          saat,
          sureDk: Number(sure),
          baslangicGun: baslangic,
          bitisGun: bitis || null,
          hatirlatmalar,
        });
        if (!sonuc.ok) {
          setMevcutId(sonuc.error.fields?.mevcutId ?? null);
          const alanlar = Object.entries(sonuc.error.fields ?? {}).filter(
            ([ad]) => ad !== 'mevcutId',
          );
          return setHata(alanlar[0]?.[1] ?? sonuc.error.message);
        }
        kaydedildi();
      } catch {
        setHata('Bağlantı kurulamadı. Yeniden dene.');
      }
    });
  };

  return (
    <form
      onSubmit={gonder}
      noValidate
      aria-label={plan ? 'Takvim planını düzenle' : 'Takvime ekle'}
      className="border-line flex flex-col gap-4 border-t pt-4"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-primary mb-1.5 text-sm font-medium">Günler</legend>
        <div className="grid grid-cols-7 gap-1">
          {GUN_KISA.map((ad, i) => {
            const g = i + 1;
            const secili = gunler.includes(g);
            return (
              <button
                key={ad}
                type="button"
                aria-pressed={secili}
                aria-label={GUN_ADLARI[i]}
                onClick={() => gunuDegistir(g)}
                className={cn(
                  'focus-ring flex h-11 min-w-0 items-center justify-center rounded-full border text-xs font-medium',
                  secili ? 'border-accent bg-accent text-white' : 'border-line text-body',
                )}
              >
                {ad}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
          Başlangıç saati
          <input
            type="time"
            value={saat}
            onChange={(o) => setSaat(o.target.value)}
            className={ALAN}
          />
        </label>
        <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
          Süre
          <select value={sure} onChange={(o) => setSure(o.target.value)} className={ALAN}>
            {[...new Set([...SURELER, Number(sure)])]
              .sort((a, b) => a - b)
              .map((dk) => (
                <option key={dk} value={dk}>
                  {sureMetni(dk)}
                </option>
              ))}
          </select>
        </label>
        <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
          Başlangıç tarihi
          <input
            type="date"
            value={baslangic}
            onChange={(o) => setBaslangic(o.target.value)}
            className={ALAN}
          />
        </label>
        <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
          Bitiş tarihi (isteğe bağlı)
          <input
            type="date"
            value={bitis}
            min={baslangic}
            onChange={(o) => setBitis(o.target.value)}
            className={ALAN}
          />
        </label>
      </div>

      <HatirlatmaSecici tumGun={false} hatirlatmalar={hatirlatmalar} degistir={setHatirlatmalar} />

      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}
      {mevcutId && (
        <button
          type="button"
          onClick={() => mevcuduDuzenle(mevcutId)}
          className="focus-ring border-accent text-accent min-h-11 rounded-full border px-4 text-sm font-medium"
        >
          Mevcut planı düzenle
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={bekliyor}
          className="focus-ring bg-accent min-h-11 flex-1 rounded-full px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {bekliyor ? 'Kaydediliyor…' : plan ? 'Planı kaydet' : 'Takvime ekle'}
        </button>
        <button
          type="button"
          onClick={kapat}
          className="focus-ring text-body min-h-11 rounded-full px-4 text-sm"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
