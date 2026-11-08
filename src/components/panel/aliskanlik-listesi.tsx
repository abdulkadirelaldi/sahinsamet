'use client';

import { ArchiveRestore, ArrowDown, ArrowUp, Pencil, Plus, Repeat } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AliskanlikRozeti } from '@/components/panel/aliskanlik-rozeti';
import { ArsivleDugmesi } from '@/components/panel/arsivle-dugmesi';
import { sureBicim } from '@/components/panel/hayat-bicim';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-error';
import { archiveHabitAction, moveHabitAction } from '@/server/actions/habit';
import type { HabitDto } from '@/server/services/habit';

/**
 * ALIŞKANLIK LİSTESİ — §4.2 `/panel/hayat/aliskanliklar`, T-115.
 *
 * `musteriler-ekrani.tsx` kalıbı: arşivle satırda (onaylı), arşivden çıkar
 * satırda (onaysız — geri alınabilir bir işlemin tersi yıkıcı değil).
 *
 * ⚠️ SİLME YOK ve bu bir eksik değil: `HabitLog.habitId` CASCADE, yani
 * silme aylarca tutulmuş işaretleri SESSİZCE götürürdü (`services/habit.ts`).
 * Arşiv bildirimi bunu açıkça söylüyor — "SİLİNMEDİ, işaretler duruyor".
 */

function hedefMetni(h: HabitDto): string {
  const hafta = h.targetPerWeek >= 7 ? 'Her gün' : `Haftada ${h.targetPerWeek} gün`;
  if (h.targetPerDay === null) return hafta;
  return `${hafta} · günde ${h.sureli ? sureBicim(h.targetPerDay) : h.targetPerDay}`;
}

export function AliskanlikListesi({
  aliskanliklar,
  toplam,
  bosBaslik,
  bosAciklama,
}: {
  aliskanliklar: HabitDto[];
  toplam: number;
  bosBaslik: string;
  bosAciklama: string;
}) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [calisan, setCalisan] = useState<string | null>(null);

  const arsivdenCikar = async (h: HabitDto) => {
    setCalisan(h.id);
    setHata(null);
    try {
      const sonuc = await archiveHabitAction({ id: h.id, isArchived: false });
      if (sonuc.ok) {
        setBildirim(`"${h.name}" arşivden çıkarıldı.`);
        router.refresh();
      } else {
        setHata(sonuc.error.message);
      }
    } catch {
      setHata('İşlem tamamlanamadı — bağlantı kurulamadı. Kayıt olduğu gibi duruyor.');
    } finally {
      setCalisan(null);
    }
  };

  /** Günlük listedeki sırayı bir basamak taşır (2026-10-29). */
  const tasi = async (h: HabitDto, yon: 'yukari' | 'asagi') => {
    setCalisan(h.id);
    setHata(null);
    try {
      const sonuc = await moveHabitAction({ id: h.id, yon });
      if (sonuc.ok) router.refresh();
      else setHata(sonuc.error.message);
    } catch {
      setHata('Sıra değiştirilemedi — bağlantı kurulamadı.');
    } finally {
      setCalisan(null);
    }
  };

  const sutunlar: ReadonlyArray<Sutun<HabitDto>> = [
    {
      anahtar: 'name',
      baslik: 'Alışkanlık',
      deger: (h) => (
        <Link
          href={`/panel/hayat/aliskanliklar/${h.id}`}
          className="focus-ring rounded-btn text-primary -m-1 flex items-center gap-2 p-1 font-medium"
        >
          <AliskanlikRozeti ad={h.name} simge={h.icon} renk={h.color} boyut="kucuk" />
          <span>{h.name}</span>
        </Link>
      ),
      siralamaDegeri: (h) => h.name,
    },
    {
      anahtar: 'hedef',
      baslik: 'Hedef',
      ikincil: true,
      deger: (h) => <span className="tabular text-body text-xs">{hedefMetni(h)}</span>,
      siralamaDegeri: (h) => h.targetPerWeek,
    },
    {
      anahtar: 'durum',
      baslik: 'Durum',
      deger: (h) =>
        h.isArchived ? (
          <Badge variant="warning">Arşiv</Badge>
        ) : h.isActive ? (
          <Badge variant="success">Panoda</Badge>
        ) : (
          <Badge variant="neutral">Ara verildi</Badge>
        ),
      siralamaDegeri: (h) => (h.isArchived ? 2 : h.isActive ? 0 : 1),
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (h) => (
        <div className="flex flex-wrap items-start justify-end gap-1">
          {!h.isArchived && (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={calisan !== null}
                onClick={() => tasi(h, 'yukari')}
                aria-label={`${h.name}: yukarı taşı`}
              >
                <ArrowUp className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={calisan !== null}
                onClick={() => tasi(h, 'asagi')}
                aria-label={`${h.name}: aşağı taşı`}
              >
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </Button>
            </>
          )}
          <Link
            href={`/panel/hayat/aliskanliklar/${h.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
            <span className="sr-only"> {h.name}</span>
          </Link>

          {h.isArchived ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={calisan !== null}
              onClick={() => void arsivdenCikar(h)}
            >
              <ArchiveRestore className="size-3.5" aria-hidden="true" />
              Arşivden çıkar
            </Button>
          ) : (
            <ArsivleDugmesi
              kayitAdi={h.name}
              arsivle={async () => {
                const sonuc = await archiveHabitAction({ id: h.id, isArchived: true });
                if (sonuc.ok) {
                  setBildirim(
                    `"${h.name}" arşivlendi. SİLİNMEDİ — geçmiş işaretleri olduğu gibi duruyor; Arşiv sekmesinden geri alabilirsin.`,
                  );
                  router.refresh();
                }
                return sonuc;
              }}
            />
          )}
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

      {hata && <FormAlert>{hata}</FormAlert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          <span className="tabular">{toplam}</span> alışkanlık
        </p>

        <Link href="/panel/hayat/aliskanliklar/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni alışkanlık
        </Link>
      </div>

      <VeriTablosu
        baslik="Alışkanlıklar"
        satirlar={aliskanliklar}
        sutunlar={sutunlar}
        satirAnahtari={(h) => h.id}
        bosDurum={
          <EmptyState
            icon={Repeat}
            title={bosBaslik}
            description={bosAciklama}
            action={
              <Link
                href="/panel/hayat/aliskanliklar/yeni"
                className={buttonClasses({ size: 'sm' })}
              >
                <Plus className="size-4" aria-hidden="true" />
                Alışkanlık ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
