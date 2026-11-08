'use client';

import { Pencil, Plus, Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { HEDEF_DURUM_ROZETI, gunAyYil, kalanGunMetni } from '@/components/panel/hayat-bicim';
import { HedefIlerleme } from '@/components/panel/hedef-ilerleme';
import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { HEDEF_DURUMU, HEDEF_KATEGORISI } from '@/components/panel/kisisel-etiketler';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { deleteGoalAction } from '@/server/actions/goal';
import type { GoalDto } from '@/server/services/goal';

/**
 * HEDEF LİSTESİ — §4.2 `/panel/hayat/hedefler`, T-115.
 *
 * GERÇEK SİLME (`Goal`a bağlı FK yok, `services/goal.ts`). "Vazgeçtim"i kayıt
 * altında tutmak isteyen için `ABANDONED` durumu var; onay metni bunu
 * hatırlatıyor — silme "hiç olmamalıydı" demek.
 *
 * KALAN GÜN YALNIZCA AÇIK HEDEFTE: ulaşılmış ya da vazgeçilmiş bir hedefin
 * "40 gün gecikti" rozeti yanlış bir alarm olurdu — tarih geçti ama hedef
 * zaten kapandı. Kapalı hedefte yalnızca tarih yazılıyor.
 */

const acik = (h: GoalDto) => h.status === 'ACTIVE' || h.status === 'PAUSED';

export function HedefListesi({
  hedefler,
  toplam,
  bosBaslik,
  bosAciklama,
}: {
  hedefler: GoalDto[];
  toplam: number;
  bosBaslik: string;
  bosAciklama: string;
}) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);

  const sutunlar: ReadonlyArray<Sutun<GoalDto>> = [
    {
      anahtar: 'title',
      baslik: 'Hedef',
      deger: (h) => (
        <Link
          href={`/panel/hayat/hedefler/${h.id}`}
          className="focus-ring rounded-btn -m-1 flex flex-col p-1"
        >
          <span className="text-primary font-medium break-words">{h.title}</span>
          <span className="text-muted text-xs">{HEDEF_KATEGORISI[h.category]}</span>
        </Link>
      ),
      siralamaDegeri: (h) => h.title,
    },
    {
      anahtar: 'status',
      baslik: 'Durum',
      deger: (h) => <Badge variant={HEDEF_DURUM_ROZETI[h.status]}>{HEDEF_DURUMU[h.status]}</Badge>,
      siralamaDegeri: (h) => h.status,
    },
    {
      anahtar: 'progress',
      baslik: 'İlerleme',
      deger: (h) => (
        <HedefIlerleme baslik={`${h.title} ilerlemesi`} ilerleme={h.progress} className="w-32" />
      ),
      siralamaDegeri: (h) => h.progress,
    },
    {
      anahtar: 'targetDate',
      baslik: 'Hedef tarih',
      ikincil: true,
      deger: (h) => {
        if (!h.targetDate) return <span className="text-muted">—</span>;
        const kalan = acik(h) ? kalanGunMetni(h.daysLeft) : null;
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="tabular text-body text-xs whitespace-nowrap">
              {gunAyYil(h.targetDate)}
            </span>
            {kalan && <Badge variant={kalan.ton}>{kalan.metin}</Badge>}
          </div>
        );
      },
      siralamaDegeri: (h) => h.targetDate ?? '9999-12-31',
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (h) => (
        <div className="flex items-start justify-end gap-1">
          <Link
            href={`/panel/hayat/hedefler/${h.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{h.title} hedefini düzenle</span>
          </Link>
          <KaliciSilDugmesi
            kayitAdi={h.title}
            aciklama="Vazgeçtiğin bir hedefi kayıtta tutmak istiyorsan silmek yerine durumunu “Vazgeçildi” yap."
            sil={async () => {
              const sonuc = await deleteGoalAction({ id: h.id });
              if (sonuc.ok) {
                setBildirim(`"${h.title}" silindi.`);
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          <span className="tabular">{toplam}</span> hedef · açık hedefler ve en yakın tarih üstte
        </p>

        <Link href="/panel/hayat/hedefler/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni hedef
        </Link>
      </div>

      <VeriTablosu
        baslik="Hedefler"
        satirlar={hedefler}
        sutunlar={sutunlar}
        satirAnahtari={(h) => h.id}
        bosDurum={
          <EmptyState
            icon={Target}
            title={bosBaslik}
            description={bosAciklama}
            action={
              <Link href="/panel/hayat/hedefler/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                Hedef ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
