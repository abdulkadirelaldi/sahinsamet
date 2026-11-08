'use client';

import { useRouter } from 'next/navigation';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK, SAYI_YA_DA_YOK, bosaltilanlariNullYap } from '@/components/panel/alan';
import { HEDEF_DURUM_ROZETI, gunAyYil, kalanGunMetni } from '@/components/panel/hayat-bicim';
import { HedefIlerleme } from '@/components/panel/hedef-ilerleme';
import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { HEDEF_DURUMU, HEDEF_KATEGORISI, secenekler } from '@/components/panel/kisisel-etiketler';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { createGoalSchema } from '@/lib/schemas/goal';
import { createGoalAction, deleteGoalAction, updateGoalAction } from '@/server/actions/goal';
import type { GoalDto } from '@/server/services/goal';
import type { GoalPeriod } from '@/types';

/**
 * HEDEF FORMU — §4.2 `/panel/hayat/hedefler`, T-115. Yeni + düzenleme.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * "ULAŞILDI ⇔ %100" — ÜÇ KATMAN, BİRİ BU EKRAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kural şemada (`createGoalSchema` çapraz kuralı) ve serviste
 * (`resolveGoalUpdate`, kısmi güncellemede mevcut kayıtla birleştirilmiş hâl)
 * zaten var. Bu ekranın payı NİYETİ OKUMAK:
 *
 *   - Durum "Ulaşıldı"ya çekilince ilerleme 100'e GETİRİLİYOR — servisin (a)
 *     dalıyla aynı yorum: "ulaştım" diyen %100 diyordur. Getirilmeseydi
 *     kullanıcı önce bir doğrulama hatası görür, sonra sayıyı elle yazardı.
 *   - Ulaşılmış hedefin ilerlemesi DÜŞÜRÜLÜRSE durum KENDİLİĞİNDEN değişmiyor —
 *     servisin (b) dalı: niyet belirsiz, tahmin edilmez. Şema istemcide
 *     `progress` alanına hata basıyor; istemci atlatılırsa sunucunun
 *     VALIDATION_ERROR'u `fields.progress` ile AYNI alana düşüyor
 *     (`usePanelForm` eşleme tablosuz basıyor).
 *
 * Hedef tarihini boşaltmak onu siler (`bosaltilanlariNullYap`; önceden kısmi
 * şema "temizle" diyemiyordu ve tarih kalıyordu). `description` boş metinle
 * zaten temizleniyordu — servis `''`yi `null`a çeviriyor.
 *
 * `description` denetim kaydına DEĞERİYLE girmiyor (yalnızca "değişti",
 * ADR-034); yardım metni bunu söylüyor.
 */

type HedefFormGirdi = z.input<typeof createGoalSchema>;

const SEKME: Record<GoalPeriod, string> = {
  WEEKLY: 'haftalik',
  MONTHLY: 'aylik',
  YEARLY: 'yillik',
};

function baslangic(kayit: GoalDto | undefined, donem: GoalPeriod | undefined): HedefFormGirdi {
  if (!kayit) {
    return {
      title: '',
      description: '',
      category: 'PERSONAL',
      progress: 0,
      status: 'ACTIVE',
      ...(donem ? { period: donem } : {}),
    };
  }
  return {
    title: kayit.title,
    description: kayit.description ?? '',
    category: kayit.category,
    targetDate: kayit.targetDate ?? undefined,
    progress: kayit.progress,
    status: kayit.status,
  };
}

const SECIM_SINIFI =
  'focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm';

