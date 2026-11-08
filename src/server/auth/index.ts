/**
 * Auth katmanı — toplu yeniden ihraç.
 *
 * Kripto primitifleri (T-013a) ile giriş akışı (T-013b) tek yerden tüketilir.
 * `auth()` / `signIn()` / `signOut()` BURADA DEĞİL `@/server/auth` (üst dosya)
 * içindedir; NextAuth başlatmasını bu barrel'a taşımak, yalnızca `hashPassword`
 * isteyen bir modülün de tüm Auth.js zincirini yüklemesine yol açardı.
 */

export {
  ARGON2_OPTIONS,
  hashPassword,
  needsRehash,
  verifyPassword,
  type Argon2Overrides,
} from './password';

export {
  buildTotpUri,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  isEncryptedSecret,
  verifyTotpToken,
} from './totp';

export {
  BACKUP_CODE_COUNT,
  consumeBackupCode,
  generateBackupCodes,
  hashBackupCodes,
  normalizeBackupCode,
  type ConsumeBackupCodeResult,
} from './backup-codes';

export {
  countRecentFailures,
  hashEmail,
  purgeLoginAttemptsBefore,
  recordLoginAttempt,
  type LoginAttemptClient,
  type RecordLoginAttemptInput,
} from './login-attempt';

export {
  authenticateUser,
  extractClientIp,
  type AuthClient,
  type AuthenticateInput,
  type AuthenticateResult,
  type AuthenticatedUser,
  type AuthFailureReason,
  type AuthUserRecord,
} from './credentials';
