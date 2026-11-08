import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * §3.3 — input yarıçapı 10px.
 *
 * Hata durumu `aria-invalid` ile sürülür: tek bir prop hem görsel hem erişilebilir
 * durumu verir. Hata metnini `aria-describedby` ile bağla:
 *
 *   <Input id="email" aria-invalid={!!error} aria-describedby={error ? 'email-hata' : undefined} />
 *   {error && <p id="email-hata" role="alert" className="text-sm text-danger">{error}</p>}
 *
 * Not: yükseklik 44px (h-11) — dokunmatik hedef alt sınırının üstünde.
 */
export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'focus-ring rounded-input h-11 w-full min-w-0 px-3 text-sm',
        'border-line-strong bg-elevated text-primary placeholder:text-muted border',
        'ease-brand duration-micro hover:border-accent transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger',
        className,
      )}
      {...props}
    />
  );
}

/** Çok satırlı metin — Input ile aynı görsel dil, sabit yükseklik yok. */
export function Textarea({ className, rows = 5, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'focus-ring rounded-input w-full min-w-0 resize-y px-3 py-2.5 text-sm',
        'border-line-strong bg-elevated text-primary placeholder:text-muted border',
        'ease-brand duration-micro hover:border-accent transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger',
        className,
      )}
      {...props}
    />
  );
}
