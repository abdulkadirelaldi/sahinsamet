import * as z from 'zod';

import { paginationSchema, sortDirectionSchema } from './common';

/**
 * `LoginAttempt` (ADR-013) — §8.4 giriş denemesi kaydı.
 *
 * Tablo Backend'in, sayma/kilitleme POLİTİKASI Güvenlik ajanının
 * (`src/lib/security/**`). Bu şema yalnızca kaydın şeklini bağlar.
 *
 * §8.20: `emailHash` HAM E-POSTA DEĞİLDİR. Hash'leme Güvenlik katmanında yapılır;
 * şema ham e-posta gelirse kabul etmemek için biçim kontrolü uygular.
 */

/** Onaltılık özet (sha-256 → 64 karakter). `@` içeren bir değer buraya giremez. */
export const emailHashSchema = z.string().regex(/^[a-f0-9]{64}$/, {
  error: 'E-posta özeti geçersiz — ham e-posta yazılmış olabilir.',
});

export const createLoginAttemptSchema = z.object({
  ip: z.union([z.ipv4(), z.ipv6()], { error: 'IP adresi geçersiz.' }),
  emailHash: emailHashSchema,
  success: z.boolean(),
});

/** Denemeler değiştirilemez — denetim kaydıdır. Güncelleme şeması bilerek boştur. */
export const updateLoginAttemptSchema = z.object({});

export const loginAttemptFilterSchema = paginationSchema.extend({
  ip: z.string().trim().max(64).optional(),
  emailHash: emailHashSchema.optional(),
  success: z.boolean().optional(),
  sort: sortDirectionSchema,
});

export type CreateLoginAttemptInput = z.infer<typeof createLoginAttemptSchema>;
export type UpdateLoginAttemptInput = z.infer<typeof updateLoginAttemptSchema>;
export type LoginAttemptFilterInput = z.infer<typeof loginAttemptFilterSchema>;
