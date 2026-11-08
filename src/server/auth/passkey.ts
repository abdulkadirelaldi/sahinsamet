import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

import { applyLockoutPolicy } from '@/lib/security/rate-limit';
import { guvenliHata } from '@/lib/security/guvenli-log';
import { db } from '@/server/db';

import type { AuthenticatedUser } from './credentials';
import { countRecentFailures, hashEmail, recordLoginAttempt } from './login-attempt';

/**
 * FACE ID / TOUCH ID İLE GİRİŞ — WebAuthn passkey (2026-10-30).
 *
 * Telefonda her gün e-posta + şifre + doğrulama kodu yazmak yerine tek bakış.
 * Passkey kendi başına GÜÇLÜ bir kimlik doğrulamadır: gizli anahtar cihazın
 * güvenli bölgesinden hiç çıkmaz, imza yalnızca bu alan adına verilir (oltalama
 * sitesi işe yaramaz) ve `userVerification: 'required'` cihazın biyometrisini
 * ya da kodunu ister. Bu yüzden şifre + TOTP'nin YERİNE geçer.
 *
 * GÜVENLİK KURALLARI:
 * - Meydan okuma (challenge) sunucuda üretilir, veritabanında 5 dk yaşar ve
 *   doğrulamada SİLİNEREK tüketilir — aynı yanıt ikinci kez kabul edilmez.
 * - Beklenen köken (origin) ve RP kimliği SABİT: üretimde yalnızca site adresi.
 *   Geliştirmede ek olarak `http://localhost:*` (IP adresi WebAuthn'da RP olamaz).
 * - Başarısız giriş, şifreli girişle AYNI kilit politikasına sayılır (§8.4).
 * - Hesap kilidi passkey'i kapatmaz: kilit şifre denemelerine karşıdır. Başkası şifre deneyerek
 *   sahibini Face ID'den de atamasın (2026-11-02).
 * - Passkey eklemek oturum + yazma kapısı ister (eylem katmanı) ve denetlenir.
 */

const CHALLENGE_OMRU_MS = 5 * 60_000;
const RP_ADI = 'SŞ Panel';
/** IP başına açık meydan okuma: tek kaynak Face ID girişini kapatamasın. */
const IP_BASINA_ACIK_GIRIS = 10;
/** Bütün IP'ler için üst sınır: tabloyu doldurma girişimi burada durur. */
const ACIK_GIRIS_TAVANI = 1000;

type Amac = 'kayit' | 'giris';

export class PasskeyHatasi extends Error {
  constructor(
    readonly kod: 'KOKEN' | 'SURESI_DOLDU' | 'DOGRULANAMADI' | 'BILINMEYEN' | 'KILITLI',
    message: string,
  ) {
    super(message);
    this.name = 'PasskeyHatasi';
  }
}

export interface Rp {
  rpID: string;
  origin: string;
}

/**
 * İsteğin kökeninden RP bilgisi. İzinli değilse `null` — çağıran reddeder. SAF.
 * Köken istemciden gelir ama yalnızca ONAY LİSTESİYLE karşılaştırılır; asıl
 * koruma tarayıcının imzaladığı `clientDataJSON.origin`in aynı değere bağlı
 * doğrulanması.
 */
export function rpCoz(
  istekKokeni: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): Rp | null {
  const site = env.NEXT_PUBLIC_SITE_URL?.trim();
  let siteKokeni: string | null = null;
  try {
    siteKokeni = site ? new URL(site).origin : null;
  } catch {
    siteKokeni = null;
  }
  const koken = istekKokeni?.trim() || siteKokeni;
  if (!koken) return null;

  const gelistirme = env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(koken);
  // CI'nın üretim derlemesindeki e2e: tam eşleşen TEK ek köken (ci.yml). Üretimde boş.
  const test = !!env.PASSKEY_TEST_KOKENI && koken === env.PASSKEY_TEST_KOKENI.trim();
  if (koken !== siteKokeni && !gelistirme && !test) return null;
  return { rpID: new URL(koken).hostname, origin: koken };
}

export type PasskeyClient = Pick<
  typeof db,
  'passkey' | 'webAuthnChallenge' | 'user' | 'loginAttempt' | 'auditLog'
