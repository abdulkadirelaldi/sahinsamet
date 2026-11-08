import { handlers } from '@/server/auth';

/**
 * Auth.js route handler — §7.1 (public uç), ADR-013.
 *
 * Yapılandırmanın tamamı `src/server/auth.ts` içindedir; burada yalnızca
 * handler'lar dışa aktarılır. `/api/auth/*` yolu KORUNMAZ — giriş uçları
 * doğası gereği kimliksiz erişilebilir olmalıdır (§8.5 `/api/v1/panel/*`'ı korur).
 */
export const { GET, POST } = handlers;
