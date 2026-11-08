import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Alan düzeyi hata metni.
 *
 * `role="alert"` ile duyurulur. Alanla bağını kurmak ARAYAN tarafın işidir:
 *
 *   <Input id="eposta" aria-invalid={!!hata} aria-describedby={hata ? 'eposta-hata' : undefined} />
 *   {hata && <FormError id="eposta-hata">{hata}</FormError>}
 *
 * `aria-describedby` verilmezse ekran okuyucu hatayı duyurur ama hangi alana
 * ait olduğunu söyleyemez.
 */
export function FormError({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p id={id} role="alert" className={cn('text-danger text-sm', className)}>
      {children}
    </p>
  );
}

/**
 * Form düzeyi hata kutusu — tek bir alana bağlanamayan hatalar için
 * (sunucudan dönen kimlik doğrulama hataları gibi).
 *
 * Alan hatalarından görsel olarak ayrılır: kutu, ikon ve kenarlık taşır.
 */
export function FormAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-input border-danger/40 bg-danger/8 text-danger flex items-start gap-2.5 border px-3 py-2.5 text-sm',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
