'use client';

import { useMemo } from 'react';

import { encodeQr } from '@/components/auth/qr-encode';
import { cn } from '@/lib/utils/cn';

const QUIET_ZONE = 4; // ISO/IEC 18004 asgari sessiz alan: 4 modül

/**
 * QR kodunu satır içi SVG olarak çizer.
 *
 * Neden SVG (canvas değil): her ölçekte keskin, sunucuda da render edilebilir,
 * ekran okuyucuya `role="img"` + `aria-label` ile anlatılabilir ve tema
 * değişiminde yeniden çizim gerektirmez.
 *
 * RENK: QR okuyucular koyu/açık KONTRASTINA bakar, mor/mavi tonlarımıza değil.
 * Bu yüzden burada bilinçli olarak siyah-beyaz kullanılır (`--qr-*` token'ları
 * globals.css'te tanımlı) — vurgu rengine boyamak okuma başarısını düşürürdü.
 */
export function QrCode({
  value,
  label,
  className,
}: {
  value: string;
  /** Ekran okuyucu için açıklama — QR görselinin kendisi okunamaz. */
  label: string;
  className?: string;
}) {
  const matrix = useMemo(() => encodeQr(value), [value]);

  const size = matrix.length;
  const total = size + QUIET_ZONE * 2;

  // Koyu modülleri tek bir <path> içinde toplamak, modül başına <rect> yazmaya
  // göre DOM'u ~1500 düğümden 1'e indiriyor.
  const path = matrix
    .flatMap((row, r) =>
      row.map((dark, c) => (dark ? `M${c + QUIET_ZONE} ${r + QUIET_ZONE}h1v1h-1z` : '')),
    )
    .join('');

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={cn('h-auto w-full max-w-[220px]', className)}
    >
      <rect width={total} height={total} fill="var(--qr-light)" />
      <path d={path} fill="var(--qr-dark)" />
    </svg>
  );
}
