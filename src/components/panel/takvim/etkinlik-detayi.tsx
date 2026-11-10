'use client';

import { Bell, CalendarDays, Loader2, MapPin, Pencil, Repeat, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-error';
import type { TakvimKapsami } from '@/lib/schemas/takvim';
import { gunBasligi, tekrarOzeti } from '@/lib/takvim/bicim';
import {
  olusumZamanMetni,
  type TakvimEtkinligiVerisi,
  type TakvimOlusumu,
} from '@/lib/takvim/gorunum';
import { hatirlatmaEtiketi } from '@/lib/takvim/hatirlatma';
import { TAKVIM_KATEGORILERI } from '@/lib/takvim/kategoriler';
import { toAppDay } from '@/server/services/_shared/app-date';
import { cn } from '@/lib/utils/cn';
import type { ApiResponse } from '@/types';

import { KapsamSecici } from './etkinlik-formu';

/** Oluşum ayrıntısı: zaman, tekrar, konum, hatırlatmalar; düzenle ve sil (2026-11-10). */
export function EtkinlikDetayi({
  olusum,
  etkinlik,
  duzenle,
  sil,
}: {
  olusum: TakvimOlusumu;
  etkinlik: TakvimEtkinligiVerisi;
  duzenle: () => void;
  sil: (kapsam: TakvimKapsami) => Promise<ApiResponse<unknown>>;
}) {
  const [silAdimi, setSilAdimi] = useState(false);
  const [kapsam, setKapsam] = useState<TakvimKapsami>('tek');
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const duzenleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!silAdimi) duzenleRef.current?.focus();
  }, [silAdimi]);
  const kategori = TAKVIM_KATEGORILERI[etkinlik.kategori];
  const tekrarli = etkinlik.tekrar.tur !== 'YOK';

  const onayla = async (k: TakvimKapsami) => {
    setBekliyor(true);
    setHata(null);
    try {
      const sonuc = await sil(k);
      if (!sonuc.ok) setHata(sonuc.error.message);
    } catch {
      setHata('Silinemedi — bağlantı kurulamadı. Etkinlik olduğu gibi duruyor.');
    } finally {
      setBekliyor(false);
    }
  };

  if (silAdimi && tekrarli) {
    return (
      <KapsamSecici
        baslik="Tekrarlayan etkinliği sil"
        secenekler={['tek', 'sonraki', 'tum']}
        secili={kapsam}
        sec={setKapsam}
        bekliyor={bekliyor}
        hata={hata}
        onayMetni="Sil"
        tehlikeli
        onayla={() => void onayla(kapsam)}
        vazgec={() => setSilAdimi(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn('mt-1.5 size-3 shrink-0 rounded-full', kategori.nokta)}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-primary text-xl font-semibold tracking-tight break-words">
            {etkinlik.baslik}
          </p>
          <p className="text-muted text-sm">{kategori.ad}</p>
        </div>
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        <Satir ikon={<CalendarDays className="size-4" aria-hidden="true" />} ad="Zaman">
          {gunBasligi(olusum.gun)}
          {olusum.gun.slice(0, 4) !== toAppDay(new Date()).slice(0, 4) &&
            ` ${olusum.gun.slice(0, 4)}`}
          {' · '}
          {olusumZamanMetni(olusum)}
        </Satir>
        {tekrarli && (
          <Satir ikon={<Repeat className="size-4" aria-hidden="true" />} ad="Tekrar">
            {tekrarOzeti(etkinlik.tekrar, toAppDay(new Date(etkinlik.baslangic)))}
          </Satir>
        )}
        {etkinlik.konum && (
          <Satir ikon={<MapPin className="size-4" aria-hidden="true" />} ad="Konum">
            {etkinlik.konum}
          </Satir>
        )}
        <Satir ikon={<Bell className="size-4" aria-hidden="true" />} ad="Hatırlatmalar">
          {etkinlik.hatirlatmalar.length === 0
            ? 'Yok'
            : etkinlik.hatirlatmalar.map((dk) => hatirlatmaEtiketi(dk, etkinlik.tumGun)).join(', ')}
        </Satir>
      </dl>

      {etkinlik.aciklama && (
        <p className="text-body bg-elevated rounded-xl p-3 text-sm whitespace-pre-line">
          {etkinlik.aciklama}
        </p>
      )}
      {etkinlik.seriId && (
        <p className="text-muted text-xs">
          Tekrarlayan bir etkinliğin yalnızca bu günü değiştirildi.
        </p>
      )}

      {silAdimi ? (
        <div
          role="group"
          aria-label="Silme onayı"
          className="border-line bg-elevated rounded-card flex flex-col gap-2 border p-3"
        >
          <p className="text-body text-sm">
            <span className="text-primary font-medium">{etkinlik.baslik}</span> kalıcı olarak
            silinir.
          </p>
          {hata && <FormAlert>{hata}</FormAlert>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="danger"
              disabled={bekliyor}
              onClick={() => void onayla('tum')}
            >
              {bekliyor ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              Evet, sil
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSilAdimi(false)}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button ref={duzenleRef} type="button" onClick={duzenle} className="flex-1">
            <Pencil className="size-4" aria-hidden="true" />
            Düzenle
          </Button>
          <Button type="button" variant="danger" onClick={() => setSilAdimi(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Sil
          </Button>
        </div>
      )}
    </div>
  );
}

function Satir({ ikon, ad, children }: { ikon: ReactNode; ad: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="text-muted mt-0.5">
        {ikon}
        <span className="sr-only">{ad}</span>
      </dt>
      <dd className="text-body min-w-0 break-words">{children}</dd>
    </div>
  );
}
