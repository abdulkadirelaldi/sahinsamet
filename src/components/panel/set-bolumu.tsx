'use client';

import { ListPlus, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { DefaultValues } from 'react-hook-form';
import type * as z from 'zod';

import {
  Alan,
  ONDALIK_YA_DA_YOK,
  SAYI_YA_DA_YOK,
  bosaltilanlariNullYap,
} from '@/components/panel/alan';
import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { KAS_GRUBU, olcuBicim } from '@/components/panel/kisisel-etiketler';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { createWorkoutSetSchema } from '@/lib/schemas/workout-set';
import {
  createWorkoutSetAction,
  deleteWorkoutSetAction,
  updateWorkoutSetAction,
} from '@/server/actions/workout-set';
import type { RecalculateResult } from '@/server/services/_shared';
import type { WorkoutSetDto } from '@/server/services/workout';
import type { MuscleGroup } from '@/types';

/**
 * ANTRENMAN SETLERİ — §4.2 `/panel/spor/[id]`, T-114.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HER SET MUTASYONU REKORLARI YENİDEN HESAPLATIYOR — VE EKRAN BUNU SÖYLÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ekleme, düzeltme ve silme aynı işlem içinde rekor hesabını tetikliyor
 * (Karar 1, `actions/workout-set.ts`). Eylem sonucu SAYI olarak dönüyor ve
 * burada `role="status"` ile gösteriliyor. Sessiz yapmamak Karar 3'ün ruhu:
 * son 5'lik setini silen kullanıcı 5RM rekorunun neden kaybolduğunu
 * ekranda okuyabilmeli.
 *
 * ⚠️ `upserted` "YENİ REKOR" DEĞİL: hesap SIFIRDAN yapıldığı için egzersizin
 * o anda GEÇERLİ olan bütün rekorlarını yeniden yazıyor. "1 yeni rekor"
 * demek, rekor kırılmamışken kırılmış gibi göstermek olurdu — metin bu yüzden
 * "yazıldı/güncellendi" diyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ARŞİVLİ EGZERSİZ ↔ DÜZENLENEN SET — `islem-formu.tsx`in KALIBI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Seçenekler sunucudan `isArchived: false` ile geliyor: arşivlenmiş bir hareket
 * YENİ set için seçilemez, yoksa arşivlemenin anlamı kalmaz. Ama arşivli bir
 * harekete ait ESKİ bir set düzenlenirken o hareket listede olmasaydı
 * `<select>` ilk seçeneğe düşer ve KAYDETMEK seti BAŞKA BİR HAREKETE taşırdı —
 * rekoru da yanlış harekete yazarak (servis iki egzersizi de hesaplıyor, yani
 * hata TUTARLI biçimde yanlış olurdu, hiçbir yerde iz kalmazdı).
 *
 * Çözüm aynı: sayfa, setlerin işaret ettiği ama aktif listede olmayan
 * egzersizleri AYRICA okuyup geçiriyor (`ekEgzersizler`); düzenleme modunda
 * YALNIZCA düzenlenen setin hareketi "(arşivli)" işaretiyle seçeneklere
 * ekleniyor. Başka bir arşivli hareket seçilemez, kendi bağı kaybolmaz.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SET NUMARASI — ÖNERİ, ZORLAMA DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `@@unique([workoutId, exerciseId, setNo])`. Yeni set formunda numara seçilen
 * hareketin SON setinin bir fazlası olarak öneriliyor ve her eklemeden sonra
 * (sayfa tazelenince) kendiliğinden ilerliyor. Kullanıcı değiştirebilir;
 * çakışırsa sunucu CONFLICT döndürüyor ve `fields.setNo` kabuk tarafından
 * doğrudan alana basılıyor.
 *
 * Düzenlemede ağırlığı ya da RPE'yi boşaltmak değeri siler
 * (`bosaltilanlariNullYap`) — ağırlıklı set ağırlıksıza çevrilebilir ve
 * rekorlar yeniden hesaplanır.
 */

export type SetEgzersizi = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isArchived: boolean;
};

type SetFormGirdi = z.input<typeof createWorkoutSetSchema>;

const SET_NO_TAVAN = 50;

/** Seçilen hareketin bir sonraki set numarası — şema tavanı 50. */
function sonrakiSetNo(setler: readonly WorkoutSetDto[], exerciseId: string): number {
  const enBuyuk = setler
    .filter((s) => s.exerciseId === exerciseId)
    .reduce((acc, s) => Math.max(acc, s.setNo), 0);
  return Math.min(SET_NO_TAVAN, enBuyuk + 1);
}

