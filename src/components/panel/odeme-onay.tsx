'use client';

import { CalendarClock, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { miktarBicim } from '@/components/panel/cuzdan-bicim';
import { cn } from '@/lib/utils/cn';
import { odemeGeriAlAction, odemeIsleAction } from '@/server/actions/cuzdan';
import type { BekleyenOdeme, IslenenOdeme } from '@/server/services/odeme-onay';
import type { WalletUnit } from '@/types';

function vadeMetni(kala: number): string {
  if (kala < 0) return `${-kala} gün gecikti`;
  if (kala === 0) return 'Bugün';
  return kala === 1 ? 'Yarın' : `${kala} gün sonra`;
}

export interface OdemeHesabi {
  id: string;
  name: string;
  unit: WalletUnit;
  balance: string;
}

/**
 * ÖDEME ONAYI (2026-11-01): "Ödendi" → aynı birimde hesap varsa hangisinden
 * düşeceği sorulur (düşmeden de işlenir); "Atla" bu ayı kapatır. Tutar sunucuda
 * kaynaktan okunur. `islenenler` verilirse işlenen kayıtlar "Geri al" ile listelenir.
 */
export function OdemeOnay({
  odemeler,
  hesaplar,
  islenenler = [],
}: {
  odemeler: BekleyenOdeme[];
  hesaplar: OdemeHesabi[];
  islenenler?: IslenenOdeme[];
}) {
  return (
    <section
      aria-labelledby="odeme-baslik"
      className="rounded-card border-line bg-surface flex flex-col gap-2 border p-4"
    >
      <h3 id="odeme-baslik" className="text-muted flex items-center gap-2 text-xs font-medium">
        <CalendarClock className="size-4" aria-hidden="true" />
        Ödemeler
      </h3>
      {odemeler.length === 0 ? (
        <p className="text-muted text-sm">7 gün içinde bekleyen ödeme yok ✓</p>
      ) : (
        <ul className="divide-line flex flex-col divide-y">
          {odemeler.map((o) => (
            <Satir
              key={`${o.kaynakTur}-${o.kaynakId}-${o.donem}`}
              odeme={o}
              hesaplar={hesaplar.filter((h) => h.unit === o.unit)}
            />
          ))}
        </ul>
      )}
      {islenenler.length > 0 && (
        <details className="group">
          <summary className="text-muted focus-ring min-h-10 cursor-pointer content-center text-sm">
            İşlenenler ({islenenler.length})
          </summary>
          <ul className="divide-line flex flex-col divide-y">
            {islenenler.map((o) => (
              <IslenenSatir key={`${o.kaynakTur}-${o.kaynakId}-${o.donem}`} odeme={o} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function IslenenSatir({ odeme }: { odeme: IslenenOdeme }) {
  const router = useRouter();
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  const geriAl = () => {
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await odemeGeriAlAction({
          kaynakTur: odeme.kaynakTur,
          kaynakId: odeme.kaynakId,
          donem: odeme.donem,
        });
        if (sonuc.ok) router.refresh();
        else setHata(sonuc.error.message);
      } catch {
        setHata('Bağlantı kurulamadı. Yeniden dene.');
      }
    });
  };

  return (
    <li className="flex flex-col gap-1 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-primary truncate text-sm font-medium">{odeme.ad}</span>
          <span className="text-muted text-xs">
            {odeme.donem} · {odeme.durum === 'ODENDI' ? 'Ödendi' : 'Atlandı'}
            {odeme.tutar && ` · ${miktarBicim(odeme.tutar, odeme.unit)}`}
          </span>
        </span>
        <button
          type="button"
          disabled={bekliyor}
          onClick={geriAl}
          aria-label={`${odeme.ad}: geri al`}
          className="focus-ring bg-elevated text-body min-h-10 shrink-0 rounded-full px-4 text-sm font-medium disabled:opacity-60"
        >
          Geri al
        </button>
      </div>
      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}
    </li>
  );
}

function Satir({ odeme, hesaplar }: { odeme: BekleyenOdeme; hesaplar: OdemeHesabi[] }) {
  const router = useRouter();
  const [secim, setSecim] = useState(false);
  const [hesapId, setHesapId] = useState(hesaplar[0]?.id ?? '');
  const [hata, setHata] = useState<string | null>(null);
  const [bitti, setBitti] = useState(false);
  const [bekliyor, basla] = useTransition();

  const isle = (durum: 'ODENDI' | 'ATLANDI', hesap?: string) => {
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await odemeIsleAction({
          kaynakTur: odeme.kaynakTur,
          kaynakId: odeme.kaynakId,
          donem: odeme.donem,
          durum,
          ...(hesap ? { hesapId: hesap } : {}),
        });
        if (sonuc.ok) {
          setBitti(true);
          router.refresh();
        } else setHata(sonuc.error.message);
      } catch {
        setHata('Bağlantı kurulamadı. Yeniden dene.');
      }
    });
  };

  if (bitti) {
    return (
      <li className="text-success flex items-center gap-2 py-2.5 text-sm">
        <Check className="size-4" aria-hidden="true" />
        {odeme.ad} işlendi
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-primary truncate text-sm font-medium">{odeme.ad}</span>
          <span className={cn('text-xs', odeme.kala <= 2 ? 'text-danger' : 'text-muted')}>
            {vadeMetni(odeme.kala)}
          </span>
        </span>
        <span className="tabular text-primary shrink-0 text-sm font-semibold">
          {miktarBicim(odeme.tutar, odeme.unit)}
        </span>
      </div>

      {secim ? (
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor={`hesap-${odeme.kaynakId}`}>
            {odeme.ad}: düşülecek hesap
          </label>
          <select
            id={`hesap-${odeme.kaynakId}`}
            value={hesapId}
            onChange={(e) => setHesapId(e.target.value)}
            className="focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 border px-3 text-sm"
          >
            {hesaplar.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} · {miktarBicim(h.balance, h.unit)}
              </option>
            ))}
            <option value="">Hesaptan düşme</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={bekliyor}
              onClick={() => isle('ODENDI', hesapId || undefined)}
              className="focus-ring rounded-btn bg-gradient-accent min-h-10 flex-1 text-sm font-medium text-white disabled:opacity-60"
            >
              Onayla
            </button>
            <button
              type="button"
              onClick={() => setSecim(false)}
              className="focus-ring text-muted min-h-10 rounded-full px-3 text-sm"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={bekliyor}
            onClick={() => (hesaplar.length > 0 ? setSecim(true) : isle('ODENDI'))}
            aria-label={`${odeme.ad}: ödendi`}
            className="focus-ring rounded-btn bg-gradient-accent min-h-10 flex-1 text-sm font-medium text-white disabled:opacity-60"
          >
            Ödendi
          </button>
          <button
            type="button"
            disabled={bekliyor}
            onClick={() => isle('ATLANDI')}
            aria-label={`${odeme.ad}: bu ay atla`}
            className="focus-ring bg-elevated text-body min-h-10 rounded-full px-4 text-sm font-medium disabled:opacity-60"
          >
            Bu ay atla
          </button>
        </div>
      )}

      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}
    </li>
  );
}