export function HedefFormu({ kayit, donem }: { kayit?: GoalDto; donem?: GoalPeriod }) {
  const router = useRouter();
  const duzenleme = kayit !== undefined;

  const kaydet = async (degerler: HedefFormGirdi) => {
    const sonuc = kayit
      ? await updateGoalAction({
          ...bosaltilanlariNullYap(degerler, kayit, ['targetDate']),
          id: kayit.id,
        })
      : await createGoalAction(degerler);

    if (sonuc.ok) {
      router.refresh();
      if (!kayit)
        router.push(
          donem
            ? `/panel/hayat/hedefler?donem=${SEKME[donem]}`
            : '/panel/hayat/hedefler?donem=uzun',
        );
    }

    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<HedefFormGirdi>({
    sema: createGoalSchema,
    varsayilanDegerler: baslangic(kayit, donem),
    kaydet,
  });

  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const kalan =
    kayit && (kayit.status === 'ACTIVE' || kayit.status === 'PAUSED')
      ? kalanGunMetni(kayit.daysLeft)
      : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <CardTitle seviye="h2" className="break-words">
              {duzenleme ? kayit.title : 'Yeni hedef'}
            </CardTitle>
            {kayit && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={HEDEF_DURUM_ROZETI[kayit.status]}>
                  {HEDEF_DURUMU[kayit.status]}
                </Badge>
                {kalan && <Badge variant={kalan.ton}>{kalan.metin}</Badge>}
                {kayit.targetDate && (
                  <span className="tabular text-muted text-xs">{gunAyYil(kayit.targetDate)}</span>
                )}
              </div>
            )}
          </div>

          {kayit && (
            <KaliciSilDugmesi
              kayitAdi={kayit.title}
              aciklama="Vazgeçtiğin bir hedefi kayıtta tutmak istiyorsan silmek yerine durumunu “Vazgeçildi” yap."
              etiketGorunsun
              sil={async () => {
                const sonuc = await deleteGoalAction({ id: kayit.id });
                if (sonuc.ok) {
                  router.push('/panel/hayat/hedefler');
                  router.refresh();
                }
                return sonuc;
              }}
            />
          )}
        </div>

        {kayit && (
          <HedefIlerleme baslik={`${kayit.title} kayıtlı ilerlemesi`} ilerleme={kayit.progress} />
        )}

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          basariMetni={duzenleme ? 'Kaydedildi.' : 'Hedef eklendi.'}
          gonderEtiketi={duzenleme ? 'Kaydet' : 'Ekle'}
        >
          <Alan id="title" etiket="Başlık" hata={errors.title?.message}>
            {(b) => <Input id="title" placeholder="Maraton koş" {...b} {...register('title')} />}
          </Alan>

          <Alan
            id="description"
            etiket="Açıklama"
            hata={errors.description?.message}
            yardim="İsteğe bağlı. Denetim kaydına yalnızca değiştiği yazılır, metni yazılmaz."
          >
            {(b) => <Textarea id="description" rows={4} {...b} {...register('description')} />}
          </Alan>

          <div className="grid gap-4 sm:grid-cols-2">
            <Alan id="category" etiket="Kategori" hata={errors.category?.message}>
              {(b) => (
                <select id="category" className={SECIM_SINIFI} {...b} {...register('category')}>
                  {secenekler(HEDEF_KATEGORISI).map(([deger, etiket]) => (
                    <option key={deger} value={deger}>
                      {etiket}
                    </option>
                  ))}
                </select>
              )}
            </Alan>

            <Alan
              id="status"
              etiket="Durum"
              hata={errors.status?.message}
              yardim="“Ulaşıldı” seçilince ilerleme %100 olur."
            >
              {(b) => (
                <select
                  id="status"
                  className={SECIM_SINIFI}
                  {...b}
                  {...register('status', {
                    onChange: (olay: { target: { value: string } }) => {
                      if (olay.target.value === 'ACHIEVED') {
                        setValue('progress', 100, { shouldValidate: true });
                      }
                    },
                  })}
                >
                  {secenekler(HEDEF_DURUMU).map(([deger, etiket]) => (
                    <option key={deger} value={deger}>
                      {etiket}
                    </option>
                  ))}
                </select>
              )}
            </Alan>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Alan
              id="progress"
              etiket="İlerleme (%)"
              hata={errors.progress?.message}
              yardim="0–100 arası tam sayı."
            >
              {(b) => (
                <Input
                  id="progress"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={5}
                  className="tabular w-28"
                  {...b}
                  {...register('progress', SAYI_YA_DA_YOK)}
                />
              )}
            </Alan>

            <Alan
              id="targetDate"
              etiket="Hedef tarih"
              hata={errors.targetDate?.message}
              yardim={
                duzenleme
                  ? 'İsteğe bağlı. Boşaltmak tarihi kaldırır.'
                  : 'İsteğe bağlı. Verilirse kalan gün gösterilir.'
              }
            >
              {(b) => (
                <Input
                  id="targetDate"
                  type="date"
                  className="tabular w-fit"
                  {...b}
                  {...register('targetDate', BOS_ISE_YOK)}
                />
              )}
            </Alan>
          </div>
        </FormKabugu>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push('/panel/hayat/hedefler')}
        >
          Listeye dön
        </Button>
      </CardContent>
    </Card>
  );
}
