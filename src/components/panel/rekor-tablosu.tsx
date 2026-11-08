'use client';

import { Plus, Trophy } from 'lucide-react';
import Link from 'next/link';

import { gunAyYil } from '@/components/panel/hayat-bicim';
import { KAS_GRUBU, olcuBicim } from '@/components/panel/kisisel-etiketler';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { PersonalRecordDto } from '@/server/services/personal-record';

/**
 * REKOR TABLOSU — §4.2 "PR takibi", ADR-021, T-114.
 *
 * İki yerde kullanılıyor: `/panel/spor/rekorlar` (tüm hareketler, sayfalı) ve
 * `/panel/spor/egzersizler/[id]` (tek hareketin TÜM rekorları). İkincisinde
 * hareket sütunu gereksiz — `hareketSutunu={false}`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SALT OKUNUR — DÜZENLEME/SİLME DÜĞMESİ YOK, VE BU BİR KARAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Rekor TÜRETİLMİŞ veri (ADR-021): servis yazma yolu açmıyor, çünkü elle
 * yazılan bir rekoru bir sonraki yeniden hesap sessizce ezerdi
 * (`services/personal-record.ts`). Rekoru düzeltmenin yolu KAYNAK SETİ
 * düzeltmek; boş durum metni de kullanıcıyı oraya yönlendiriyor.
 *
 * SIRA SERVİSİN: hareket, sonra tekrar ARTAN (1RM, 3RM, 5RM…). Ağırlığa göre
 * varsayılan sıralama 100×1 ile 100×10'u yan yana düşürür ve tekrar
 * bazındalığı görsel olarak kaybettirir. Sütun başlıkları yine de istemcide
 * sıralanabilir — ama başlangıç sırası bu.
 *
 * ⚠️ `workoutSetId === null` → "kaynaksız" rozeti. Normal akışta oluşmaz
 * (antrenman silinince eylem rekorları yeniden hesaplıyor); oluşursa
 * tutarsızlığın GÖRÜNÜR kalması `SetNull`ın varlık sebebi — DTO onu bu yüzden
 * taşıyor, ekran da bu yüzden çiziyor.
 *
 * KAYNAK ANTRENMANA BAĞLANTI YOK: DTO yalnızca `workoutSetId` taşıyor, set →
 * antrenman çözümü için servis bir okuma sunmuyor. Satır başına ek sorgu
 * kurmak yerine bağlantı bırakıldı (rapordaki bilinen sınır).
 */
export function RekorTablosu({
  rekorlar,
  hareketSutunu = true,
  bosBaslik = 'Henüz rekor yok',
  bosAciklama = 'Rekorlar ağırlıklı setlerden kendiliğinden hesaplanır. Bir antrenman açıp set girdiğinde burada görünür.',
}: {
  rekorlar: PersonalRecordDto[];
  hareketSutunu?: boolean;
  bosBaslik?: string;
  bosAciklama?: string;
}) {
  const sutunlar: Array<Sutun<PersonalRecordDto>> = [];

  if (hareketSutunu) {
    sutunlar.push(
      {
        anahtar: 'exerciseName',
        baslik: 'Hareket',
        deger: (r) => (
          <Link
            href={`/panel/spor/egzersizler/${r.exerciseId}`}
            className="focus-ring rounded-btn text-primary -m-1 p-1 font-medium"
          >
            {r.exerciseName}
          </Link>
        ),
        siralamaDegeri: (r) => r.exerciseName,
      },
      {
        anahtar: 'muscleGroup',
        baslik: 'Kas grubu',
        ikincil: true,
        deger: (r) => KAS_GRUBU[r.muscleGroup],
        siralamaDegeri: (r) => KAS_GRUBU[r.muscleGroup],
      },
    );
  }

  sutunlar.push(
    {
      anahtar: 'reps',
      baslik: 'Tekrar',
      sayisal: true,
      deger: (r) => <span className="whitespace-nowrap">{r.reps} tekrar</span>,
      siralamaDegeri: (r) => r.reps,
    },
    {
      anahtar: 'weightKg',
      baslik: 'Ağırlık',
      sayisal: true,
      deger: (r) => <span className="whitespace-nowrap">{olcuBicim(r.weightKg, 'kg')}</span>,
      siralamaDegeri: (r) => Number(r.weightKg),
    },
    {
      anahtar: 'date',
      baslik: 'Gün',
      sayisal: true,
      deger: (r) => (
        <span className="inline-flex flex-wrap items-center justify-end gap-1.5 whitespace-nowrap">
          {r.workoutSetId === null && <Badge variant="warning">kaynaksız</Badge>}
          {gunAyYil(r.date)}
        </span>
      ),
      siralamaDegeri: (r) => r.date,
    },
  );

  return (
    <VeriTablosu
      baslik="Kişisel rekorlar"
      satirlar={rekorlar}
      sutunlar={sutunlar}
      satirAnahtari={(r) => r.id}
      bosDurum={
        <EmptyState
          icon={Trophy}
          title={bosBaslik}
          description={bosAciklama}
          action={
            <Link href="/panel/spor/yeni" className={buttonClasses({ size: 'sm' })}>
              <Plus className="size-4" aria-hidden="true" />
              Antrenman gir
            </Link>
          }
        />
      }
    />
  );
}
