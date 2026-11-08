import { hataKaydet } from './server/services/hata-kaydi';

/**
 * Sunucu hatası → hata kaydı (2026-10-31). YALNIZCA Node çalışma zamanında
 * içe aktarılır (`instrumentation.ts`): Prisma Edge paketine girmez.
 */
export async function sunucuHatasi(
  err: unknown,
  request: { path: string },
  context: { routePath?: string },
): Promise<void> {
  const hata = err instanceof Error ? err : new Error(String(err));
  await hataKaydet({
    kaynak: 'sunucu',
    ad: hata.name,
    mesaj: hata.message,
    yol: context.routePath ?? request.path,
    ayrinti: (hata as Error & { digest?: string }).digest ?? null,
  });
}
