'use client';

import { Flag } from 'lucide-react';
import { useState } from 'react';

import { ingilizceHataBildirAction } from '@/server/actions/ingilizce';

/**
 * Geri bildirim panelinde "Bu soruda hata var" (2026-11-06). Not isteğe bağlı; gönderince
 * Ayarlar → Hatalar'da soru kimliğiyle görünür. Dersi durdurmaz.
 */
export function HataBildir({ alistirmaId, dersId }: { alistirmaId: string; dersId: string }) {
  const [durum, setDurum] = useState<'kapali' | 'acik' | 'gonderiliyor' | 'tamam' | 'hata'>(
    'kapali',
  );
  const [not, setNot] = useState('');

  const gonder = async () => {
    setDurum('gonderiliyor');
    try {
      const sonuc = await ingilizceHataBildirAction({ alistirmaId, dersId, not });
      setDurum(sonuc.ok ? 'tamam' : 'hata');
    } catch {
      setDurum('hata');
    }
  };

  if (durum === 'tamam') {
    return <p className="text-muted text-xs">Teşekkürler, bildirim kaydedildi.</p>;
  }
  if (durum === 'kapali') {
    return (
      <button
        type="button"
        onClick={() => setDurum('acik')}
        className="focus-ring text-muted flex items-center gap-1.5 self-start rounded text-xs"
      >
        <Flag className="size-3.5" aria-hidden="true" />
        Bu soruda hata var
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={not}
        onChange={(e) => setNot(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        rows={2}
        maxLength={500}
        placeholder="Ne yanlış? (isteğe bağlı)"
        aria-label="Hata notu"
        className="focus-ring border-line bg-surface text-primary rounded-xl border px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={durum === 'gonderiliyor'}
          onClick={() => void gonder()}
          className="focus-ring bg-elevated text-primary rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Gönder
        </button>
        <button
          type="button"
          onClick={() => setDurum('kapali')}
          className="focus-ring text-muted rounded text-xs"
        >
          Vazgeç
        </button>
        {durum === 'hata' && <span className="text-danger text-xs">Gönderilemedi.</span>}
      </div>
    </div>
  );
}