function rekorMetni(r: RecalculateResult): string {
  return `Rekorlar yeniden hesaplandı: ${r.upserted} rekor yazıldı/güncellendi, ${r.removed} kaldırıldı.`;
}

const virgullu = (deger: string | null) => (deger === null ? undefined : deger.replace('.', ','));

/** Setleri hareket bazında gruplar — servisin sırası (egzersiz, setNo) korunur. */
function grupla(
  setler: readonly WorkoutSetDto[],
): Array<{ exerciseId: string; ad: string; setler: WorkoutSetDto[] }> {
  const gruplar: Array<{ exerciseId: string; ad: string; setler: WorkoutSetDto[] }> = [];
  for (const s of setler) {
    const son = gruplar.at(-1);
    if (son?.exerciseId === s.exerciseId) son.setler.push(s);
    else gruplar.push({ exerciseId: s.exerciseId, ad: s.exerciseName, setler: [s] });
  }
  return gruplar;
}

export function SetBolumu({
  antrenmanId,
  setler,
  egzersizler,
  ekEgzersizler,
}: {
  antrenmanId: string;
  setler: WorkoutSetDto[];
  /** Aktif egzersizler — YENİ set için seçilebilecekler. */
  egzersizler: SetEgzersizi[];
  /** Setlerin işaret ettiği ama aktif listede OLMAYAN egzersizler (arşivli). */
  ekEgzersizler: SetEgzersizi[];
}) {
  const router = useRouter();
  const [duzenlenen, setDuzenlenen] = useState<WorkoutSetDto | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);

  const arsivliMi = (exerciseId: string) =>
    ekEgzersizler.some((e) => e.id === exerciseId && e.isArchived);

  const sutunlar: ReadonlyArray<Sutun<WorkoutSetDto>> = [
    { anahtar: 'setNo', baslik: 'Set', sayisal: true, deger: (s) => s.setNo },
    { anahtar: 'reps', baslik: 'Tekrar', sayisal: true, deger: (s) => s.reps },
    {
      anahtar: 'weightKg',
      baslik: 'Ağırlık',
      sayisal: true,
      deger: (s) => olcuBicim(s.weightKg, 'kg'),
    },
    {
      anahtar: 'rpe',
      baslik: 'RPE',
      sayisal: true,
      ikincil: true,
      deger: (s) => s.rpe ?? '—',
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (s) => {
        const ad = `${s.exerciseName} ${s.setNo}. set`;
        return (
          <div className="flex items-start justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={duzenlenen?.id === s.id}
              onClick={() => {
                setBildirim(null);
                setDuzenlenen(s);
              }}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{ad} düzenle</span>
            </Button>
            <KaliciSilDugmesi
              kayitAdi={ad}
              aciklama="Bu hareketin rekorları kalan setlerden yeniden hesaplanır; bu sete dayanan bir rekor düşebilir."
              sil={async () => {
                const sonuc = await deleteWorkoutSetAction({ id: s.id });
                if (sonuc.ok) {
                  if (duzenlenen?.id === s.id) setDuzenlenen(null);
                  setBildirim(
                    `${ad} silindi. Rekorlar yeniden hesaplandı: ${sonuc.data.recordsRemoved} rekor kaldırıldı.`,
                  );
                  router.refresh();
                }
                return sonuc;
              }}
            />
          </div>
        );
      },
    },
  ];

  const gruplar = grupla(setler);

  return (
    <section aria-labelledby="setler-baslik" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="setler-baslik" className="text-primary text-base font-semibold">
          Setler
        </h2>
        <p className="text-muted text-sm">
          <span className="tabular">{setler.length}</span> set ·{' '}
          <span className="tabular">{gruplar.length}</span> hareket
        </p>
      </div>

      {bildirim && (
        <p
          role="status"
          className="rounded-input border-success/40 bg-success/8 text-success border px-3 py-2.5 text-sm"
        >
          {bildirim}
        </p>
      )}

      {gruplar.length === 0 ? (
        <EmptyState
          icon={ListPlus}
          title="Bu antrenmanda henüz set yok"
          description="Hareketi seç, tekrar ve ağırlığı gir. Her set rekorları kendiliğinden yeniden hesaplatır."
          action={
            egzersizler.length > 0 ? (
              <a href="#set-formu-baslik" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                İlk seti ekle
              </a>
            ) : undefined
          }
        />
      ) : (
        gruplar.map((g) => (
          <div key={g.exerciseId} className="flex flex-col gap-2">
            <h3 className="text-primary text-sm font-medium">
              {g.ad}
              {arsivliMi(g.exerciseId) && (
                <span className="text-muted font-normal"> (arşivli)</span>
              )}
            </h3>
            <VeriTablosu
              baslik={`${g.ad} setleri`}
              satirlar={g.setler}
              sutunlar={sutunlar}
              satirAnahtari={(s) => s.id}
              /* Grup boş olamaz (en az bir setten doğuyor); kabuk yine de istiyor. */
              bosDurum={null}
            />
          </div>
        ))
      )}

      {egzersizler.length === 0 && !duzenlenen ? (
        <EmptyState
          icon={ListPlus}
          title="Seçilebilecek egzersiz yok"
          description="Set girmek için önce egzersiz kütüphanesine en az bir aktif hareket ekle."
          action={
            <Link href="/panel/spor/egzersizler/yeni" className={buttonClasses({ size: 'sm' })}>
              <Plus className="size-4" aria-hidden="true" />
              Egzersiz ekle
            </Link>
          }
        />
      ) : (
        <SetFormu
          /* Düzenlenen set değişince form SIFIRDAN kurulsun — varsayılanlar ona ait. */
          key={duzenlenen?.id ?? 'yeni'}
          antrenmanId={antrenmanId}
          setler={setler}
          egzersizler={egzersizler}
          ekEgzersizler={ekEgzersizler}
          set={duzenlenen ?? undefined}
          vazgec={() => setDuzenlenen(null)}
          duzenlemeBitti={(mesaj) => {
            setDuzenlenen(null);
            setBildirim(mesaj);
          }}
        />
      )}
    </section>
  );
}

