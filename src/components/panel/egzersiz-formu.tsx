'use client';

import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { Alan } from '@/components/panel/alan';
import { EKIPMAN, KAS_GRUBU, secenekler } from '@/components/panel/kisisel-etiketler';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createExerciseSchema } from '@/lib/schemas/exercise';
import { createExerciseAction, updateExerciseAction } from '@/server/actions/exercise';
import type { ExerciseDto } from '@/server/services/exercise';

/**
 * EGZERSİZ FORMU — §4.2 `/panel/spor/egzersizler`, T-114. Yeni ve düzenleme.
 *
 * `name @unique`: aynı adı ikinci kez girmek CONFLICT dönüyor ve eylem
 * `fields.name` veriyor — kabuk bunu doğrudan alana basıyor, burada ayrıca
 * bir şey yapılmıyor. Tekillik istenen bir şey: çift "Bench Press" rekorları
 * ikiye bölerdi (`actions/exercise.ts`).
 *
 * ⚠️ KAS GRUBUNU DEĞİŞTİRMEK GEÇMİŞİ YENİDEN GRUPLAR: rekor ekranı ve seçici
 * kas grubuna göre gruplanıyor; alan yanlış değiştirilirse eski setler sessizce
 * başka bir grubun altına düşer. Yardım metni bunu söylüyor (denetim kaydı
 * değişikliği tutuyor).
 *
 * `isArchived` BU FORMDA YOK — arşivleme ayrı bir eylem (`archiveExerciseAction`)
 * ve listeden yapılıyor. `updateExerciseSchema` o alanı hiç almıyor.
 */

type EgzersizFormGirdi = z.input<typeof createExerciseSchema>;

const SECIM_SINIFI =
  'focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm';

export function EgzersizFormu({ egzersiz }: { egzersiz?: ExerciseDto }) {
  const router = useRouter();
  const duzenleme = egzersiz !== undefined;

  const kaydet = async (degerler: EgzersizFormGirdi) => {
    const sonuc = egzersiz
      ? await updateExerciseAction({ ...degerler, id: egzersiz.id })
      : await createExerciseAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!egzersiz) router.push('/panel/spor/egzersizler');
    }
    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<EgzersizFormGirdi>({
    sema: createExerciseSchema,
    varsayilanDegerler: egzersiz
      ? { name: egzersiz.name, muscleGroup: egzersiz.muscleGroup, equipment: egzersiz.equipment }
      : { name: '', muscleGroup: 'CHEST', equipment: 'BARBELL' },
    kaydet,
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle seviye="h2">{duzenleme ? egzersiz.name : 'Yeni egzersiz'}</CardTitle>
          {egzersiz?.isArchived && <Badge variant="warning">Arşiv</Badge>}
        </div>

        {egzersiz?.isArchived && (
          <p className="text-muted text-sm">
            Bu hareket arşivde: yeni set için seçilemez, eski setleri ve rekorları yerinde. Arşivden
            çıkarmak için kütüphanenin Arşiv sekmesini kullan.
          </p>
        )}

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kaydedildi.' : 'Egzersiz eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <Alan id="name" etiket="Ad" hata={errors.name?.message} yardim="Her hareket bir kez.">
            {(b) => (
              <Input
                id="name"
                autoComplete="off"
                placeholder="Bench Press"
                {...b}
                {...register('name')}
              />
            )}
          </Alan>

          <div className="grid gap-4 sm:grid-cols-2">
            <Alan
              id="muscleGroup"
              etiket="Kas grubu"
              hata={errors.muscleGroup?.message}
              yardim={
                duzenleme ? 'Değiştirmek eski setleri de yeni grubun altına taşır.' : undefined
              }
            >
              {(b) => (
                <select
                  id="muscleGroup"
                  className={SECIM_SINIFI}
                  {...b}
                  {...register('muscleGroup')}
                >
                  {secenekler(KAS_GRUBU).map(([deger, etiket]) => (
                    <option key={deger} value={deger}>
                      {etiket}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan id="equipment" etiket="Ekipman" hata={errors.equipment?.message}>
              {(b) => (
                <select id="equipment" className={SECIM_SINIFI} {...b} {...register('equipment')}>
                  {secenekler(EKIPMAN).map(([deger, etiket]) => (
                    <option key={deger} value={deger}>
                      {etiket}
                    </option>
                  ))}
                </select>
              )}
            </Alan>
          </div>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/spor/egzersizler')}
        >
          Kütüphaneye dön
        </Button>
      </CardContent>
    </Card>
  );
}
