import { REDACTED_FIELD_NAMES } from '@/lib/schemas';
import type { AuditAction } from '@/types';
import { guvenliHata } from '@/lib/security/guvenli-log';

/**
 * `AuditLog` yazma yardımcısı + redaksiyon — §8.19, §8.20, ADR-020, ADR-022.
 *
 * TÜM PANEL MUTASYONLARI BU FONKSİYONDAN GEÇER. Tek nokta olması iki şey sağlar:
 * Güvenlik ajanı denetlerken tek dosyaya bakar, ve redaksiyon unutulamaz —
 * çağıran taraf `diff`'i ham verse bile burada maskelenir.
 *
 * ADR-022 SINIRI: **denemeler `LoginAttempt`'e, SONUÇLAR `AuditLog`'a.**
 * Giriş denemeleri buraya YAZILMAZ (§8.4 kaydı ayrı tabloda). Buraya yazılanlar:
 * hesap kilitlenmesi, şifre değişikliği, 2FA açma/kapatma ve panel mutasyonları.
 */

export const REDACTION_PLACEHOLDER = '[REDACTED]' as const;

/** Küçük harfe indirilmiş arama kümesi — `Password` ile `password` aynı sayılır. */
const REDACTED_KEYS = new Set<string>(REDACTED_FIELD_NAMES.map((name) => name.toLowerCase()));

/**
 * Alan adı bazlı redaksiyon — ADR-020.
 *
 * İÇ İÇE ÇALIŞIR: `diff` derin olabilir (`{ before: { email }, after: { email } }`)
 * ve yüzeysel bir tarama e-postayı bir seviye altta kaçırırdı. Diziler de gezilir.
 *
 * Değerin TİPİNE değil ANAHTAR ADINA bakılır: içeriğe göre tahmin yürütmek
 * (örn. "@ içeriyorsa e-postadır") hem yanlış pozitif hem yanlış negatif üretir.
 *
 * Döngüsel referans koruması var — `diff` çağıran tarafından kurulmuş bir nesne
 * ve bir gün kendine referans veren bir yapı gelirse sonsuz özyineleme
 * denetim kaydını değil SUNUCUYU düşürürdü.
 */
export function redactAuditDiff(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return REDACTION_PLACEHOLDER;
    seen.add(value);
    return value.map((item) => redactAuditDiff(item, seen));
  }

  if (typeof value === 'object' && value !== null) {
    if (seen.has(value)) return REDACTION_PLACEHOLDER;
    seen.add(value);

    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = REDACTED_KEYS.has(key.toLowerCase())
        ? REDACTION_PLACEHOLDER
        : redactAuditDiff(item, seen);
    }
    return result;
  }

  return value;
}

/** `AuditLog.create` için gereken asgari Prisma yüzeyi — test için taklit edilebilir. */
export interface AuditLogClient {
  auditLog: {
    create(args: {
      data: {
        actorId?: string | null;
        actorEmailHash?: string | null;
        action: AuditAction;
        entity: string;
        entityId?: string | null;
        diff?: unknown;
        ip?: string | null;
        userAgent?: string | null;
      };
    }): Promise<unknown>;
  };
}

export interface WriteAuditLogInput {
  /** Oturum sahibinin kimliği. Kimliksiz bir işlemse (örn. hız sınırı kilidi) `null`. */
  actorId?: string | null;
  /** §8.20 — ham e-posta değil, özeti. */
  actorEmailHash?: string | null;
  action: AuditAction;
  /** Model adı — `'Project'`, `'Transaction'`, `'User'`… (ADR-020/K4: enum değil). */
  entity: string;
  entityId?: string | null;
  /** Ham verilebilir; redaksiyon BURADA uygulanır. */
  diff?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Denetim kaydı yazar.
 *
 * ASLA FIRLATMAZ. Denetim kaydı yazılamadı diye kullanıcının mutasyonunu geri
 * almak, başarılı bir işlemi başarısız göstermek olurdu; hata loglanır ve akış
 * devam eder. (Aynı gerekçe `recordLoginAttempt`'te de geçerliydi.)
 *
 * §8.20 — log satırı yalnızca hata mesajını taşır, `diff`'i değil.
 */
export async function writeAuditLog(
  input: WriteAuditLogInput,
  client: AuditLogClient,
): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmailHash: input.actorEmailHash ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        diff: input.diff === undefined ? undefined : redactAuditDiff(input.diff),
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    guvenliHata(
      '[audit] denetim kaydı yazılamadı:',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Bir mutasyonun öncesi/sonrası farkını `diff` için hazırlar.
 *
 * Yalnızca DEĞİŞEN alanları taşır — tüm kaydı yazmak denetim kaydını şişirir ve
 * neyin değiştiğini okumayı zorlaştırır. Değerler redaksiyondan `writeAuditLog`
 * içinde geçer.
 */
export function buildDiff<T extends Record<string, unknown>>(
  before: T | null,
  after: Partial<T>,
): Record<string, { before: unknown; after: unknown }> {
  const diff: Record<string, { before: unknown; after: unknown }> = {};

  for (const [key, nextValue] of Object.entries(after)) {
    const previousValue = before ? before[key] : undefined;
    if (!Object.is(previousValue, nextValue)) {
      diff[key] = { before: previousValue ?? null, after: nextValue ?? null };
    }
  }

  return diff;
}
