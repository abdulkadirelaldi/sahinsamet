'use client';

import { Bell, Plus, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  EN_COK_HATIRLATMA,
  EN_UZUN_HATIRLATMA_DK,
  hatirlatmaEtiketi,
  SAATLI_SECENEKLER,
  TUM_GUN_SECENEKLERI,
} from '@/lib/takvim/hatirlatma';
import { cn } from '@/lib/utils/cn';

/**
 * HATIRLATMA SEÇİCİ (2026-11-12) — etkinlik formundan ayrıldı: spor programını takvime ekleme
 * penceresi de aynı seçiciyi kullanıyor (hazır süreler + "Özel…", en çok 5).
 */

const OZEL_BIRIMLER = [
  { dk: 1, ad: 'dakika' },
  { dk: 60, ad: 'saat' },
  { dk: 1440, ad: 'gün' },
  { dk: 10080, ad: 'hafta' },
] as const;

const SECIM =
  'focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm';

export function HatirlatmaSecici({
  tumGun,
  hatirlatmalar,
  degistir,
  hata,
}: {
  tumGun: boolean;
  hatirlatmalar: number[];
  degistir: (hatirlatmalar: number[]) => void;
  hata?: ReactNode;
}) {
  const [ozelSayi, setOzelSayi] = useState('');
  const [ozelBirim, setOzelBirim] = useState(60);
  const secenekler = (tumGun ? TUM_GUN_SECENEKLERI : SAATLI_SECENEKLER).filter(
    (dk) => !hatirlatmalar.includes(dk),
  );
  const hatirlatmaEkle = (dk: number) =>
    degistir([...new Set([...hatirlatmalar, dk])].sort((a, b) => a - b));
  const ozelHatirlatmaDk = Number(ozelSayi) * ozelBirim;
  const ozelGecerli =
    Number.isInteger(Number(ozelSayi)) &&
    Number(ozelSayi) >= 0 &&
    ozelSayi !== '' &&
    ozelHatirlatmaDk <= EN_UZUN_HATIRLATMA_DK;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-primary mb-1.5 text-sm font-medium">Hatırlatmalar</legend>
      {hatirlatmalar.length === 0 && (
        <p className="text-muted text-sm">Hatırlatma yok — bildirim gelmez.</p>
      )}
      <ul className="flex flex-col gap-1.5">
        {hatirlatmalar.map((dk) => {
          const ad = hatirlatmaEtiketi(dk, tumGun);
          return (
            <li
              key={dk}
              className="bg-elevated flex min-h-11 items-center gap-2 rounded-xl pr-1 pl-3 text-sm"
            >
              <Bell className="text-muted size-4 shrink-0" aria-hidden="true" />
              <span className="text-body flex-1">{ad}</span>
              <button
                type="button"
                aria-label={`${ad} hatırlatmasını kaldır`}
                onClick={() => degistir(hatirlatmalar.filter((x) => x !== dk))}
                className="focus-ring text-muted hover:text-danger flex size-9 items-center justify-center rounded-full"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {hatirlatmalar.length < EN_COK_HATIRLATMA && (
        <div className="flex flex-col gap-2">
          <select
            aria-label="Hatırlatma ekle"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'ozel') {
                setOzelSayi(tumGun ? '3' : '45');
                setOzelBirim(tumGun ? 1440 : 1);
              } else if (v) hatirlatmaEkle(Number(v));
            }}
            className={SECIM}
          >
            <option value="">+ Hatırlatma ekle</option>
            {secenekler.map((dk) => (
              <option key={dk} value={dk}>
                {hatirlatmaEtiketi(dk, tumGun)}
              </option>
            ))}
            <option value="ozel">Özel…</option>
          </select>
          {ozelSayi !== '' && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                aria-label="Özel hatırlatma süresi"
                value={ozelSayi}
                onChange={(e) => setOzelSayi(e.target.value)}
                className="w-20"
              />
              <select
                aria-label="Birim"
                value={ozelBirim}
                onChange={(e) => setOzelBirim(Number(e.target.value))}
                className={cn(SECIM, 'w-auto flex-1')}
              >
                {OZEL_BIRIMLER.map((b) => (
                  <option key={b.dk} value={b.dk}>
                    {b.ad} önce
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={!ozelGecerli}
                onClick={() => {
                  hatirlatmaEkle(ozelHatirlatmaDk);
                  setOzelSayi('');
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Ekle
              </Button>
            </div>
          )}
        </div>
      )}
      {hata}
    </fieldset>
  );
}
