'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { buttonClasses, type ButtonSize, type ButtonVariant } from '@/components/ui/button';

/**
 * Panoya kopyalar ve sonucu hem görsel hem sesli (ekran okuyucu) bildirir.
 *
 * Kopyalanan değer state'e ALINMAZ, prop'tan doğrudan panoya gider — hassas
 * içerik (kurtarma kodu, TOTP secret) bileşen ağacında fazladan bir yerde
 * durmasın diye.
 */
export function CopyButton({
  value,
  label = 'Kopyala',
  copiedLabel = 'Kopyalandı',
  variant = 'secondary',
  size = 'sm',
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    if (timer.current) clearTimeout(timer.current);

    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      // Pano izni reddedilmiş olabilir; kullanıcı elle seçip kopyalayabilsin
      // diye değer zaten ekranda duruyor.
      setState('failed');
    }

    timer.current = setTimeout(() => setState('idle'), 2000);
  }

  const text = state === 'copied' ? copiedLabel : state === 'failed' ? 'Kopyalanamadı' : label;

  return (
    <>
      <button type="button" onClick={copy} className={buttonClasses({ variant, size, className })}>
        {state === 'copied' ? (
          <Check className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <Copy className="size-4 shrink-0" aria-hidden="true" />
        )}
        {text}
      </button>

      <span aria-live="polite" className="sr-only">
        {state === 'copied' ? copiedLabel : state === 'failed' ? 'Kopyalanamadı' : ''}
      </span>
    </>
  );
}
