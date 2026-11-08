import { cn } from '@/lib/utils/cn';

/**
 * HEDEF İLERLEME ÇUBUĞU — §4.2 `/panel/hayat` genel bakış ve hedef listesi.
 *
 * `role="progressbar"` + `aria-valuenow`, `kategori-dagilimi.tsx`teki
 * `role="img"` DEĞİL: oradaki çubuk yanında zaten yazılı bir tutarı
 * görselleştiriyordu; burada çubuk ölçünün KENDİSİ ve ekran okuyucu onu bir
 * ilerleme değeri olarak duymalı. Yüzde metni yine görünür (`tabular`) —
 * renk ya da genişlik tek başına bilgi taşımıyor.
 *
 * SERVER COMPONENT — etkileşim yok.
 */
export function HedefIlerleme({
  baslik,
  ilerleme,
  className,
}: {
  /** Erişilebilir ad: "Maraton koş ilerlemesi". */
  baslik: string;
  /** 0–100 (ADR-020); servis sınırı garanti ediyor, burada yine kırpılıyor. */
  ilerleme: number;
  className?: string;
}) {
  const deger = Math.min(100, Math.max(0, Math.round(ilerleme)));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-label={baslik}
        aria-valuenow={deger}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`%${deger}`}
        className="bg-elevated h-2 min-w-16 flex-1 overflow-hidden rounded-full"
      >
        <div
          className={cn('h-full rounded-full', deger >= 100 ? 'bg-success' : 'bg-accent')}
          style={{ width: `${deger}%` }}
        />
      </div>
      <span className="tabular text-body w-10 shrink-0 text-right text-xs" aria-hidden="true">
        %{deger}
      </span>
    </div>
  );
}
