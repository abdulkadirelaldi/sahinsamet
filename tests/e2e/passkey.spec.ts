import { expect, test } from '@playwright/test';

import { adminCredentials, findAdminUser, passkeySondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * FACE ID İLE GİRİŞ — UÇTAN UCA, GERÇEK KRİPTOGRAFİYLE (2026-10-30).
 *
 * Chromium'un SANAL DOĞRULAYICISI (CDP `WebAuthn`) gerçek bir passkey üretir
 * ve imzalar; sunucu SimpleWebAuthn ile gerçekten doğrular — sahte yok.
 * Akış: oturum açıkken passkey ekle → çerezleri sil → "Face ID ile giriş" →
 * panele düş.
 *
 * ⚠️ `localhost`ta koşar, `127.0.0.1`de DEĞİL: WebAuthn IP adresini RP
 * kabul etmiyor. CI'nın üretim derlemesi bu kökeni `PASSKEY_TEST_KOKENI` ile
 * tanıyor (ci.yml); yerelde geliştirme sunucusu `localhost:*`u zaten tanır.
 */

const KOKEN = `http://localhost:${process.env.E2E_PORT ?? 3100}`;

test.describe('Face ID (passkey)', () => {
  test('passkey eklenir, çıkıştan sonra Face ID ile giriş yapılır', async ({ page }) => {
    const { email } = adminCredentials();
    const yonetici = await findAdminUser();

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

    try {
      await applySessionCookie(
        page.context(),
        { userId: yonetici.id, email, twoFactorEnabled: true },
        KOKEN,
      );
      await page.goto(`${KOKEN}/panel/ayarlar/guvenlik`);
      await page.getByRole('button', { name: /cihazı ekle/ }).click();
      await expect(page.getByRole('status').filter({ hasText: 'eklendi' })).toBeVisible();
      // Masaüstü ve mobil projeleri aynı hesaba PARALEL ekliyor — en az biri.
      await expect(page.getByRole('button', { name: 'Kaldır' }).first()).toBeVisible();

      /* ---- Çıkış → yalnızca Face ID ile geri gir ---------------------- */
      await page.context().clearCookies();
      await page.goto(`${KOKEN}/giris`);
      await page.getByRole('button', { name: 'Face ID ile giriş' }).click();
      await page.waitForURL(/\/panel/);
      expect(new URL(page.url()).pathname.startsWith('/panel')).toBe(true);
    } finally {
      // Yalnızca BU sanal cihazın passkey'i: CDP standart base64 veriyor, kayıt base64url.
      const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
      await passkeySondaSil(
        credentials.map((k) => Buffer.from(k.credentialId, 'base64').toString('base64url')),
      );
    }
  });
});
