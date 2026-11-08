'use client';

import { HeartPulse, LoaderCircle, Stethoscope } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils/cn';
import { saglikDegerlendirmesiAction } from '@/server/actions/saglik-ai';
import type { SaglikDegerlendirmesi } from '@/server/services/saglik-ai';

/**
 * HEKİM + DİYETİSYEN KARTI (2026-10-30).
 *
 * İstek ÜZERİNE üretilir (her açılışta değil): her değerlendirme son 90 günü
 * Anthropic'e gönderir ve ücretlidir. Sonuç yalnızca bu ekranda durur,
 * saklanmaz.
 */
export function SaglikDegerlendirmesiKarti() {
  const [durum, setDurum] = useState<'bos' | 'yukleniyor' | 'hata'>('bos');
  const [hata, setHata] = useState('');
  const [sonuc, setSonuc] = useState<SaglikDegerlendirmesi | null>(null);

  const iste = async () => {
    setDurum('yukleniyor');
    const yanit = await saglikDegerlendirmesiAction();
    if (yanit.ok) {
      setSonuc(yanit.data);
      setDurum('bos');
    } else {
      setHata(yanit.error.message);
      setDurum('hata');
    }
  };

  const yukleniyor = durum === 'yukleniyor';

  return (
    <section
      aria-labelledby="degerlendirme-baslik"
      className="rounded-card border-line bg-surface flex flex-col gap-4 border p-4"
    >
      <div className="flex items-center gap-2">
        <Stethoscope className="text-accent size-5" aria-hidden="true" />
        <h2 id="degerlendirme-baslik" className="text-primary text-base font-semibold">
          Hekim ve diyetisyen yorumu
        </h2>
      </div>

      {sonuc ? (
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-body leading-relaxed">{sonuc.ozet}</p>
          {sonuc.doktoraDanis && (
            <p
              role="alert"
              className="rounded-input border-danger/40 bg-danger/8 text-body border px-3 py-2.5"
            >
              <strong className="text-danger">Doktora danış: </strong>
              {sonuc.doktoraDanis}
            </p>
          )}
          <Liste baslik="İyi gidenler" ton="text-success" ogeler={sonuc.iyiGidenler} />
          <Liste baslik="Dikkat" ton="text-warning" ogeler={sonuc.dikkat} />
          <Liste baslik="Önerilerim" ton="text-accent" ogeler={sonuc.oneriler} />
          {sonuc.gunlukSuLitre !== null && (
            <p className="text-body">
              <HeartPulse className="text-accent mr-1 inline size-4" aria-hidden="true" />
              Günlük su hedefin:{' '}
              <strong className="tabular">{String(sonuc.gunlukSuLitre).replace('.', ',')} L</strong>
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted text-sm">
          Son 90 günün ölçümlerine bakıp gidişatını yorumlarım: kilo, yağ, kas, su, uyku, adım.
        </p>
      )}

      <button
        type="button"
        onClick={() => void iste()}
        disabled={yukleniyor}
        className="focus-ring rounded-btn border-accent/40 text-accent flex min-h-11 items-center justify-center gap-2 border px-4 text-sm font-medium active:opacity-70 disabled:cursor-wait disabled:opacity-60"
      >
        {yukleniyor && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        {yukleniyor ? 'İnceliyorum…' : sonuc ? 'Yeniden değerlendir' : 'Değerlendir'}
      </button>
      <p role="status" className="text-xs">
        {durum === 'hata' && <span className="text-danger">{hata}</span>}
      </p>
      <p className="text-muted text-xs">
        Yapay zekâ yorumudur, tıbbi tanı yerine geçmez. Belirti ya da şüphede doktoruna görün.
      </p>
    </section>
  );
}

function Liste({ baslik, ton, ogeler }: { baslik: string; ton: string; ogeler: string[] }) {
  if (ogeler.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className={cn('font-semibold', ton)}>{baslik}</h3>
      <ul className="text-body flex list-disc flex-col gap-1 pl-5">
        {ogeler.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>
    </div>
  );
}
