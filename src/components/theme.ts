/**
 * Tema sözleşmesi — hem sunucu (kök layout) hem istemci (ThemeProvider) okur.
 * Bu dosya bilinçli olarak 'use client' DEĞİLDİR: sunucu bileşeni sabitleri
 * doğrudan içe aktarabilsin diye.
 *
 * Depolama: COOKIE (localStorage değil). Gerekçe: tema sınıfı `<html>`'e sunucuda
 * basılır, böylece ilk boyamada doğru tema gelir — FOUC yapısal olarak imkânsızdır
 * ve §8.13'ün yasakladığı satır içi (inline) script'e ihtiyaç kalmaz.
 */

export const THEME_COOKIE = 'sahinsamet-tema';

/** 1 yıl — tema tercihi kalıcıdır, oturumla bağlı değildir. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** 'system' = seçim yok; karar `prefers-color-scheme` medya sorgusuna bırakılır. */
export type Theme = 'light' | 'dark' | 'system';

/** Ekrana gerçekten uygulanan tema. */
export type ResolvedTheme = 'light' | 'dark';

/** Middleware'in panel isteğine koyduğu başlık: seçim yoksa panel koyu başlar (2026-11-02). */
export const PANEL_BASLIGI = 'x-panel';

/** Panelde seçim yoksa koyu; site sistem tercihine uyar. SAF. */
export function panelYolu(pathname: string): boolean {
  return pathname === '/panel' || pathname.startsWith('/panel/');
}

export const THEMES: readonly Theme[] = ['system', 'light', 'dark'] as const;

/**
 * Cookie değerini güvenli biçimde bir temaya çevirir.
 * Tanınmayan/eksik değer -> 'system' (§3.1: sistem tercihi algılanır).
 */
export function parseTheme(value: string | undefined): Theme {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/**
 * `<html>` üzerine basılacak sınıf. 'system' için sınıf YOKTUR — böylece
 * globals.css'teki `html:not(.dark):not(.light)` medya sorgusu devreye girer.
 */
export function themeClassName(theme: Theme): string {
  return theme === 'system' ? '' : theme;
}

export const THEME_LABELS: Record<Theme, string> = {
  system: 'Sistem teması',
  light: 'Aydınlık tema',
  dark: 'Koyu tema',
};