>;

async function challengeSakla(
  challenge: string,
  amac: Amac,
  userId: string | null,
  client: PasskeyClient,
  simdi: Date,
  ip: string | null = null,
): Promise<void> {
  // Süresi geçenleri temizle — tablo büyümesin.
  await client.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: simdi } } });
  await client.webAuthnChallenge.create({
    data: {
      challenge,
      purpose: amac,
      userId,
      ip,
      expiresAt: new Date(simdi.getTime() + CHALLENGE_OMRU_MS),
    },
  });
}

/** Yanıttaki meydan okumayı çözer ve TÜKETİR (siler). Yoksa/eskiyse hata. */
async function challengeTuket(
  clientDataJSON: string,
  amac: Amac,
  userId: string | null,
  client: PasskeyClient,
  simdi: Date,
): Promise<string> {
  let challenge: string;
  try {
    const veri = JSON.parse(isoBase64URL.toUTF8String(clientDataJSON)) as { challenge?: unknown };
    if (typeof veri.challenge !== 'string') throw new Error('challenge yok');
    challenge = veri.challenge;
  } catch {
    throw new PasskeyHatasi('DOGRULANAMADI', 'Yanıt okunamadı.');
  }

  // Silme TEK adımda: iki eşzamanlı istekten yalnızca biri satırı bulur.
  const silinen = await client.webAuthnChallenge.deleteMany({
    where: {
      challenge,
      purpose: amac,
      ...(userId ? { userId } : {}),
      expiresAt: { gt: simdi },
    },
  });
  if (silinen.count !== 1) {
    throw new PasskeyHatasi('SURESI_DOLDU', 'İşlemin süresi doldu. Yeniden dene.');
  }
  return challenge;
}

/* ===========================================================================
 * KAYIT — oturum açıkken "Face ID ekle"
 * ======================================================================== */

export async function kayitSecenekleri(
  kullanici: { id: string; email: string; name: string },
  rp: Rp,
  client: PasskeyClient = db,
  simdi: Date = new Date(),
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const mevcut = await client.passkey.findMany({
    where: { userId: kullanici.id },
    select: { credentialId: true, transports: true },
  });

  const secenekler = await generateRegistrationOptions({
    rpName: RP_ADI,
    rpID: rp.rpID,
    userName: kullanici.email,
    userDisplayName: kullanici.name,
    userID: isoBase64URL.toBuffer(isoBase64URL.fromUTF8String(kullanici.id)),
    attestationType: 'none',
    // Aynı cihazı ikinci kez eklemesin.
    excludeCredentials: mevcut.map((p) => ({
      id: p.credentialId,
      transports: p.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });

  await challengeSakla(secenekler.challenge, 'kayit', kullanici.id, client, simdi);
  return secenekler;
}

export async function kayitDogrula(
  userId: string,
  yanit: RegistrationResponseJSON,
  ad: string,
  rp: Rp,
  client: PasskeyClient = db,
  simdi: Date = new Date(),
): Promise<{ id: string; name: string }> {
  const challenge = await challengeTuket(
    yanit.response.clientDataJSON,
    'kayit',
    userId,
    client,
    simdi,
  );

  const sonuc = await verifyRegistrationResponse({
    response: yanit,
    expectedChallenge: challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: true,
  }).catch(() => null);

  if (!sonuc?.verified) {
    throw new PasskeyHatasi('DOGRULANAMADI', 'Cihaz doğrulanamadı.');
  }

  const { credential } = sonuc.registrationInfo;
  const kayit = await client.passkey.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      name: ad,
    },
    select: { id: true, name: true },
  });
  return kayit;
}

/* ===========================================================================
 * GİRİŞ
 * ======================================================================== */

