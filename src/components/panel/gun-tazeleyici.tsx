'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { istanbulGunu } from '@/components/panel/hizli-kuyruk';

const UZUN_ARA_MS = 10 * 60_000;

/**
 * Ana ekrandaki uygulama bellekte günlerce açık kalır (2026-11-02). Sabah açılınca ekran dünü
 * gösteriyor, ✓ düne yazılıyordu. Geri gelince gün değiştiyse ya da uzun ara verildiyse tazeler.
 */
export function GunTazeleyici() {
  const router = useRouter();
  useEffect(() => {
    let gun = istanbulGunu();
    let gizlendi = Date.now();
    const degisti = () => {
      if (document.visibilityState === 'hidden') {
        gizlendi = Date.now();
        return;
      }
      const bugun = istanbulGunu();
      if (bugun !== gun || Date.now() - gizlendi > UZUN_ARA_MS) {
        gun = bugun;
        router.refresh();
      }
    };
    document.addEventListener('visibilitychange', degisti);
    return () => document.removeEventListener('visibilitychange', degisti);
  }, [router]);
  return null;
}
