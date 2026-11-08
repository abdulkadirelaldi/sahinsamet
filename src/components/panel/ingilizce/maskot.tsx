'use client';

import { useId } from 'react';

import { cn } from '@/lib/utils/cn';

export type MaskotHali = 'normal' | 'mutlu' | 'uzgun' | 'kutlama';

/**
 * Ders maskotu (2026-11-06): küçük bir baykuş. Satır içi SVG — görsel dosyası yok, iki temada
 * aynı. Gözler arada kırpar; doğruda sevinir, yanlışta üzülür, bitişte zıplar.
 */
export function Maskot({
  hal = 'normal',
  boyut = 64,
  className,
}: {
  hal?: MaskotHali;
  boyut?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const mutlu = hal === 'mutlu' || hal === 'kutlama';
  return (
    <svg
      viewBox="0 0 64 64"
      width={boyut}
      height={boyut}
      aria-hidden="true"
      className={cn(hal === 'kutlama' && 'ing-sevin', className)}
    >
      <defs>
        <linearGradient id={`${id}-govde`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      {/* Kulak tüyleri */}
      <path d="M14 14 L20 4 L25 15 Z" fill="#0f766e" />
      <path d="M50 14 L44 4 L39 15 Z" fill="#0f766e" />
      {/* Gövde ve karın */}
      <ellipse cx="32" cy="36" rx="22" ry="24" fill={`url(#${id}-govde)`} />
      <ellipse cx="32" cy="45" rx="13" ry="13" fill="#ccfbf1" opacity="0.9" />
      {/* Kanatlar: sevinçte kalkar */}
      <path
        d={mutlu ? 'M10 34 Q2 22 8 18 Q12 28 14 36 Z' : 'M10 34 Q6 44 12 52 Q14 44 14 36 Z'}
        fill="#115e59"
      />
      <path
        d={mutlu ? 'M54 34 Q62 22 56 18 Q52 28 50 36 Z' : 'M54 34 Q58 44 52 52 Q50 44 50 36 Z'}
        fill="#115e59"
      />
      {/* Gözler */}
      <circle cx="23" cy="27" r="9" fill="#ffffff" />
      <circle cx="41" cy="27" r="9" fill="#ffffff" />
      {mutlu ? (
        <>
          <path
            d="M18 28 Q23 22 28 28"
            stroke="#0f172a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M36 28 Q41 22 46 28"
            stroke="#0f172a"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <ellipse
            className="ing-goz"
            cx={hal === 'uzgun' ? 23 : 24}
            cy={hal === 'uzgun' ? 30 : 28}
            rx="4"
            ry="4.5"
            fill="#0f172a"
          />
          <ellipse
            className="ing-goz"
            cx={hal === 'uzgun' ? 41 : 42}
            cy={hal === 'uzgun' ? 30 : 28}
            rx="4"
            ry="4.5"
            fill="#0f172a"
          />
          {hal === 'uzgun' && (
            <>
              <path d="M15 19 L28 22" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M49 19 L36 22" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
        </>
      )}
      {/* Gaga */}
      <path
        d={hal === 'uzgun' ? 'M28 38 L36 38 L32 43 Z' : 'M28 36 L36 36 L32 42 Z'}
        fill="#f59e0b"
      />
      {/* Kutlamada kep */}
      {hal === 'kutlama' && (
        <>
          <path d="M18 9 L32 3 L46 9 L32 15 Z" fill="#1e293b" />
          <path d="M44 10 L46 18" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
