/**
 * SUNUCU BAŞLANGICI (Next.js `register`) — 2026-10-30.
 *
 * Bildirim zamanlayıcısı `instrumentation-node.ts`te. İçe aktarma Next.js'in
 * belgelediği kalıpla bu dalın İÇİNDE: derleyici Edge paketinde dalı atar.
 * (İlk sürüm "nodejs değilse dön" diye erken dönüyordu; o biçimde dal
 * atılmadı ve `web-push` Edge'e girip derlemeyi kırdı — `http`/`net` yok.)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}

/**
 * Sunucu hatalarını hata kaydına yazar (2026-10-31, Next.js `onRequestError`).
 * Aynı kalıp: Node'a özel modül dalın İÇİNDE içe aktarılır.
 */
export async function onRequestError(
  err: unknown,
  request: { path: string },
  context: { routePath?: string },
): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { sunucuHatasi } = await import('./instrumentation-hata');
    await sunucuHatasi(err, request, context);
  }
}
