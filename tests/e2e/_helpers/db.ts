import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * E2E test verisi yönetimi.
 *
 * Bu dosya İNCE BİR SARMALAYICIDIR: gerçek veritabanı işleri `db-task.ts`
 * içinde, ayrı bir Node sürecinde koşar. Gerekçe `db-resolver.mjs` başında —
 * özetle Playwright'in yükleyicisi `src/**` içindeki `@/` takma adlarını
 * çözemiyor ve kök `tsconfig.json` bu görevin kapsamı dışında.
 *
 * KAZANÇ: Backend'in `encryptSecret` / `hashBackupCodes` / `hashEmail`
 * uygulamaları TÜKETİLİR, kopyalanmaz. Şifreleme biçimi değişirse test tarafı
 * kendiliğinden uyumlu kalır — güvenlik ilkelinin ikinci bir kopyası oluşmaz.
 *
 * NEDEN BU DOSYA VAR (T-018b / ENGEL-1 ve ENGEL-2): Frontend 2FA'yı elle açıp
 * elle temizledi. Temizliği UNUTMAK, secret'ı yalnızca testlerde bulunan bir
 * hesap bırakır — **site sahibi kendi panelinden kilitlenir.** Temizlik artık
 * `globalTeardown`'a bağlı ve otomatik.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const REGISTER = path.join(PROJECT_ROOT, 'tests/e2e/_helpers/db-register.mjs');
const TASK = path.join(PROJECT_ROOT, 'tests/e2e/_helpers/db-task.ts');

/** Sabit test secret'ı — RFC 6238 tohumunun Base32 hâli (deterministik kod üretimi). */
export const TEST_TOTP_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

/** Sabit kurtarma kodları — biçim `XXXXX-XXXXX` (ADR-013). */
export const TEST_BACKUP_CODES = ['AAAAA-BBBBB', 'CCCCC-DDDDD', 'EEEEE-FFFFF'] as const;

async function runTask<T>(command: string, arg?: string): Promise<T> {
  const args = ['--import', REGISTER, TASK, command];
  if (arg !== undefined) args.push(arg);

  const { stdout } = await execFileAsync(process.execPath, args, {
    cwd: PROJECT_ROOT,
    env: process.env,
    // Node'un TypeScript tip sıyırma uyarısı stderr'i kirletmesin.
    encoding: 'utf8',
  });

  return JSON.parse(stdout) as T;
}

export interface AdminCredentials {
  email: string;
  password: string;
}

/**
 * Seed'in oluşturduğu yönetici hesabının kimlik bilgileri.
 *
 * `.env`'den okunur, teste GÖMÜLMEZ (§8.17/§8.20). Eksikse net hata verilir;
 * boş dizeyle devam etmek testleri sessizce anlamsız kılardı.
 */
export function adminCredentials(): AdminCredentials {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E için ADMIN_EMAIL ve ADMIN_PASSWORD gerekli. .env dosyasını kontrol edin (bkz. .env.example).',
    );
  }

  return { email, password };
}

export interface AdminSnapshot {
  id: string;
  email: string;
  twoFactorEnabled: boolean;
  remainingBackupCodes: number;
  lockedUntil: string | null;
}

export async function findAdminUser(): Promise<AdminSnapshot> {
  return runTask<AdminSnapshot>('admin');
}

/**
 * Test kullanıcısında 2FA'yı açar.
 *
 * Seed 2FA'yı KAPALI bırakıyor (bilinçli, T-013b) — §9/3'ün "doğru şifre →
 * 2FA adımı" kısmı ancak bundan sonra ölçülebilir.
 */
export async function enableTwoFactor(): Promise<{
  secret: string;
  backupCodes: readonly string[];
}> {
  return runTask('enableTwoFactor');
}

/** Kalan (tüketilmemiş) kurtarma kodu sayısı — tüketimi doğrulamak için. */
export async function remainingBackupCodeCount(): Promise<number> {
  return (await findAdminUser()).remainingBackupCodes;
}

export async function isAccountLocked(now: Date = new Date()): Promise<boolean> {
  const { lockedUntil } = await findAdminUser();
  return lockedUntil != null && new Date(lockedUntil).getTime() > now.getTime();
}

/** Kilit denetim kaydı sayısı — ADR-022'nin uçtan uca doğrulanması. */
export async function lockAuditLogCount(): Promise<number> {
  return (await runTask<{ count: number }>('lockAuditCount')).count;
}

export async function clearLock(): Promise<void> {
  await runTask('clearLock');
}

/**
 * Başarısız deneme sayacını sıfırlar.
 *
 * §8.4 sayımı IP başına 15 dakikalık pencerede. Kilit testi 5 kayıt bırakır;
 * temizlenmezse SONRAKİ testler ilk denemede kilide takılır ve sıraya bağlı,
 * açıklaması zor kırılmalar başlar.
 */
