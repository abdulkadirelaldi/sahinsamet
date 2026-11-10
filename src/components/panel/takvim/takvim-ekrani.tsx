'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { buttonClasses } from '@/components/ui/button';
import type { TakvimKapsami } from '@/lib/schemas/takvim';
import { gunAraligi } from '@/lib/takvim/bicim';
import {
  donemBasligi,
  gezinTarih,
  gorunumAraligi,
  GORUNUMLER,
  GORUNUM_ADLARI,
  type TakvimEtkinligiVerisi,
  type TakvimGorunumu,
  type TakvimOlusumu,
} from '@/lib/takvim/gorunum';
import { cn } from '@/lib/utils/cn';
import {
  takvimEtkinligiGuncelleAction,
  takvimEtkinligiOlusturAction,
  takvimEtkinligiSilAction,
} from '@/server/actions/takvim';
import type { AppDay } from '@/server/services/_shared/app-date';
import type { ApiResponse } from '@/types';

import { Ajanda } from './ajanda';
import { AyGorunumu } from './ay-gorunumu';
import { EtkinlikDetayi } from './etkinlik-detayi';
import { duzenlemeFormu, EtkinlikFormu, yeniForm, type FormDurumu } from './etkinlik-formu';
import { Pencere } from './pencere';
import { ZamanIzgarasi } from './zaman-izgarasi';

type Durum =
  | { tur: 'kapali' }
  | { tur: 'yeni'; form: FormDurumu }
  | { tur: 'detay'; olusum: TakvimOlusumu; etkinlik: TakvimEtkinligiVerisi }
  | { tur: 'duzenle'; olusum: TakvimOlusumu; etkinlik: TakvimEtkinligiVerisi };

const PENCERE_BASLIGI: Record<Exclude<Durum['tur'], 'kapali'>, string> = {
  yeni: 'Yeni etkinlik',
  detay: 'Etkinlik',
  duzenle: 'Etkinliği düzenle',
};

export const takvimAdresi = (gorunum: TakvimGorunumu, tarih: AppDay) =>
  `/panel/takvim?gorunum=${gorunum}&tarih=${tarih}`;

/**
 * TAKVİM EKRANI (2026-11-10). Görünüm ve tarih ADRESTE (`?gorunum=ay&tarih=2026-11-10`): sayfa
 * sunucuda o aralığın oluşumlarıyla gelir, gezinme düz bağlantı — paylaşılabilir ve geri tuşu
 * çalışır. Pencere (yeni / ayrıntı / düzenle) istemci durumu; kaydedince sayfa tazelenir.
 */
