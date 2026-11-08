import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  // §3.1 — gradient YALNIZCA birincil butonda
  primary: 'bg-gradient-accent text-white shadow-sm hover:opacity-90 active:opacity-100',
  secondary: 'bg-surface text-primary border border-line hover:border-line-hover hover:bg-elevated',
  ghost: 'bg-transparent text-body hover:bg-surface hover:text-primary',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/**
 * Buton sınıflarını üretir.
 *
 * `<a>` / `next/link` gibi buton görünümlü ama buton olmayan öğelerde bunu kullan;
 * `<Button>`'ı `<a>`'ya dönüştürmeye çalışma — semantik kaybolur:
 *
 *   <Link href="/projeler" className={buttonClasses({ variant: 'secondary' })}>
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    'focus-ring inline-flex shrink-0 items-center justify-center rounded-btn font-medium',
    'ease-brand duration-micro transition-[background-color,border-color,opacity,color]',
    'disabled:pointer-events-none disabled:opacity-50',
    // Dokunma hedefi 360px'te de rahat tutulabilsin (WCAG 2.5.5)
    'select-none whitespace-nowrap',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
