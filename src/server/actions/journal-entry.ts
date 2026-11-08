'use server';

import { createJournalEntrySchema, entityIdSchema, updateJournalEntrySchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  createJournalEntry,
  deleteJournalEntry,
  updateJournalEntry,
  type JournalEntryDto,
} from '@/server/services/journal-entry';
import { ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * `JournalEntry` Server Action'ları — §4.2, §7.1, §8.20, T-112.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ GÜNLÜK İÇERİĞİ DENETİM KAYDINA GİRMİYOR — `HealthLog` KARARININ AYNISI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ölçüt T-110'da türetildi ve burada aynı cevabı veriyor — kopyalanmıyor,
 * yeniden uygulanıyor:
 *   - adli değer YOK: tek kullanıcı, üçüncü taraf yok, "ne zaman" sorusunu
 *     `updatedAt` zaten cevaplıyor;
 *   - hassasiyet EN YÜKSEK: günlük, sistemdeki en kişisel serbest metin.
 *     `content`, `title`, `tags` ve `mood` yazılmıyor — `tags` bile ("terapi",
 *     "ayrılık") içeriğin özeti olabilir.
 *
 * Denetim kaydının cevaplayabileceği tek soru yazılıyor: hangi GÜNÜN kaydı
 * ve hangi ALANLARA dokunuldu (`changed` — değeri alan adı, ADR-034 kalıbı).
 *
 * `revalidateTag` YOK — F5 modelleri public tarafta okunmuyor.
 */

/** Denetim kaydına giren alan ADLARI — değerler ASLA. */
function changedFieldNames(input: Record<string, unknown>): string {
  return Object.keys(input)
    .filter((key) => key !== 'id')
    .sort()
    .join(', ');
}

export async function createJournalEntryAction(
  raw: unknown,
): Promise<ApiResponse<JournalEntryDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createJournalEntrySchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createJournalEntry(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'JournalEntry',
        entityId: dto.id,
        diff: { day: dto.date, changed: changedFieldNames(parsed.data) },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('journalEntry:create', error);
  }
}

export async function updateJournalEntryAction(
  raw: unknown,
): Promise<ApiResponse<JournalEntryDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateJournalEntrySchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await updateJournalEntry(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'JournalEntry',
        entityId: dto.id,
        diff: { day: dto.date, changed: changedFieldNames(parsed.data) },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('journalEntry:update', error);
  }
}

/**
 * GERÇEK silme. ⚠️ Silinen içerik denetim kaydında YAŞATILMIYOR — silme
 * niyetini baltalardı (`deleteHealthLogAction` gerekçesi). Yalnızca gün.
 */
export async function deleteJournalEntryAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await deleteJournalEntry(parsed.data.id);

    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'JournalEntry',
        entityId: dto.id,
        diff: { day: dto.date },
      },
      db,
    );

    return ok({ id: dto.id });
  } catch (error) {
    return toFailure('journalEntry:delete', error);
  }
}