export async function clearLoginAttempts(): Promise<void> {
  await runTask('clearLoginAttempts');
}

/** Kullanıcıyı seed durumuna döndürür ve testin bıraktığı izleri siler. */
export async function resetAuthState(since?: Date): Promise<void> {
  await runTask('resetAuthState', since?.toISOString());
}

/* ===========================================================================
 * §9/6 ve §9/2 — içerik izleri (T-039)
 * ======================================================================== */

export interface ProfilAnlik {
  headline: string;
  bio: string;
  location: string | null;
  socials: Record<string, string> | null;
  avatarAttachmentId: string | null;
}

/** Tekil profilin ham hâli — testin sonunda geri yüklemek için. */
export async function profilAnlik(): Promise<ProfilAnlik | null> {
  return runTask<ProfilAnlik | null>('profilAnlik');
}

export async function profilGeriYukle(anlik: ProfilAnlik | null): Promise<void> {
  await runTask('profilGeriYukle', JSON.stringify(anlik));
}

export interface E2EKalintisi {
  denetim: number;
  /** F5 egzersiz + alışkanlık izleri — T-116'da eklendi. */
  kisisel: number;
  toplam: number;
}

export async function e2eKalintisi(): Promise<E2EKalintisi> {
  return runTask<E2EKalintisi>('e2eKalintisi');
}

/** F5 izlerini siler — gerekçe `db-task.ts` → `kisiselSondaSil`. */
export async function kisiselSondaSil(onek: string, gun: string): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>(
    'kisiselSondaSil',
    JSON.stringify({ onek, gun }),
  );
  return silinen;
}

/**
 * Denetim ekranına bilinen bir `diff` yazar ve satır kimliğini döner.
 *
 * Gerekçe ve neden `writeAuditLog` kullanılmadığı: `db-task.ts` →
 * `denetimSondasiYaz`.
 */
export async function denetimSondasiYaz(sonda: {
  entity: string;
  entityId: string;
  diff: Record<string, unknown>;
}): Promise<string> {
  const { id } = await runTask<{ id: string }>('denetimSondasiYaz', JSON.stringify(sonda));
  return id;
}

export async function denetimSondasiSil(id: string): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>(
    'denetimSondasiSil',
    JSON.stringify({ id }),
  );
  return silinen;
}

/** Hızlı ekleme e2e izlerini siler — gerekçe `db-task.ts` → `hizliSondaSil`. */
export async function hizliSondaSil(onek: string): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>('hizliSondaSil', JSON.stringify({ onek }));
  return silinen;
}

/** Takvim e2e izlerini siler — gerekçe `db-task.ts` → `takvimSondaSil`. */
export async function takvimSondaSil(onek: string): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>(
    'takvimSondaSil',
    JSON.stringify({ onek }),
  );
  return silinen;
}

/** İngilizce e2e'sinin ders kayıtlarını siler (yalnızca `sonra`dan beri o ders). */
export async function ingilizceSondaSil(dersId: string | string[], sonra: Date): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>(
    'ingilizceSondaSil',
    JSON.stringify({ dersId, sonra: sonra.toISOString() }),
  );
  return silinen;
}

/** İngilizce e2e'sinin içerik hatası bildirimlerini siler. */
export async function icerikHatasiSil(dersId: string, sonra: Date): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>(
    'icerikHatasiSil',
    JSON.stringify({ dersId, sonra: sonra.toISOString() }),
  );
  return silinen;
}

export interface RotaKimlikleri {
  saglik: string;
  oturum: string;
  hesap: string;
  akis: string;
  antrenman: string;
  egzersiz: string;
  programGunu: string;
  aliskanlik: string;
  hedef: string;
  gunluk: string;
}

/** Detay sayfaları için kayıt kimlikleri: yoksa önekle açılır, `rotaSondaSil` temizler. */
export async function rotaSondaKur(onek: string): Promise<RotaKimlikleri> {
  return runTask('rotaSondaKur', JSON.stringify({ onek }));
}

export async function rotaSondaSil(onek: string): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>('rotaSondaSil', JSON.stringify({ onek }));
  return silinen;
}

/** Para akışı e2e'sinin hesap ve borçlarını açar. */
export async function cuzdanSondaKur(
  onek: string,
): Promise<{ hesapA: string; hesapB: string; borcId: string }> {
  return runTask('cuzdanSondaKur', JSON.stringify({ onek }));
}

export async function cuzdanSondaSil(onek: string): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>(
    'cuzdanSondaSil',
    JSON.stringify({ onek }),
  );
  return silinen;
}

/** Face ID e2e izlerini siler — gerekçe `db-task.ts` → `passkeySondaSil`. */
export async function passkeySondaSil(kimlikler: string[]): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>(
    'passkeySondaSil',
    JSON.stringify({ kimlikler }),
  );
  return silinen;
}
