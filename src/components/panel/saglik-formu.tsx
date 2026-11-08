'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type * as z from 'zod';

import {
  Alan,
  BOS_ISE_YOK,
  ONDALIK_YA_DA_YOK,
  SAYI_YA_DA_YOK,
  bosaltilanlariNullYap,
} from '@/components/panel/alan';
import { gunAyYil } from '@/components/panel/hayat-bicim';
import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { RUH_HALI } from '@/components/panel/kisisel-etiketler';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { createHealthLogSchema } from '@/lib/schemas/health-log';
import {
  createHealthLogAction,
  deleteHealthLogAction,
  updateHealthLogAction,
} from '@/server/actions/health-log';
import type { HealthLogDto } from '@/server/services/health-log';
import type { TartiOnerisi } from '@/server/services/saglik-ai';

/**
 * SAĞLIK KAYDI FORMU — §4.2 `/panel/saglik`, T-113. Yeni ve düzenleme tek bileşen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GÜNDE TEK KAYIT — ÇAKIŞMA BİR ÇIKIŞ YOLU GÖSTERİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `HealthLog.date @unique`. Aynı güne ikinci kayıt CONFLICT dönüyor ve sunucu
 * `fields.existingId` ile MEVCUT kaydın kimliğini veriyor (T-110). Hata
 * mesajını göstermek yetmezdi — kullanıcının yapacağı şey o kaydı açmak.
 * Kimlik formun alanı olmadığı için kabuk onu basmıyor; burada yakalanıp
 * bağlantıya çevriliyor.
 *
 * ⚠️ ÖLÇÜLER SAYIYA ÇEVRİLMİYOR: `weightKg`/`bodyFatPct`/`sleepHours` dize
 * olarak gidiyor (`ONDALIK_YA_DA_YOK` yalnızca virgülü noktaya çeviriyor).
 *
 * BOŞALTMAK SİLİYOR: dolu bir ölçüyü boşaltıp kaydetmek onu `null` yapar
 * (`bosaltilanlariNullYap`). Önceden kısmi şema "temizle" diyemiyordu ve
 * değer sessizce kalıyordu.
 */

type SaglikFormGirdi = z.input<typeof createHealthLogSchema>;

function baslangic(
  kayit: HealthLogDto | undefined,
  gun: string,
  oneri?: TartiOnerisi,
): SaglikFormGirdi {
  if (!kayit) {
    // Tartı görselinden okunan değerler — kullanıcı bakıp onaylar.
    const { tarih, ...degerler } = oneri ?? { tarih: null };
    return { date: tarih ?? gun, ...degerler };
  }
  return {
    date: kayit.date,
    weightKg: kayit.weightKg ?? undefined,
    bodyFatPct: kayit.bodyFatPct ?? undefined,
    sleepHours: kayit.sleepHours ?? undefined,
    waterMl: kayit.waterMl ?? undefined,
    restingHr: kayit.restingHr ?? undefined,
    steps: kayit.steps ?? undefined,
    mood: kayit.mood ?? undefined,
    note: kayit.note ?? undefined,
    bmi: kayit.bmi ?? undefined,
    waterPct: kayit.waterPct ?? undefined,
    muscleKg: kayit.muscleKg ?? undefined,
    boneKg: kayit.boneKg ?? undefined,
    proteinPct: kayit.proteinPct ?? undefined,
    visceralFat: kayit.visceralFat ?? undefined,
    subcutaneousFatPct: kayit.subcutaneousFatPct ?? undefined,
    skeletalMusclePct: kayit.skeletalMusclePct ?? undefined,
    bmrKcal: kayit.bmrKcal ?? undefined,
    metabolicAge: kayit.metabolicAge ?? undefined,
  };
}

/** Akıllı tartı alanları — sıra ekrandaki gibi. */
const TARTI_ONDALIK = [
  ['bmi', 'BMI', '27,6'],
  ['waterPct', 'Vücut suyu (%)', '52'],
  ['muscleKg', 'Kas (kg)', '60,5'],
  ['skeletalMusclePct', 'İskelet kası (%)', '45'],
  ['visceralFat', 'İç yağ', '13,5'],
  ['subcutaneousFatPct', 'Deri altı yağ (%)', '23'],
  ['proteinPct', 'Protein (%)', '16'],
  ['boneKg', 'Kemik (kg)', '3,2'],
] as const;

