import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Koşullu sınıf birleştirme + Tailwind çakışma çözümü.
 *
 * `clsx` koşulları düzleştirir, `twMerge` aynı özelliği hedefleyen son sınıfı
 * kazandırır — böylece bir bileşenin varsayılan sınıfı dışarıdan gelen
 * `className` ile güvenle ezilebilir:
 *
 *   cn('px-4 py-2', 'px-6')        -> 'py-2 px-6'
 *   cn('text-body', isActive && 'text-primary')
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
