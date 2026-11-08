import type { ReactNode } from 'react';

/**
 * ADR-045 — sayfa geçişi. `template` (layout'tan farklı olarak) her gezinmede
 * YENİDEN bağlanır, yani CSS giriş animasyonu her sayfada yeniden oynar.
 *
 * SAF CSS, JS yok: içerik sunucuda çizilir ve hidrasyonu beklemeden görünür.
 * Opaklık 0'dan değil 0.01'den başlar (globals.css `sayfa-giris` notu — LCP).
 */
export default function PublicTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-sayfa-giris">{children}</div>;
}
