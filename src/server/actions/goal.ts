'use server';

import { createGoalSchema, entityIdSchema, updateGoalSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  GoalRuleError,
  createGoal,
  deleteGoal,
  hedefiTasi,
  updateGoal,
  type GoalDto,
} from '@/server/services/goal';
import {
  buildDiff,
  fail,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * `Goal` Server Action'ları — §4.2, §7.1, §8.20, T-112.
 *
 * DENETİM KAYDI: yapılandırılmış alanlar (`title`, `category`, `status`,
 * `progress`, `targetDate`) DEĞERLERİYLE yazılıyor; `description` YAZILMIYOR.
 * Serbest metin — ADR-034'ün "masum anahtarın değerine gömülü sır" sınıfı
 * (`Transaction.description`, `Client.notes` ile aynı karar). Değiştiği
 * bilgisi `changed` ile kalıyor; değer kalmıyor.
 *
 * `title` neden yazılıyor: kısa bir ad ve denetim ekranında "hangi hedef"
 * sorusunun tek okunur cevabı. `Exercise.name` ile aynı sınıf.
 *
 * `revalidateTag` YOK — F5 modelleri public tarafta okunmuyor.
 */

/** Diff'e girecek alanlar — BULGU-019: liste elle, modelden türetilmez. */
function auditable(fields: Record<string, unknown>): Record<string, unknown> {
  const { description, ...rest } = fields;
  return {
    ...buildDiff(null, rest),
    ...(description !== undefined ? { changed: 'description' } : {}),
  };
}

export async function createGoalAction(raw: unknown): Promise<ApiResponse<GoalDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createGoalSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createGoal(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Goal',
        entityId: dto.id,
        diff: auditable(parsed.data),
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('goal:create', error);
  }
}

export async function updateGoalAction(raw: unknown): Promise<ApiResponse<GoalDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateGoalSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const { id: _id, ...fields } = parsed.data;

  try {
    const dto = await updateGoal(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Goal',
        entityId: dto.id,
        /*
         * ⚠️ `progress` YAZILAN değerle: "ulaştım" denip ilerleme verilmediyse
         * servis onu 100'e çekiyor (`resolveGoalUpdate`/a). Girdiyi yazmak
         * denetim kaydında bu değişikliği GÖRÜNMEZ kılardı.
         */
        diff: auditable(
          fields.status === 'ACHIEVED' ? { ...fields, progress: dto.progress } : fields,
        ),
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    if (error instanceof GoalRuleError) {
      return fail('VALIDATION_ERROR', error.message, { progress: error.message });
    }
    return toFailure('goal:update', error);
  }
}

/** GERÇEK silme — `Goal`a bağlı FK yok (`services/goal.ts`). */
export async function deleteGoalAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await deleteGoal(parsed.data.id);

    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'Goal',
        entityId: dto.id,
        // BULGU-019: silinen satırın TAMAMI değil, sayılı alanlar.
        diff: { deleted: { title: dto.title, status: dto.status, progress: dto.progress } },
      },
      db,
    );

    return ok({ id: dto.id });
  } catch (error) {
    return toFailure('goal:delete', error);
  }
}

/** Biten dönemden kalan hedefi bugünün dönemine taşır. */
export async function hedefiTasiAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const { id } = parsed.data;

  try {
    await hedefiTasi(id);
    await writeAuditLog(
      { actorId, action: 'UPDATE', entity: 'Goal', entityId: id, diff: { tasindi: true } },
      db,
    );
    return ok({ id });
  } catch (error) {
    if (error instanceof GoalRuleError) return fail('VALIDATION_ERROR', error.message);
    return toFailure('goal:tasi', error);
  }
}