function SetFormu({
  antrenmanId,
  setler,
  egzersizler,
  ekEgzersizler,
  set,
  vazgec,
  duzenlemeBitti,
}: {
  antrenmanId: string;
  setler: WorkoutSetDto[];
  egzersizler: SetEgzersizi[];
  ekEgzersizler: SetEgzersizi[];
  set?: WorkoutSetDto;
  vazgec: () => void;
  duzenlemeBitti: (mesaj: string) => void;
}) {
  const router = useRouter();
  const duzenleme = set !== undefined;
  const [rekorMesaji, setRekorMesaji] = useState('');
  const baslikRef = useRef<HTMLHeadingElement>(null);

  /*
    Düzenlenen setin hareketi aktif listede yoksa EKLENİYOR — dosya başındaki
    nota bakınız. Yalnızca DÜZENLEME modunda: yeni set için arşivli seçilemez.
  */
  const arsivliBagli: SetEgzersizi | null =
    set && !egzersizler.some((e) => e.id === set.exerciseId)
      ? (ekEgzersizler.find((e) => e.id === set.exerciseId) ?? {
          id: set.exerciseId,
          name: set.exerciseName,
          muscleGroup: 'OTHER',
          isArchived: true,
        })
      : null;

  const ilkEgzersiz = set?.exerciseId ?? egzersizler[0]?.id ?? '';

  /*
    `reps` ilk açılışta BOŞ — uydurulmuş bir varsayılan yok. Ekleme sonrası form
    BOŞALTILMIYOR (`temizle` yok): aynı tekrar/ağırlıkla bir sonraki set, yalnızca
    set numarası ilerlemiş hâlde tek tuşla giriliyor.
  */
  const varsayilan: DefaultValues<SetFormGirdi> = set
    ? {
        workoutId: antrenmanId,
        exerciseId: set.exerciseId,
        setNo: set.setNo,
        reps: set.reps,
        weightKg: virgullu(set.weightKg),
        rpe: set.rpe ?? undefined,
      }
    : {
        workoutId: antrenmanId,
        exerciseId: ilkEgzersiz,
        setNo: sonrakiSetNo(setler, ilkEgzersiz),
      };

  const kaydet = async (degerler: SetFormGirdi) => {
    if (set) {
      const sonuc = await updateWorkoutSetAction({
        ...bosaltilanlariNullYap(degerler, set, ['weightKg', 'rpe']),
        id: set.id,
      });
      if (sonuc.ok) {
        duzenlemeBitti(
          `${sonuc.data.set.exerciseName} ${sonuc.data.set.setNo}. set güncellendi. ${rekorMetni(sonuc.data.records)}`,
        );
        router.refresh();
      }
      return sonuc;
    }

    const sonuc = await createWorkoutSetAction(degerler);
    if (sonuc.ok) {
      setRekorMesaji(rekorMetni(sonuc.data.records));
      router.refresh();
    }
    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<SetFormGirdi>({
    sema: createWorkoutSetSchema,
    varsayilanDegerler: varsayilan,
    kaydet,
    /* `workoutId` gizli — ona düşen mesaj form düzeyine yükselsin (panel-form notu). */
    gorunmezAlanlar: ['workoutId'],
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const secilen = watch('exerciseId');

  /*
    YENİ set modunda numara seçilen harekete göre ilerliyor. `setler` bağımlılıkta:
    ekleme sonrası `router.refresh()` yeni listeyi getirince öneri kendiliğinden
    bir artıyor ve kullanıcı aynı hareketin bir sonraki setini tek tuşla giriyor.
    Düzenlemede DOKUNULMUYOR — mevcut numara kullanıcının girdiği değer.
  */
  useEffect(() => {
    if (duzenleme || !secilen) return;
    setValue('setNo', sonrakiSetNo(setler, secilen));
  }, [duzenleme, secilen, setler, setValue]);

  /* Düzenlemeye geçişte odak forma — klavye kullanıcısı tablodan formu aramasın. */
  useEffect(() => {
    if (duzenleme) baslikRef.current?.focus();
  }, [duzenleme]);

  /* Seçenekler kas grubuna göre — servis zaten (kas grubu, ad) sırasında veriyor. */
  const kasGruplari = egzersizler.reduce<Array<{ grup: MuscleGroup; liste: SetEgzersizi[] }>>(
    (acc, e) => {
      const son = acc.at(-1);
      if (son?.grup === e.muscleGroup) son.liste.push(e);
      else acc.push({ grup: e.muscleGroup, liste: [e] });
      return acc;
    },
    [],
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <CardTitle
          seviye="h3"
          id="set-formu-baslik"
          ref={baslikRef}
          tabIndex={-1}
          className="focus-ring rounded-sm"
        >
          {set ? `Seti düzenle · ${set.exerciseName} ${set.setNo}. set` : 'Set ekle'}
        </CardTitle>

        {arsivliBagli && (
          <p className="text-muted text-sm">
            Bu setin hareketi arşivlenmiş. Bağ korunuyor — seçimde “(arşivli)” işaretiyle görünüyor.
            Başka bir arşivli hareket seçemezsin.
          </p>
        )}

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={`Set eklendi. ${rekorMesaji}`}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Seti ekle'}
          ikincilEylem={
            duzenleme ? (
              <Button variant="ghost" onClick={vazgec}>
                Vazgeç
              </Button>
            ) : undefined
          }
        >
          <input type="hidden" {...register('workoutId')} />

          <Alan
            id="exerciseId"
            etiket="Hareket"
            hata={errors.exerciseId?.message}
            yardim="Arşivlenmiş hareketler yeni set için listede yoktur."
          >
            {(b) => (
              <select
                id="exerciseId"
                className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                {...b}
                {...register('exerciseId')}
              >
                {kasGruplari.map((g) => (
                  <optgroup key={g.grup} label={KAS_GRUBU[g.grup]}>
                    {g.liste.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {arsivliBagli && (
                  <optgroup label="Arşiv">
                    <option value={arsivliBagli.id}>{arsivliBagli.name} (arşivli)</option>
                  </optgroup>
                )}
              </select>
            )}
          </Alan>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Alan id="setNo" etiket="Set no" hata={errors.setNo?.message}>
              {(b) => (
                <Input
                  id="setNo"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={SET_NO_TAVAN}
                  className="tabular"
                  {...b}
                  {...register('setNo', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>

            <Alan id="reps" etiket="Tekrar" hata={errors.reps?.message}>
              {(b) => (
                <Input
                  id="reps"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="tabular"
                  {...b}
                  {...register('reps', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>

            <Alan id="weightKg" etiket="Ağırlık (kg)" hata={errors.weightKg?.message}>
              {(b) => (
                <Input
                  id="weightKg"
                  inputMode="decimal"
                  className="tabular"
                  placeholder="82,5"
                  {...b}
                  {...register('weightKg', ONDALIK_YA_DA_YOK)}
                />
              )}
            </Alan>

            <Alan id="rpe" etiket="RPE (1–10)" hata={errors.rpe?.message}>
              {(b) => (
                <Input
                  id="rpe"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10}
                  className="tabular"
                  {...b}
                  {...register('rpe', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>
          </div>

          <p className="text-muted text-xs">Ağırlıksız set (vücut ağırlığı) rekora girmez.</p>
        </FormKabugu>
      </CardContent>
    </Card>
  );
}