export async function girisSecenekleri(
  rp: Rp,
  client: PasskeyClient = db,
  simdi: Date = new Date(),
  ip: string | null = null,
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  // Giriş öncesi, oturumsuz çağrılır: açık meydan okuma sayısına TAVAN — tabloyu
  // doldurma girişimi burada durur (süresi geçenler her üretimde siliniyor).
  const acik = await client.webAuthnChallenge.count({
    where: { purpose: 'giris', expiresAt: { gt: simdi } },
  });
  const ipAcik =
    ip === null
      ? 0
      : await client.webAuthnChallenge.count({
          where: { purpose: 'giris', ip, expiresAt: { gt: simdi } },
        });
  if (acik >= ACIK_GIRIS_TAVANI || ipAcik >= IP_BASINA_ACIK_GIRIS) {
    throw new PasskeyHatasi('SURESI_DOLDU', 'Çok fazla deneme. Birazdan yeniden dene.');
  }

  // Hesap seçmeye gerek yok: cihaz bu siteye ait passkey'i kendisi önerir
  // (keşfedilebilir kimlik bilgisi). E-posta istenmez → numaralandırma yok.
  const secenekler = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: 'required',
    allowCredentials: [],
  });
  await challengeSakla(secenekler.challenge, 'giris', null, client, simdi);
  return secenekler;
}

export async function girisDogrula(
  yanit: AuthenticationResponseJSON,
  rp: Rp,
  ip: string,
  client: PasskeyClient = db,
  simdi: Date = new Date(),
): Promise<AuthenticatedUser> {
  const passkey = await client.passkey.findUnique({
    where: { credentialId: yanit.id },
    include: {
      user: {
        select: { id: true, email: true, name: true, lockedUntil: true, totpConfirmedAt: true },
      },
    },
  });

  const basarisiz = async (hata: PasskeyHatasi): Promise<never> => {
    const emailHash = passkey ? hashEmail(passkey.user.email) : '';
    await recordLoginAttempt({ ip, emailHash, success: false }, client);
    await applyLockoutPolicy(
      { ip, emailHash, userId: passkey?.userId ?? null },
      {
        countRecentFailures: (filtre, since) => countRecentFailures(filtre, since, client),
        client,
      },
      simdi,
    );
    throw hata;
  };

  let challenge: string;
  try {
    challenge = await challengeTuket(yanit.response.clientDataJSON, 'giris', null, client, simdi);
  } catch (hata) {
    return basarisiz(hata as PasskeyHatasi);
  }

  if (!passkey) {
    return basarisiz(new PasskeyHatasi('BILINMEYEN', 'Bu cihaz kayıtlı değil.'));
  }
  const sonuc = await verifyAuthenticationResponse({
    response: yanit,
    expectedChallenge: challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: true,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(passkey.publicKey),
      counter: passkey.counter,
      transports: passkey.transports,
    },
  }).catch(() => null);

  if (!sonuc?.verified) {
    return basarisiz(new PasskeyHatasi('DOGRULANAMADI', 'Cihaz doğrulanamadı.'));
  }

  try {
    await client.passkey.update({
      where: { id: passkey.id },
      data: { counter: sonuc.authenticationInfo.newCounter, lastUsedAt: simdi },
    });
    await client.user.update({ where: { id: passkey.userId }, data: { lastLoginAt: simdi } });
  } catch (error) {
    // Sayaç yazılamadı diye doğrulanmış girişi engelleme — şifreli girişle aynı.
    guvenliHata('[passkey] sayaç güncellenemedi:', error instanceof Error ? error.message : error);
  }
  await recordLoginAttempt({ ip, emailHash: hashEmail(passkey.user.email), success: true }, client);

  return {
    id: passkey.user.id,
    email: passkey.user.email,
    name: passkey.user.name,
    twoFactorEnabled: passkey.user.totpConfirmedAt !== null,
  };
}

/* ===========================================================================
 * YÖNETİM
 * ======================================================================== */

export interface PasskeyDto {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export async function passkeyleriListele(
  userId: string,
  client: PasskeyClient = db,
): Promise<PasskeyDto[]> {
  const satirlar = await client.passkey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
  });
  return satirlar.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt.toISOString(),
    lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
  }));
}

/** Yalnızca KENDİ passkey'ini siler; başkasınınki 0 satır = bulunamadı. */
export async function passkeySil(
  userId: string,
  id: string,
  client: PasskeyClient = db,
): Promise<boolean> {
  const sonuc = await client.passkey.deleteMany({ where: { id, userId } });
  return sonuc.count === 1;
}
