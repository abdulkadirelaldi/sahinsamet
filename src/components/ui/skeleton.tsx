import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Yükleniyor iskeleti.
 *
 * CLS kuralı: iskelet, yerine geçeceği içerikle AYNI ölçüyü tutmalı. Yükseklik
 * ver ya da en-boy oranı sabitle (`aspect-[16/10]`); yoksa içerik gelince sayfa
 * zıplar (K1: CLS < 0.05).
 *
 * `prefers-reduced-motion` aktifken nabız animasyonu globals.css tarafından
 * pratikte durdurulur — iskelet sabit bir blok olarak kalır (§3.4).
 *
 * Erişilebilirlik: iskeletler `aria-hidden`. Yükleniyor durumunu kullanıcıya
 * duyurmak için kapsayıcıya `aria-busy="true"` ver.
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-input bg-elevated animate-pulse', className)}
      {...props}
    />
  );
}

/** Metin bloğu iskeleti — son satır kısa, gerçek paragraf gibi görünsün. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
