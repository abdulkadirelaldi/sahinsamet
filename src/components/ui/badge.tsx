import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

export type BadgeVariant =
  'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-elevated text-body border-line',
  accent: 'bg-accent/12 text-accent-soft border-accent/25',
  success: 'bg-success/12 text-success border-success/25',
  warning: 'bg-warning/12 text-warning border-warning/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
  info: 'bg-info/12 text-info border-info/25',
  outline: 'bg-transparent text-muted border-line',
};

/**
 * §3.3 — rozet yarıçapı 999px (hap).
 *
 * Rozet salt bilgidir, tıklanabilir değildir. Filtre çipi gerekiyorsa `Button`
 * kullan — rozet klavye odağı almaz.
 */
export function Badge({
  className,
  variant = 'neutral',
  ...props
}: ComponentProps<'span'> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'rounded-pill inline-flex items-center gap-1 border px-2.5 py-0.5',
        'text-xs leading-normal font-medium whitespace-nowrap',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