export function TakvimEkrani({
  gorunum,
  tarih,
  bugun,
  etkinlikler,
  olusumlar,
}: {
  gorunum: TakvimGorunumu;
  tarih: AppDay;
  bugun: AppDay;
  etkinlikler: readonly TakvimEtkinligiVerisi[];
  olusumlar: readonly TakvimOlusumu[];
}) {
  const router = useRouter();
  const [durum, setDurum] = useState<Durum>({ tur: 'kapali' });
  const kapat = () => setDurum({ tur: 'kapali' });
  const { bas, son } = gorunumAraligi(gorunum, tarih);

  const yeni = (gun: AppDay, dk: number | null) =>
    setDurum({ tur: 'yeni', form: yeniForm(gun, dk) });
  const ac = (olusum: TakvimOlusumu) => {
    const etkinlik = etkinlikler.find((e) => e.id === olusum.etkinlikId);
    if (etkinlik) setDurum({ tur: 'detay', olusum, etkinlik });
  };
  const gunAdresi = (gun: AppDay) => takvimAdresi('gun', gun);

  const bitti = <T,>(sonuc: ApiResponse<T>): ApiResponse<T> => {
    if (sonuc.ok) {
      kapat();
      router.refresh();
    }
    return sonuc;
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Link
            href={takvimAdresi(gorunum, bugun)}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            Bugün
          </Link>
          <nav aria-label="Dönem" className="flex items-center gap-1">
            <Link
              href={takvimAdresi(gorunum, gezinTarih(gorunum, tarih, -1))}
              aria-label="Önceki"
              className="focus-ring text-body hover:bg-elevated flex size-9 items-center justify-center rounded-full"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href={takvimAdresi(gorunum, gezinTarih(gorunum, tarih, 1))}
              aria-label="Sonraki"
              className="focus-ring text-body hover:bg-elevated flex size-9 items-center justify-center rounded-full"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          </nav>
          <h2
            aria-live="polite"
            className="text-primary min-w-0 truncate text-base font-semibold sm:text-lg"
          >
            {donemBasligi(gorunum, tarih)}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <nav
            aria-label="Görünüm"
            className="bg-elevated flex flex-1 rounded-full p-1 sm:flex-none"
          >
            {GORUNUMLER.map((g) => (
              <Link
                key={g}
                href={takvimAdresi(g, tarih)}
                aria-current={g === gorunum ? 'page' : undefined}
                className={cn(
                  'focus-ring flex min-h-8 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors',
                  g === gorunum
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-muted hover:text-primary',
                )}
              >
                {GORUNUM_ADLARI[g]}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => yeni(tarih < bugun && gorunum !== 'gun' ? bugun : tarih, 9 * 60)}
            aria-haspopup="dialog"
            className={buttonClasses({ size: 'sm' })}
          >
            <Plus className="size-4" aria-hidden="true" />
            Yeni
          </button>
        </div>
      </div>

      {gorunum === 'ay' && (
        <AyGorunumu
          tarih={tarih}
          bugun={bugun}
          olusumlar={olusumlar}
          ac={ac}
          yeni={yeni}
          gunAdresi={gunAdresi}
        />
      )}
      {(gorunum === 'hafta' || gorunum === 'gun') && (
        <ZamanIzgarasi
          gunler={gunAraligi(bas, son)}
          bugun={bugun}
          olusumlar={olusumlar}
          ac={ac}
          yeni={yeni}
          gunAdresi={gunAdresi}
        />
      )}
      {gorunum === 'ajanda' && (
        <>
          <Ajanda bas={bas} son={son} bugun={bugun} olusumlar={olusumlar} ac={ac} yeni={yeni} />
          <Link
            href={takvimAdresi('ajanda', gezinTarih('ajanda', tarih, 1))}
            className="focus-ring text-accent self-center rounded text-sm font-medium"
          >
            Sonraki 30 gün →
          </Link>
        </>
      )}

      {durum.tur !== 'kapali' && (
        <Pencere baslik={PENCERE_BASLIGI[durum.tur]} kapat={kapat}>
          {durum.tur === 'yeni' && (
            <EtkinlikFormu
              ilk={durum.form}
              seriTekrarli={false}
              vazgec={kapat}
              kaydet={async (girdi) => bitti(await takvimEtkinligiOlusturAction(girdi))}
            />
          )}
          {durum.tur === 'detay' && (
            <EtkinlikDetayi
              olusum={durum.olusum}
              etkinlik={durum.etkinlik}
              duzenle={() => setDurum({ ...durum, tur: 'duzenle' })}
              sil={async (kapsam: TakvimKapsami) =>
                bitti(
                  await takvimEtkinligiSilAction({
                    id: durum.etkinlik.id,
                    kapsam,
                    olusumGun: durum.olusum.gun,
                  }),
                )
              }
            />
          )}
          {durum.tur === 'duzenle' && (
            <EtkinlikFormu
              ilk={duzenlemeFormu(durum.etkinlik, durum.olusum)}
              seriTekrarli={durum.etkinlik.tekrar.tur !== 'YOK'}
              vazgec={() => setDurum({ ...durum, tur: 'detay' })}
              kaydet={async (girdi, kapsam) =>
                bitti(
                  await takvimEtkinligiGuncelleAction({
                    ...(girdi as object),
                    id: durum.etkinlik.id,
                    kapsam,
                    olusumGun: durum.olusum.gun,
                  }),
                )
              }
            />
          )}
        </Pencere>
      )}
    </div>
  );
}
