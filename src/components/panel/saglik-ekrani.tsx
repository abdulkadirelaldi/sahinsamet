'use client';

import { HeartPulse, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { gunAyYil } from '@/components/panel/hayat-bicim';
import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { RUH_HALI, olcuBicim, tamSayiBicim } from '@/components/panel/kisisel-etiketler';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { deleteHealthLogAction } from '@/server/actions/health-log';
import type { HealthLogDto } from '@/server/services/health-log';

/**
 * SAĞLIK KAYITLARI LİSTESİ — §4.2 `/panel/saglik`, T-113.
 *
 * SİLME var, arşiv yok: `HealthLog` bir ÖLÇÜM, referans veri değil (T-110).
 * Onay metni değerlerin HİÇBİR YERDE kalmadığını söylüyor — `deneyim`deki
 * "denetim kaydında görünmeye devam eder" burada yanlış olurdu.
 */
export function SaglikEkrani({ kayitlar, toplam }: { kayitlar: HealthLogDto[]; toplam: number }) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);

  const sutunlar: ReadonlyArray<Sutun<HealthLogDto>> = [
    {
      anahtar: 'date',
      baslik: 'Gün',
      sayisal: true,
      deger: (k) => (
        <Link
          href={`/panel/saglik/${k.id}`}
          className="focus-ring rounded-btn text-primary -m-1 p-1 font-medium whitespace-nowrap"
        >
          {gunAyYil(k.date)}
        </Link>
      ),
      siralamaDegeri: (k) => k.date,
    },
    {
      anahtar: 'weightKg',
      baslik: 'Kilo',
      sayisal: true,
      deger: (k) => <span className="whitespace-nowrap">{olcuBicim(k.weightKg, 'kg')}</span>,
      siralamaDegeri: (k) => Number(k.weightKg ?? -1),
    },
    {
      anahtar: 'sleepHours',
      baslik: 'Uyku',
      sayisal: true,
      deger: (k) => <span className="whitespace-nowrap">{olcuBicim(k.sleepHours, 'sa')}</span>,
      siralamaDegeri: (k) => Number(k.sleepHours ?? -1),
    },
    {
      anahtar: 'steps',
      baslik: 'Adım',
      sayisal: true,
      ikincil: true,
      deger: (k) => tamSayiBicim(k.steps),
      siralamaDegeri: (k) => k.steps ?? -1,
    },
    {
      anahtar: 'waterMl',
      baslik: 'Su',
      sayisal: true,
      ikincil: true,
      deger: (k) => <span className="whitespace-nowrap">{tamSayiBicim(k.waterMl, 'ml')}</span>,
      siralamaDegeri: (k) => k.waterMl ?? -1,
    },
    {
      anahtar: 'mood',
      baslik: 'Ruh hâli',
      ikincil: true,
      deger: (k) => (k.mood ? RUH_HALI[k.mood] : '—'),
      siralamaDegeri: (k) => k.mood ?? 0,
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (k) => (
        <div className="flex items-start justify-end gap-1">
          <Link
            href={`/panel/saglik/${k.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{gunAyYil(k.date)} kaydını düzenle</span>
          </Link>
          <KaliciSilDugmesi
            kayitAdi={`${gunAyYil(k.date)} kaydı`}
            aciklama="Ölçüm değerleri hiçbir yerde saklanmaz."
            sil={async () => {
              const sonuc = await deleteHealthLogAction({ id: k.id });
              if (sonuc.ok) {
                setBildirim(`${gunAyYil(k.date)} kaydı silindi.`);
                router.refresh();
              }
              return sonuc;
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {bildirim && (
        <p
          role="status"
          className="rounded-input border-success/40 bg-success/8 text-success border px-3 py-2.5 text-sm"
        >
          {bildirim}
        </p>
      )}

      <p className="text-muted text-sm">
        <span className="tabular">{toplam}</span> kayıt · en yeni gün üstte
      </p>

      <VeriTablosu
        baslik="Sağlık kayıtları"
        satirlar={kayitlar}
        sutunlar={sutunlar}
        satirAnahtari={(k) => k.id}
        bosDurum={
          <EmptyState
            icon={HeartPulse}
            title="Henüz sağlık kaydı yok"
            description="Kilo, uyku, su ve adım gibi günlük ölçümlerini girdiğinde trendler burada çizilir."
            action={
              <Link href="/panel/saglik/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                İlk kaydı ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
