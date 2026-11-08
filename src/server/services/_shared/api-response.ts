import * as z from 'zod';

import type { ApiErrorCode, ApiFailure, ApiResponse, ApiSuccess } from '@/types';
import { guvenliHata } from '@/lib/security/guvenli-log';

/**
 * §7.2 yanıt zarfı yardımcıları.
 *
 * Route handler'lar ve Server Action'lar zarfı ELLE KURMAZ; buradan geçer.
 * Tek nokta olması, hata kodu ile HTTP durumunun ayrışmasını engeller ve
 * §8.20'nin "stack trace kullanıcıya gitmez" kuralını yapısal hâle getirir.
 */

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function fail(
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>,
): ApiFailure {
  return { ok: false, error: { code, message, ...(fields ? { fields } : {}) } };
}

/**
 * `ZodError` → §7.2 `VALIDATION_ERROR` zarfı.
 *
 * `fields` ANAHTARLARI FORM ALAN ADLARIYLA BİREBİR AYNIDIR (`fxRate`,
 * `publishedAt`, `progress`, `endDate`…) çünkü T-011'deki çapraz kuralların
 * `path` değerleri ilgili alana açıkça bağlandı. Frontend `fields[name]` ile
 * doğrudan input altına basabilir.
 *
 * Alan başına YALNIZCA İLK mesaj taşınır: form alanının altında tek satır
 * gösterilecek; hepsini yığmak okunmaz bir blok üretirdi.
 *
 * İç içe alanlar (`socials.github`) nokta ile düzleştirilir; `flattenError`
 * yalnızca üst seviyeyi verdiği için derin yollar `formErrors`'a düşerdi.
 */
export function toValidationFailure(
  error: z.ZodError,
  fallbackMessage = 'Gönderilen bilgilerde hata var.',
): ApiFailure {
  const fields: Record<string, string> = {};
  let formMessage: string | undefined;

  for (const issue of error.issues) {
    if (issue.path.length === 0) {
      formMessage ??= issue.message;
      continue;
    }
    const key = issue.path.map(String).join('.');
    fields[key] ??= issue.message;
  }

  return fail('VALIDATION_ERROR', formMessage ?? fallbackMessage, fields);
}

/**
 * Şemayı çalıştırır ve sonucu §7.2 zarfına sarar.
 *
 * Server Action sırası (§7.1): `auth()` → **bu** → servis → `AuditLog` → `revalidatePath`.
 */
export function parseOrFail<S extends z.ZodType>(
  schema: S,
  input: unknown,
): { ok: true; data: z.output<S> } | { ok: false; failure: ApiFailure } {
  const result = schema.safeParse(input);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, failure: toValidationFailure(result.error) };
}

/** Oturum yoksa dönülecek standart zarf (§8.6). */
export function unauthorized(): ApiFailure {
  return fail('UNAUTHORIZED', 'Bu işlem için oturum açmanız gerekiyor.');
}

export function notFound(message = 'Kayıt bulunamadı.'): ApiFailure {
  return fail('NOT_FOUND', message);
}

/**
 * Beklenmeyen hata — §7.2/§8.20.
 *
 * Ayrıntı YALNIZCA sunucu loguna gider; kullanıcıya sabit, genel bir mesaj
 * döner. Stack trace veya veritabanı hatası hiçbir koşulda yanıta girmez.
 */
export function internalError(context: string, error: unknown): ApiFailure {
  guvenliHata(`[${context}]`, error instanceof Error ? error.message : error);
  return fail('INTERNAL_ERROR', 'İşlem tamamlanamadı. Lütfen tekrar deneyin.');
}

export type { ApiFailure, ApiResponse, ApiSuccess };
