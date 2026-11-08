'use server';

import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { headers } from 'next/headers';
import * as z from 'zod';

import { entityIdSchema } from '@/lib/schemas';
import {
  girisSecenekleri,
  kayitDogrula,
  kayitSecenekleri,
  passkeySil,
  PasskeyHatasi,
  rpCoz,
} from '@/server/auth/passkey';
import { ipGrubu } from '@/lib/security/rate-limit';
import { decryptSecret, verifyTotpToken } from '@/server/auth/totp';
import { isTotpSetupRateLimited } from '@/server/services/user';
import { db } from '@/server/db';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * PASSKEY EYLEMLERİ (2026-10-30). Doğrulamanın kendisi `server/auth/passkey.ts`te;
 * GİRİŞ, Auth.js'in `passkey` sağlayıcısında (`server/auth.ts`) — oturum
 * jetonu şifreli girişle aynı yoldan basılır.
 */

const kayitBaslatSchema = z.object({ totpKodu: z.string().trim().min(6).max(16).optional() });

const kayitSchema = z.object({
  // Tarayıcının ürettiği yanıt; yapısını SimpleWebAuthn doğrular. Burada yalnızca
  // biçim ve boyut sınırı (DoS) — içerik doğrulaması kriptografik.
  yanit: z
    .object({
      id: z.string().max(1024),
      // `.loose()` İÇTE DE şart: yoksa Zod `attestationObject`i SİLER ve doğrulama düşer.
      response: z.object({ clientDataJSON: z.string().max(4096) }).loose(),
    })
    .loose(),
  ad: z.string().trim().min(1, { error: 'Cihaza bir ad ver.' }).max(60),
});

async function rp() {
  return rpCoz((await headers()).get('origin'));
}

function passkeyHatasi(baglam: string, error: unknown) {
  if (error instanceof PasskeyHatasi) return fail('VALIDATION_ERROR', error.message);
  return toFailure(baglam, error);
}

/** Oturum açıkken: "Face ID ekle" için seçenekler. */
export async function passkeyKayitSecenekleriAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(kayitBaslatSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const taraf = await rp();
  if (!taraf) return fail('FORBIDDEN', 'Bu adresten passkey eklenemez.');

  try {
    const kullanici = await db.user.findUniqueOrThrow({
      where: { id: actorId },
      select: { id: true, email: true, name: true, totpSecret: true, totpConfirmedAt: true },
    });
    // Passkey şifreyi ve kodu atlar: ele geçirilen oturum kendine kalıcı giriş ekleyemesin.
    // Meydan okuma burada verildiği için kod kapısı bütün kayıt akışının önünde.
    // Yalnızca uygulamadaki kod, harcanmadan: Face ID ekranı iptal edilirse kod ya da kurtarma
    // kodu boşa gitmesin. Deneme sınırı yenileme ve kurulumla ortak; ele geçen oturum tahmin edemez.
    if (kullanici.totpConfirmedAt) {
      if (await isTotpSetupRateLimited(actorId)) {
        return fail('RATE_LIMITED', 'Çok fazla yanlış kod. Biraz sonra yeniden dene.');
      }
      const kod = parsed.data.totpKodu;
      const gizli = kullanici.totpSecret ? decryptSecret(kullanici.totpSecret) : null;
      if (!kod || !gizli || !(await verifyTotpToken(kod, gizli))) {
        await writeAuditLog(
          {
            actorId,
            action: 'LOGIN_FAILED',
            entity: 'User',
            entityId: actorId,
            diff: { context: 'PASSKEY_KAYIT', reason: 'INVALID_TOTP' },
          },
          db,
        );
        return fail('VALIDATION_ERROR', 'Doğrulama kodu yanlış.', { totpKodu: 'Kod geçersiz.' });
      }
    }
    return ok(await kayitSecenekleri(kullanici, taraf));
  } catch (error) {
    return passkeyHatasi('passkey:kayit-secenek', error);
  }
}

export async function passkeyKaydetAction(
  raw: unknown,
): Promise<ApiResponse<{ id: string; name: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(kayitSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const taraf = await rp();
  if (!taraf) return fail('FORBIDDEN', 'Bu adresten passkey eklenemez.');

  try {
    const kayit = await kayitDogrula(
      actorId,
      parsed.data.yanit as unknown as RegistrationResponseJSON,
      parsed.data.ad,
      taraf,
    );
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Passkey',
        entityId: kayit.id,
        diff: { ad: kayit.name },
      },
      db,
    );
    return ok(kayit);
  } catch (error) {
    return passkeyHatasi('passkey:kaydet', error);
  }
}

export async function passkeySilAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const silindi = await passkeySil(actorId, parsed.data.id);
    if (!silindi) return fail('NOT_FOUND', 'Passkey bulunamadı.');
    await writeAuditLog(
      { actorId, action: 'DELETE', entity: 'Passkey', entityId: parsed.data.id },
      db,
    );
    return ok({ id: parsed.data.id });
  } catch (error) {
    return passkeyHatasi('passkey:sil', error);
  }
}

/**
 * GİRİŞ ÖNCESİ — oturum YOKKEN çağrılır (kimlik kapısı istisnası, gerekçesi
 * `kisisel-veri-erisimi.test.ts`te). Veri okumaz ya da yazmaz; yalnızca tek
 * kullanımlık, 5 dakikalık bir meydan okuma üretir. Açık meydan okuma tavanı
 * serviste (`girisSecenekleri`).
 */
export async function passkeyGirisSecenekleriAction() {
  const taraf = await rp();
  if (!taraf) return fail('FORBIDDEN', 'Bu adresten Face ID ile giriş yapılamaz.');
  try {
    const baslik = await headers();
    const ip = baslik.get('x-forwarded-for')?.split(',')[0]?.trim() || baslik.get('x-real-ip');
    return ok(await girisSecenekleri(taraf, db, new Date(), ip ? ipGrubu(ip) : null));
  } catch (error) {
    return passkeyHatasi('passkey:giris-secenek', error);
  }
}
