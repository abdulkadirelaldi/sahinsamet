'use client';

import { Dumbbell, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';

import { gunAyYil } from '@/components/panel/hayat-bicim';
import { ANTRENMAN_TURU, RUH_HALI } from '@/components/panel/kisisel-etiketler';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { WorkoutListItemDto } from '@/server/services/workout';

/**
 * ANTRENMAN LİSTESİ — §4.2 `/panel/spor`, T-114.
 *
 * SİLME LİSTEDE YOK, DETAYDA VAR — ve bu `SaglikEkrani`ndan bilinçli bir fark.
 * Bir sağlık kaydını silmek tek satırı götürüyor; bir antrenmanı silmek
 * SETLERİNİ de (cascade) götürüyor ve REKORLARI yeniden hesaplatıyor
 * (`deleteWorkoutAction`). Satırdaki küçük bir çöp kutusu bu ağırlığı
 * taşımıyor: kullanıcı neyi sildiğini — kaç set, hangi hareketler — detayda
 * görerek silmeli.
 *
 * `setCount` sütunu tam bu yüzden duruyor: "bu antrenmanda ne var" sorusunun
 * listeden okunabilen cevabı. Sıfır setli antrenman da GÖRÜNÜR — oluşturulup
 * seti girilmemiş bir kaydı bulmanın yolu bu.
 */
export function AntrenmanListesi({
  antrenmanlar,
  toplam,
}: {
  antrenmanlar: WorkoutListItemDto[];
  toplam: number;
}) {
  const sutunlar: ReadonlyArray<Sutun<WorkoutListItemDto>> = [
    {
      anahtar: 'date',
      baslik: 'Gün',
      sayisal: true,
      deger: (a) => (
        <Link
          href={`/panel/spor/${a.id}`}
          className="focus-ring rounded-btn text-primary -m-1 p-1 font-medium whitespace-nowrap"
        >
          {gunAyYil(a.date)}
        </Link>
      ),
      siralamaDegeri: (a) => a.date,
    },
    {
      anahtar: 'type',
      baslik: 'Tür',
      deger: (a) => ANTRENMAN_TURU[a.type],
      siralamaDegeri: (a) => ANTRENMAN_TURU[a.type],
    },
    {
      anahtar: 'setCount',
      baslik: 'Set',
      sayisal: true,
      deger: (a) => a.setCount,
      siralamaDegeri: (a) => a.setCount,
    },
    {
      anahtar: 'durationMin',
      baslik: 'Süre',
      sayisal: true,
      ikincil: true,
      deger: (a) => (a.durationMin === null ? '—' : `${a.durationMin} dk`),
      siralamaDegeri: (a) => a.durationMin ?? -1,
    },
    {
      anahtar: 'feeling',
      baslik: 'His',
      ikincil: true,
      deger: (a) => (a.feeling ? RUH_HALI[a.feeling] : '—'),
      siralamaDegeri: (a) => a.feeling ?? 0,
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (a) => (
        <div className="flex justify-end">
          <Link
            href={`/panel/spor/${a.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{gunAyYil(a.date)} antrenmanını aç</span>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted text-sm">
        <span className="tabular">{toplam}</span> antrenman · en yeni gün üstte
      </p>

      <VeriTablosu
        baslik="Antrenmanlar"
        satirlar={antrenmanlar}
        sutunlar={sutunlar}
        satirAnahtari={(a) => a.id}
        bosDurum={
          <EmptyState
            icon={Dumbbell}
            title="Henüz antrenman yok"
            description="Bir antrenman aç, ardından setlerini gir — rekorlar setlerden kendiliğinden hesaplanır."
            action={
              <Link href="/panel/spor/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                İlk antrenmanı ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
