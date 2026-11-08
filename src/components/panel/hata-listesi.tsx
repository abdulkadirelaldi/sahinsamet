'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/utils/cn';
import { hatalariTemizleAction } from '@/server/actions/hata-kaydi';
import type { HataDto } from '@/server/services/hata-kaydi';

const ZAMAN = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

/** Ayarlar → Hatalar (2026-10-31). Aynı hata tek satırda, kaç kez olduğu yanında. */
export function HataListesi({ hatalar }: { hatalar: HataDto[] }) {
  const router = useRouter();
  const [emin, setEmin] = useState(false);

  if (hatalar.length === 0) {
    return (
      <p className="rounded-card border-line bg-surface text-success border p-5 text-sm font-medium">
        Kayıtlı hata yok ✓
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="rounded-card border-line bg-surface divide-line flex flex-col divide-y border">
        {hatalar.map((h) => (
          <li key={h.id} className="flex flex-col gap-1 p-4">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 font-medium',
                  h.kaynak === 'sunucu'
                    ? 'bg-danger/12 text-danger'
                    : h.kaynak === 'icerik'
                      ? 'bg-accent/12 text-accent'
                      : 'bg-warning/12 text-warning',
                )}
              >
                {h.kaynak === 'sunucu' ? 'Sunucu' : h.kaynak === 'icerik' ? 'İçerik' : 'Ekran'}
              </span>
              <span className="text-muted tabular">{ZAMAN.format(new Date(h.son))}</span>
              {h.sayi > 1 && <span className="text-muted tabular ml-auto">{h.sayi} kez</span>}
            </div>
            <p className="text-primary text-sm font-medium break-words">
              {h.ad}: {h.mesaj}
            </p>
            {(h.yol || h.ayrinti) && (
              <p className="text-muted text-xs break-all">
                {h.yol}
                {h.ayrinti && ` · ${h.ayrinti}`}
              </p>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={async () => {
          if (!emin) return setEmin(true);
          const sonuc = await hatalariTemizleAction();
          setEmin(false);
          if (sonuc.ok) router.refresh();
        }}
        className="focus-ring text-danger hover:bg-danger/8 flex min-h-11 items-center justify-center gap-2 self-start rounded-full px-4 text-sm font-medium"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {emin ? 'Emin misin? Tümünü sil' : 'Listeyi temizle'}
      </button>
    </div>
  );
}