/** `"82.50"` → `"82,50"` — düzenlemede kullanıcının yazım alışkanlığıyla göster. */
const virgullu = (deger: string | undefined) => deger?.replace('.', ',');

export function SaglikFormu({
  kayit,
  gun,
  oneri,
}: {
  kayit?: HealthLogDto;
  gun: string;
  oneri?: TartiOnerisi;
}) {
  const router = useRouter();
  const duzenleme = kayit !== undefined;
  const [mevcutId, setMevcutId] = useState<string | null>(null);

  const kaydet = async (degerler: SaglikFormGirdi) => {
    setMevcutId(null);
    const sonuc = kayit
      ? await updateHealthLogAction({
          ...bosaltilanlariNullYap(degerler, kayit, [
            'weightKg',
            'bodyFatPct',
            'sleepHours',
            'waterMl',
            'restingHr',
            'steps',
            'mood',
            'note',
            'bmi',
            'waterPct',
            'muscleKg',
            'boneKg',
            'proteinPct',
            'visceralFat',
            'subcutaneousFatPct',
            'skeletalMusclePct',
            'bmrKcal',
            'metabolicAge',
          ]),
          id: kayit.id,
        })
      : await createHealthLogAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!kayit) router.push('/panel/saglik');
    } else if (sonuc.error.code === 'CONFLICT' && sonuc.error.fields?.existingId) {
      setMevcutId(sonuc.error.fields.existingId);
    }

    return sonuc;
  };

  const varsayilan = baslangic(kayit, gun, oneri);
  const [birlesiyor, setBirlesiyor] = useState(false);
  /** Çakışmada uzun form boşa gitmesin: dolu alanlar o günün kaydına yazılır, gerisi kalır. */
  const girdileriBirlestir = async (id: string) => {
    setBirlesiyor(true);
    try {
      const dolu = Object.fromEntries(
        Object.entries(form.getValues()).filter(
          ([ad, deger]) => ad !== 'date' && deger !== undefined && deger !== '' && deger !== null,
        ),
      );
      const sonuc = await updateHealthLogAction({ id, ...dolu });
      if (sonuc.ok) router.push(`/panel/saglik/${id}`);
      else form.setError('root', { message: sonuc.error.message });
    } catch {
      form.setError('root', { message: 'Bağlantı kurulamadı. Yeniden dene.' });
    } finally {
      setBirlesiyor(false);
    }
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<SaglikFormGirdi>({
    sema: createHealthLogSchema,
    varsayilanDegerler: {
      ...varsayilan,
      weightKg: virgullu(varsayilan.weightKg),
      bodyFatPct: virgullu(varsayilan.bodyFatPct),
      sleepHours: virgullu(varsayilan.sleepHours),
      ...Object.fromEntries(TARTI_ONDALIK.map(([k]) => [k, virgullu(varsayilan[k])])),
    },
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
            {duzenleme ? `${gunAyYil(kayit.date)} kaydı` : 'Yeni sağlık kaydı'}
          </CardTitle>

          {kayit && (
            <KaliciSilDugmesi
              kayitAdi={`${gunAyYil(kayit.date)} kaydı`}
              aciklama="Ölçüm değerleri hiçbir yerde saklanmaz; denetim kaydında yalnızca günün silindiği görünür."
              etiketGorunsun
              sil={async () => {
                const sonuc = await deleteHealthLogAction({ id: kayit.id });
                if (sonuc.ok) {
                  router.push('/panel/saglik');
                  router.refresh();
                }
                return sonuc;
              }}
            />
          )}
        </div>

        {mevcutId && (
          <p
            role="status"
            className="rounded-input border-warning/40 bg-warning/8 text-body border px-3 py-2.5 text-sm"
          >
            Bu güne ait kayıt zaten var.{' '}
            <Link
              href={`/panel/saglik/${mevcutId}`}
              className="text-primary focus-ring rounded-sm font-medium underline underline-offset-4"
            >
              O günün kaydını düzenle
            </Link>
            {' · '}
            <button
              type="button"
              disabled={birlesiyor}
              onClick={() => void girdileriBirlestir(mevcutId)}
              className="text-primary focus-ring rounded-sm font-medium underline underline-offset-4"
            >
              Girdiklerimi o güne ekle
            </button>
          </p>
        )}

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kaydedildi.' : 'Kayıt eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <Alan
            id="date"
            etiket="Gün"
            hata={errors.date?.message}
            yardim="Günde tek kayıt tutulur."
          >
            {(b) => (
              <Input id="date" type="date" className="tabular w-fit" {...b} {...register('date')} />
            )}
          </Alan>

          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="text-primary mb-2 text-sm font-medium">Vücut ölçüleri</legend>
            <Alan id="weightKg" etiket="Kilo (kg)" hata={errors.weightKg?.message}>
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
            <Alan id="bodyFatPct" etiket="Vücut yağı (%)" hata={errors.bodyFatPct?.message}>
              {(b) => (
                <Input
                  id="bodyFatPct"
                  inputMode="decimal"
                  className="tabular"
                  placeholder="18,5"
                  {...b}
                  {...register('bodyFatPct', ONDALIK_YA_DA_YOK)}
                />
              )}
            </Alan>
            <Alan id="restingHr" etiket="Dinlenik nabız (bpm)" hata={errors.restingHr?.message}>
              {(b) => (
                <Input
                  id="restingHr"
                  type="number"
                  inputMode="numeric"
                  className="tabular"
                  {...b}
                  {...register('restingHr', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <legend className="text-primary mb-2 text-sm font-medium">Akıllı tartı</legend>
            {TARTI_ONDALIK.map(([alan, etiket, ornek]) => (
              <Alan key={alan} id={alan} etiket={etiket} hata={errors[alan]?.message}>
                {(b) => (
                  <Input
                    id={alan}
                    inputMode="decimal"
                    className="tabular"
                    placeholder={ornek}
                    {...b}
                    {...register(alan, ONDALIK_YA_DA_YOK)}
                  />
                )}
              </Alan>
            ))}
            <Alan id="bmrKcal" etiket="Bazal metab. (kcal)" hata={errors.bmrKcal?.message}>
              {(b) => (
                <Input
                  id="bmrKcal"
                  type="number"
                  inputMode="numeric"
                  className="tabular"
                  placeholder="1870"
                  {...b}
                  {...register('bmrKcal', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>
            <Alan id="metabolicAge" etiket="Metabolik yaş" hata={errors.metabolicAge?.message}>
              {(b) => (
                <Input
                  id="metabolicAge"
                  type="number"
                  inputMode="numeric"
                  className="tabular"
                  {...b}
                  {...register('metabolicAge', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="text-primary mb-2 text-sm font-medium">Günlük değerler</legend>
            <Alan id="sleepHours" etiket="Uyku (saat)" hata={errors.sleepHours?.message}>
              {(b) => (
                <Input
                  id="sleepHours"
                  inputMode="decimal"
                  className="tabular"
                  placeholder="7,5"
                  {...b}
                  {...register('sleepHours', ONDALIK_YA_DA_YOK)}
                />
              )}
            </Alan>
            <Alan id="waterMl" etiket="Su (ml)" hata={errors.waterMl?.message}>
              {(b) => (
                <Input
                  id="waterMl"
                  type="number"
                  inputMode="numeric"
                  step={250}
                  className="tabular"
                  {...b}
                  {...register('waterMl', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>
            <Alan id="steps" etiket="Adım" hata={errors.steps?.message}>
              {(b) => (
                <Input
                  id="steps"
                  type="number"
                  inputMode="numeric"
                  className="tabular"
                  {...b}
                  {...register('steps', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>
          </fieldset>

          <Alan id="mood" etiket="Ruh hâli" hata={errors.mood?.message}>
            {(b) => (
              <select
                id="mood"
                className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full max-w-xs border px-3 text-sm"
                {...b}
                {...register('mood', SAYI_YA_DA_YOK)}
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

          <Alan
            id="note"
            etiket="Not"
            hata={errors.note?.message}
            yardim="Yalnızca panelde görünür; denetim kaydına yazılmaz."
          >
            {(b) => <Textarea id="note" rows={3} {...b} {...register('note', BOS_ISE_YOK)} />}
          </Alan>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/saglik')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
