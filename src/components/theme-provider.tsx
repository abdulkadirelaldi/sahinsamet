'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  panelYolu,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  type ResolvedTheme,
  type Theme,
} from '@/components/theme';

type ThemeContextValue = {
  /** Kullanıcının seçimi ('system' = seçim yok). Sunucudan gelir, hidrasyonda kaymaz. */
  theme: Theme;
  /** Ekranda gerçekten uygulanan tema. İlk render'da `undefined` — sunucu sistem tercihini bilemez. */
  resolvedTheme: ResolvedTheme | undefined;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * `<html>` sınıfını ve tema cookie'sini eşitler.
 * Sınıf değişimi sırasında bir kare boyunca geçişler kapatılır (`.theme-switching`),
 * yoksa renk geçişleri temalar arasında "yayılma" etkisi yapıyor.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  root.classList.add('theme-switching');
  root.classList.remove('light', 'dark');
  if (theme !== 'system') {
    root.classList.add(theme);
  } else if (panelYolu(window.location.pathname)) {
    root.classList.add('dark');
  }

  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie =
    `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax` + secure;

  window.requestAnimationFrame(() => {
    root.classList.remove('theme-switching');
  });
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  /** Kök layout'un cookie'den okuduğu değer. */
  initialTheme: Theme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [systemDark, setSystemDark] = useState<boolean | null>(null);
  const pathname = usePathname();
  const panelde = panelYolu(pathname);

  // Seçim yokken panel koyu, site sistem tercihinde. Sayfa yenilenmeden geçişte de doğru kalsın.
  // Boyamadan önce: girişten panele geçişte bir kare açık tema görünmesin.
  useLayoutEffect(() => {
    if (theme === 'system') document.documentElement.classList.toggle('dark', panelde);
  }, [theme, panelde]);

  // Sistem tercihini izle. `theme === 'system'` iken renkleri zaten CSS medya
  // sorgusu değiştiriyor; buradaki durum yalnızca `resolvedTheme`'i besler.
  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const sync = () => setSystemDark(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const resolvedTheme: ResolvedTheme | undefined =
      theme === 'system'
        ? panelde
          ? 'dark'
          : systemDark === null
            ? undefined
            : systemDark
              ? 'dark'
              : 'light'
        : theme;

    return { theme, resolvedTheme, setTheme };
  }, [theme, systemDark, setTheme, panelde]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme, ThemeProvider içinde kullanılmalıdır.');
  }
  return context;
}
