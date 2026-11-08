'use client';

import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK, SAYI_YA_DA_YOK, bosaltilanlariNullYap } from '@/components/panel/alan';
import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { ANTRENMAN_TURU, RUH_HALI, secenekler } from '@/components/panel/kisisel-etiketler';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { createWorkoutSchema } from '@/lib/schemas/workout';
import {
  createWorkoutAction,
  deleteWorkoutAction,
  updateWorkoutAction,
} from '@/server/actions/workout';
import type { WorkoutDto } from '@/server/services/workout';

/**
 * ANTRENMAN FORMU — §4.2 `/panel/spor`, T-114. Yeni ve düzenleme tek bileşen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * YENİ ANTRENMAN → DOĞRUDAN DETAYA, LİSTEYE DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `SaglikFormu` başarıda listeye dönüyordu; burada dönmüyor. Bir sağlık kaydı
 * kendi başına TAMAM; bir antrenman ise setleri girilene kadar boş bir kabuk.
 * Listeye dönmek kullanıcıyı az önce açtığı kaydı satırlar arasında aramaya
 * zorlardı — ve sıfır setli antrenmanlar listede çoğalırdı.
 *
 * ⚠️ GÜN `@unique` DEĞİL (`HealthLog`un tersi): aynı güne iki antrenman
 * düşebilir (sabah kardiyo, akşam salon). Bu yüzden `SaglikFormu`ndaki
 * "o günün kaydı zaten var" çıkış yolu BURADA YOK — çakışma oluşmuyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SİLME METNİ SETLERİ VE REKORLARI SÖYLÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `WorkoutSet.workoutId` `Cascade`: antrenmanla birlikte TÜM setleri gider ve
 * eylem rekorları yeniden hesaplıyor (`actions/workout.ts`). Onayda yalnızca
 * "antrenman silinir" demek, kullanıcının 5RM rekorunun neden ekrandan
 * kaybolduğunu açıklamadan bırakırdı.
 *
 * Dolu bir alanı (süre, his, not) boşaltmak onu siler (`bosaltilanlariNullYap`).
 * Gün değişikliği ise rekor günlerini de günceller (eylem yeniden hesaplıyor).
 */

type AntrenmanFormGirdi = z.input<typeof createWorkoutSchema>;

function baslangic(antrenman: WorkoutDto | undefined, gun: string): AntrenmanFormGirdi {
  if (!antrenman) return { date: gun, type: 'GYM' };
  return {
    date: antrenman.date,
    type: antrenman.type,
    durationMin: antrenman.durationMin ?? undefined,
    feeling: antrenman.feeling ?? undefined,
    note: antrenman.note ?? undefined,
  };
}

export function AntrenmanFormu({
  antrenman,
  gun,
  setSayisi = 0,
}: {
  antrenman?: WorkoutDto;
  gun: string;
  /** Silme onayında "N set de silinir" demek için. */
  setSayisi?: number;
}) {
  const router = useRouter();
  const duzenleme = antrenman !== undefined;

  const kaydet = async (degerler: AntrenmanFormGirdi) => {
    if (antrenman) {
      const sonuc = await updateWorkoutAction({
        ...bosaltilanlariNullYap(degerler, antrenman, ['durationMin', 'feeling', 'note']),
        id: antrenman.id,
      });
      if (sonuc.ok) router.refresh();
      return sonuc;
    }

    const sonuc = await createWorkoutAction(degerler);
    /* Yeni kayıt → setleri girebilmesi için doğrudan detaya (dosya başı). */
    if (sonuc.ok) router.push(`/panel/spor/${sonuc.data.id}`);
    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<AntrenmanFormGirdi>({
    sema: createWorkoutSchema,
    varsayilanDegerler: baslangic(antrenman, gun),
    kaydet,
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle seviye="h2">
            {duzenleme ? `${antrenman.date} antrenmanı` : 'Yeni antrenman'}
          </CardTitle>

          {antrenman && (
            <KaliciSilDugmesi
              kayitAdi={`${antrenman.date} antrenmanı`}
              aciklama={
                setSayisi > 0
                  ? `Bu antrenmanın ${setSayisi} seti de silinir ve etkilenen hareketlerin rekorları kalan setlerden yeniden hesaplanır — bu antrenmana dayanan rekorlar düşebilir.`
                  : 'Antrenmanın seti yok; hiçbir rekor etkilenmez.'
              }
              etiketGorunsun
              sil={async () => {
                const sonuc = await deleteWorkoutAction({ id: antrenman.id });
                if (sonuc.ok) {
                  router.push('/panel/spor/gecmis');
                  router.refresh();
                }
                return sonuc;
              }}
            />
          )}
        </div>

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={
            duzenleme
              ? 'Kaydedildi. Rekor günleri antrenmanın gününe göre yeniden hesaplandı.'
              : 'Antrenman açıldı — setlere geçiliyor…'
          }
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Antrenmanı aç'}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Alan
              id="date"
              etiket="Gün"
              hata={errors.date?.message}
              yardim="Aynı güne birden fazla antrenman girilebilir."
            >
              {(b) => (
                <Input
                  id="date"
                  type="date"
                  className="tabular w-fit"
                  {...b}
                  {...register('date')}
                />
              )}
            </Alan>

            <Alan id="type" etiket="Tür" hata={errors.type?.message}>
              {(b) => (
                <select
                  id="type"
                  className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                  {...b}
                  {...register('type')}
                >
                  {secenekler(ANTRENMAN_TURU).map(([deger, etiket]) => (
                    <option key={deger} value={deger}>
                      {etiket}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan id="durationMin" etiket="Süre (dk)" hata={errors.durationMin?.message}>
              {(b) => (
                <Input
                  id="durationMin"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1440}
                  className="tabular"
                  {...b}
                  {...register('durationMin', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>

            <Alan id="feeling" etiket="His" hata={errors.feeling?.message}>
              {(b) => (
                <select
                  id="feeling"
                  className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm"
                  {...b}
                  {...register('feeling', SAYI_YA_DA_YOK)}
                >
                  <option value="">Girilmedi</option>
                  {[5, 4, 3, 2, 1].map((p) => (
                    <option key={p} value={p}>
                      {p} — {RUH_HALI[p]}
                    </option>
                  ))}
                </select>
              )}
            </Alan>
          </div>

          <Alan id="note" etiket="Not" hata={errors.note?.message}>
            {(b) => <Textarea id="note" rows={3} {...b} {...register('note', BOS_ISE_YOK)} />}
          </Alan>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/spor')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
