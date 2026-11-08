'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';

import { panelYolu, THEME_LABELS, type Theme } from '@/components/theme';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils/cn';

const ICONS: Record<Theme, ComponentType<{ className?: string }>> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

/** Sistem → Aydınlık → Koyu → Sistem */
const NEXT_THEME: Record<Theme, Theme> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

/**
 * Tema anahtarı — üç durumlu bir döngü butonu.
 *
 * Erişilebilirlik: ikon tek başına durumu anlatmaz, bu yüzden `aria-label` hem
 * mevcut durumu hem sıradaki eylemi söyler ve `aria-live` bölgesi değişimi duyurur.
 * İkon `theme`'e (kullanıcı seçimine) bakar, `resolvedTheme`'e değil — böylece
 * sunucu ve istemci ilk render'da aynı şeyi çizer, hidrasyon uyarısı çıkmaz.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // Panelde "sistem" koyu demek: düğme açık ve koyu arasında tek dokunuşla geçer. Üç adımlı
  // döngüde koyudan sisteme geçiş ekranda hiçbir şey değiştirmez, düğme bozuk görünürdü.
  const panelde = panelYolu(usePathname());
  const gorunen: Theme = panelde && theme === 'system' ? 'dark' : theme;

  const Icon = ICONS[gorunen];
  const next: Theme = panelde ? (gorunen === 'dark' ? 'light' : 'dark') : NEXT_THEME[theme];

  return (
    <>
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`${THEME_LABELS[gorunen]} açık. ${THEME_LABELS[next]}'na geç`}
        title={THEME_LABELS[gorunen]}
        className={cn(
          'focus-ring rounded-btn inline-flex size-10 shrink-0 items-center justify-center',
          'border-line bg-surface text-body border',
          'ease-brand duration-micro hover:border-line-hover hover:text-primary transition-colors',
          className,
        )}
      >
        <Icon className="size-[18px]" />
      </button>

      <span aria-live="polite" className="sr-only">
        {THEME_LABELS[gorunen]}
      </span>
    </>
  );
}
