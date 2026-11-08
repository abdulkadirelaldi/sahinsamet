'use client';

import { ArchiveRestore, Dumbbell, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ArsivleDugmesi } from '@/components/panel/arsivle-dugmesi';
import { EKIPMAN, KAS_GRUBU } from '@/components/panel/kisisel-etiketler';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-error';
import { archiveExerciseAction } from '@/server/actions/exercise';
import type { ExerciseWithRecordCountDto } from '@/server/services/exercise';

/**
 * EGZERSİZ KÜTÜPHANESİ — §4.2 `/panel/spor/egzersizler`, T-114.
 * `MusterilerEkrani`nin kalıbı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARŞİVLE ≠ SİL — VE `recordCount` BUNU GÖSTEREN SAYI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Exercise` silinmiyor: `WorkoutSet.exerciseId` ve `PersonalRecord.exerciseId`
 * ikisi de `Restrict` — silme eylemi YAZILMADI, çünkü asla çalışmayacak bir
 * düğme olurdu (`actions/exercise.ts`). `recordCount` sütunu "bu hareket neden
 * silinemiyor / arşivlersem rekorlarım ne olur" sorusunun cevabı; arşiv
 * bildirimi de o sayıyı söylüyor.
 *
 * Arşivden geri alma satırda, onaysız (`MusterilerEkrani` ile aynı karar):
 * eylem iki yönlü ve geri almak yıkıcı değil.
 */
export function EgzersizListesi({
  egzersizler,
  toplam,
  bosBaslik,
  bosAciklama,
}: {
  egzersizler: ExerciseWithRecordCountDto[];
  toplam: number;
  bosBaslik: string;
  bosAciklama: string;
}) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [calisan, setCalisan] = useState<string | null>(null);

  const arsivMetni = (e: ExerciseWithRecordCountDto) =>
    `"${e.name}" arşivlendi. SİLİNMEDİ — ${e.recordCount} rekoru ve eski setleri olduğu gibi duruyor; yalnızca yeni set seçiminden çıktı. Arşiv sekmesinden geri alabilirsin.`;

  const arsivdenCikar = async (e: ExerciseWithRecordCountDto) => {
    setCalisan(e.id);
    setHata(null);
    try {
      const sonuc = await archiveExerciseAction({ id: e.id, isArchived: false });
      if (sonuc.ok) {
        setBildirim(`"${e.name}" arşivden çıkarıldı; yeni set için yeniden seçilebilir.`);
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

  const sutunlar: ReadonlyArray<Sutun<ExerciseWithRecordCountDto>> = [
    {
      anahtar: 'name',
      baslik: 'Hareket',
      deger: (e) => (
        <Link
          href={`/panel/spor/egzersizler/${e.id}`}
          className="focus-ring rounded-btn -m-1 flex flex-col p-1"
        >
          <span className="text-primary font-medium">{e.name}</span>
          <span className="text-muted text-xs">{EKIPMAN[e.equipment]}</span>
        </Link>
      ),
      siralamaDegeri: (e) => e.name,
    },
    {
      anahtar: 'muscleGroup',
      baslik: 'Kas grubu',
      deger: (e) => KAS_GRUBU[e.muscleGroup],
      siralamaDegeri: (e) => KAS_GRUBU[e.muscleGroup],
    },
    {
      anahtar: 'durum',
      baslik: 'Durum',
      ikincil: true,
      deger: (e) =>
        e.isArchived ? (
          <Badge variant="warning">Arşiv</Badge>
        ) : (
          <Badge variant="success">Aktif</Badge>
        ),
      siralamaDegeri: (e) => (e.isArchived ? 1 : 0),
    },
    {
      anahtar: 'recordCount',
      baslik: 'Rekor',
      sayisal: true,
      /* "Arşivlersem rekorlarım ne olur" sorusunun cevabı — yukarıdaki nota bakınız. */
      deger: (e) =>
        e.recordCount > 0 ? (
          <Link
            href={`/panel/spor/rekorlar?egzersiz=${e.id}`}
            className="focus-ring rounded-btn text-primary -m-1 p-1 underline-offset-4 hover:underline"
          >
            {e.recordCount}
            <span className="sr-only"> — {e.name} rekorlarını gör</span>
          </Link>
        ) : (
          0
        ),
      siralamaDegeri: (e) => e.recordCount,
    },
    {
      anahtar: 'eylem',
      baslik: 'İşlem',
      deger: (e) => (
        <div className="flex flex-wrap items-start justify-end gap-1">
          <Link
            href={`/panel/spor/egzersizler/${e.id}`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Düzenle</span>
          </Link>

          {e.isArchived ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={calisan !== null}
              onClick={() => void arsivdenCikar(e)}
            >
              <ArchiveRestore className="size-3.5" aria-hidden="true" />
              Arşivden çıkar
            </Button>
          ) : (
            <ArsivleDugmesi
              kayitAdi={e.name}
              arsivle={async () => {
                const sonuc = await archiveExerciseAction({ id: e.id, isArchived: true });
                if (sonuc.ok) {
                  setBildirim(arsivMetni(e));
                  router.refresh();
                } else {
                  setHata(sonuc.error.message);
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

      <p className="text-muted text-sm">
        <span className="tabular">{toplam}</span> hareket · kas grubuna, sonra ada göre
      </p>

      <VeriTablosu
        baslik="Egzersiz kütüphanesi"
        satirlar={egzersizler}
        sutunlar={sutunlar}
        satirAnahtari={(e) => e.id}
        bosDurum={
          <EmptyState
            icon={Dumbbell}
            title={bosBaslik}
            description={bosAciklama}
            action={
              <Link href="/panel/spor/egzersizler/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                Egzersiz ekle
              </Link>
            }
          />
        }
      />
    </div>
  );
}
