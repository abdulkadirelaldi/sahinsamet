'use client';

import { Menu } from 'lucide-react';

import { useMenuDurumu } from '@/components/panel/panel-kabuk';

/**
 * Telefonda üst çubuktaki "Daha" — mesajlar, site içeriği, ayarlar çekmecesi
 * (2026-10-30: alt sekmeler beş kişisel bölüme ayrıldı). Masaüstünde yan menü var.
 */
export function DahaDugmesi() {
  const { ac, acik } = useMenuDurumu();
  return (
    <button
      type="button"
      onClick={ac}
      aria-expanded={acik}
      aria-controls="panel-menu"
      aria-label="Daha"
      className="focus-ring bg-surface text-body hover:text-primary flex size-10 items-center justify-center rounded-full shadow-[var(--golge-kart)] lg:hidden"
    >
      <Menu className="size-5" aria-hidden="true" />
    </button>
  );
}
