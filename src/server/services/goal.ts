import type { CreateGoalInput, GoalFilterInput, UpdateGoalInput } from '@/lib/schemas';
import { db } from '@/server/db';
import type { GoalCategory, GoalPeriod, GoalStatus } from '@/types';

import {
  appDayToDate,
  appToday,
  dateToAppDay,
  differenceInAppDays,
  donemAnahtari,
  donemAnahtariGecerliMi,
  panelSkipTake,
  toPagedResult,
  type AppDay,
} from './_shared';
import type { PagedResult } from './content-dto';

/**
 * `Goal` servisi — §4.2 `/panel/hayat` "hedef", ADR-020, T-112.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ "ULAŞILDI ⇔ %100" KURALI ŞEMADA YARIM — TAMAMI BURADA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `updateGoalSchema`nın çapraz kuralı yalnızca İKİ ALAN BİRLİKTE geldiğinde
 * bakabiliyor; kısmi güncellemede mevcut kaydı bilmiyor. İki sessiz yol açık
 * kalıyordu:
 *
 *   (a) `%40`'taki hedefe yalnızca `{ status: 'ACHIEVED' }` → şema geçirir,
 *       kayıt "Ulaşıldı · %40" olur.
 *   (b) ulaşılmış hedefe yalnızca `{ progress: 60 }` → şema geçirir,
 *       kayıt yine "Ulaşıldı · %60" olur.
 *
 * İkisi de şemanın kendi yorumunun "panel kartı ile rozet birbirini
 * yalanlar" dediği durum. Kural bu yüzden MEVCUT kayıtla BİRLEŞTİRİLMİŞ hâl
 * üzerinde uygulanıyor (`resolveGoalUpdate`) ve iki yolun cevabı farklı:
 *
 *   (a) niyet AÇIK — "ulaştım" diyen kullanıcı %100 diyordur → ilerleme 100'e
 *       çekilir.
 *   (b) niyet BELİRSİZ — ilerlemeyi mi düzeltti, rozeti mi unuttu? Tahmin
 *       edilmez, REDDEDİLİR ve mesaj iki çıkışı da söyler.
 *
 * GERÇEK SİLME — `Goal`a bağlı FK yok (T-038 ölçütü). `ABANDONED` durumu
 * "vazgeçtim"i kayıt altında tutmak isteyen için zaten var; silme "hiç
 * olmamalıydı" demek.
 *
 * ÖNBELLEKLENMEZ · `revalidateTag` YOK — F5 modelleri public tarafta yok.
 */

export interface GoalDto {
  id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  /** Gün (`YYYY-MM-DD`) — `@db.Date`. */
  targetDate: string | null;
  progress: number;
  status: GoalStatus;
  /** Dönemli hedef (2026-10-29) — boşsa uzun vadeli. */
  period: GoalPeriod | null;
  /** `2026-W44` · `2026-10` · `2026`. */
  periodKey: string | null;
  /**
   * Hedef tarihe kalan gün (`targetDate - bugün`); geçmişse NEGATİF.
   * `targetDate` yoksa `null`. Okuma anında türetilir, saklanmaz.
   */
  daysLeft: number | null;
  createdAt: string;
  updatedAt: string;
}

const GOAL_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  targetDate: true,
  progress: true,
  status: true,
  period: true,
  periodKey: true,
  createdAt: true,
  updatedAt: true,
} as const;

interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  targetDate: Date | null;
  progress: number;
  status: string;
  period: string | null;
  periodKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalClient {
  goal: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof GOAL_SELECT;
      orderBy: Array<Record<string, unknown>>;
      skip?: number;
      take?: number;
    }): Promise<GoalRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      select: typeof GOAL_SELECT;
    }): Promise<GoalRow | null>;
    create(args: {
      data: {
        title: string;
        description: string | null;
        category: GoalCategory;
        targetDate: Date | null;
        progress: number;
        status: GoalStatus;
        period: GoalPeriod | null;
        periodKey: string | null;
      };
      select: typeof GOAL_SELECT;
    }): Promise<GoalRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof GOAL_SELECT;
    }): Promise<GoalRow>;
    delete(args: { where: { id: string } }): Promise<GoalRow>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR (T-110'un kalıbı). */
const _uyumKontrolu: GoalClient = db;
void _uyumKontrolu;

function toDto(row: GoalRow, today: AppDay): GoalDto {
  const targetDate = row.targetDate ? dateToAppDay(row.targetDate) : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as GoalCategory,
    targetDate,
    progress: row.progress,
    status: row.status as GoalStatus,
    period: row.period as GoalPeriod | null,
    periodKey: row.periodKey,
    daysLeft: targetDate ? differenceInAppDays(today, targetDate) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* ===========================================================================
 * SAF ÇEKİRDEK — çapraz kural
 * ======================================================================== */

export type GoalUpdateResolution =
  { ok: true; progress: number | undefined } | { ok: false; message: string };

/**
 * Kısmi güncellemeyi MEVCUT kayıtla birleştirip "ulaşıldı ⇔ %100" kuralını
 * uygular — SAF. Gerekçe dosya başında.
 *
 * Dönen `progress`: yazılacak değer; `undefined` → ilerlemeye dokunulmaz.
 */
export function resolveGoalUpdate(
  current: { status: GoalStatus; progress: number },
  fields: { status?: GoalStatus; progress?: number },
): GoalUpdateResolution {
  const status = fields.status ?? current.status;

  if (status !== 'ACHIEVED') return { ok: true, progress: fields.progress };

  // (a) "ulaştım" deniyor, ilerleme verilmedi → niyet açık, %100.
  if (fields.progress === undefined) return { ok: true, progress: 100 };

  if (fields.progress === 100) return { ok: true, progress: 100 };

  // (b) ulaşılmış hedefin ilerlemesi düşürülüyor → niyet belirsiz, reddet.
  return {
    ok: false,
    message:
      'Ulaşıldı olarak işaretli bir hedefin ilerlemesi %100 olmalıdır. İlerlemeyi ' +
      'düşürmek istiyorsanız durumu da "Aktif" ya da "Duraklatıldı" olarak değiştirin.',
  };
}

export class GoalRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoalRuleError';
  }
}

/* ===========================================================================
 * OKUMA
 * ======================================================================== */

/** Filtreyi `where`e çevirir — SAF. */
export function buildGoalWhere(filter: GoalFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.status) where.status = filter.status;
  if (filter.category) where.category = filter.category;
  if (filter.period) where.period = filter.period;
  if (filter.periodKey) where.periodKey = filter.periodKey;
  if (filter.uzunVadeli) where.period = null;
  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q, mode: 'insensitive' } },
      { description: { contains: filter.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Hedef listesi — sayfalı.
 *
 * SIRA: durum (Postgres enum'u TANIM sırasıyla sıralar: ACTIVE, PAUSED,
 * ACHIEVED, ABANDONED — yani açık hedefler önce), sonra EN YAKIN hedef
 * tarihi, tarihsizler SONDA. `nulls: 'last'` açık yazıldı: Postgres `ASC`te
 * NULL'ı varsayılan olarak sona koyar ama bu, sıralamanın anlamını bir
 * veritabanı varsayılanına bırakmak olurdu. İkincil anahtar `id`: sıra
 * belirli kalsın, sayfalama tekrar etmesin.
 */
export async function fetchGoals(
  filter: GoalFilterInput,
  client: GoalClient = db,
  today: AppDay = appToday(),
): Promise<PagedResult<GoalDto>> {
  const where = buildGoalWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.goal.findMany({
      where,
      select: GOAL_SELECT,
      orderBy: [{ status: 'asc' }, { targetDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      skip,
      take,
    }),
    client.goal.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, (row) => toDto(row, today));
}

export async function fetchGoalById(
  id: string,
  client: GoalClient = db,
  today: AppDay = appToday(),
): Promise<GoalDto | null> {
  const row = await client.goal.findUnique({ where: { id }, select: GOAL_SELECT });
  return row ? toDto(row, today) : null;
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

/** Boş dize `null` olur — "girilmedi" ile "boş girildi" aynı şey. */
function bosaNull(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

export async function createGoal(
  input: CreateGoalInput,
  client: GoalClient = db,
  today: AppDay = appToday(),
): Promise<GoalDto> {
  const row = await client.goal.create({
    data: {
      title: input.title,
      description: bosaNull(input.description),
      category: input.category,
      targetDate: input.targetDate ? appDayToDate(input.targetDate) : null,
      progress: input.progress,
      status: input.status,
      ...donemAlanlari(input.period, input.periodKey, today),
    },
    select: GOAL_SELECT,
  });

  return toDto(row, today);
}

/**
 * Dönem + anahtar. Anahtar verilmezse BUGÜNÜN dönemi; verilirse dönemine
 * uymalı (Zod biçimi kabaca süzüyor, dönemle eşleşme burada).
 */
function donemAlanlari(
  period: GoalPeriod | undefined,
  periodKey: string | undefined,
  today: AppDay,
): { period: GoalPeriod | null; periodKey: string | null } {
  if (!period) return { period: null, periodKey: null };
  if (periodKey && !donemAnahtariGecerliMi(period, periodKey)) {
    throw new Error(`Dönem anahtarı dönemine uymuyor: ${period} / ${periodKey}`);
  }
  return { period, periodKey: periodKey ?? donemAnahtari(period, today) };
}

/**
 * Günceller — KISMİ. `status`/`progress` dokunulduysa mevcut kayıt okunur ve
 * çapraz kural birleşik hâl üzerinde uygulanır.
 *
 * ⚠️ OKU-SONRA-YAZ arasında başka bir sekme durumu değiştirebilir; tek
 * kullanıcılı panelde kabul edilen yarış — sonuç yine kurala uyan bir
 * değer yazar, yalnızca hangi sekmenin kazandığı belirsizdir.
 */
export async function updateGoal(
  input: UpdateGoalInput,
  client: GoalClient = db,
  today: AppDay = appToday(),
): Promise<GoalDto> {
  const { id, ...fields } = input;

  let progress = fields.progress;

  if (fields.status !== undefined || fields.progress !== undefined) {
    const current = await client.goal.findUnique({ where: { id }, select: GOAL_SELECT });
    // Kayıt yoksa `update` P2025 verecek; eylem onu NOT_FOUND'a çeviriyor.
    if (current) {
      const resolution = resolveGoalUpdate(
        { status: current.status as GoalStatus, progress: current.progress },
        { status: fields.status, progress: fields.progress },
      );
      if (!resolution.ok) throw new GoalRuleError(resolution.message);
      progress = resolution.progress;
    }
  }

  const row = await client.goal.update({
    where: { id },
    data: {
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.description !== undefined ? { description: bosaNull(fields.description) } : {}),
      ...(fields.category !== undefined ? { category: fields.category } : {}),
      ...(fields.targetDate !== undefined
        ? { targetDate: fields.targetDate ? appDayToDate(fields.targetDate) : null }
        : {}),
      ...(progress !== undefined ? { progress } : {}),
      ...(fields.status !== undefined ? { status: fields.status } : {}),
    },
    select: GOAL_SELECT,
  });

  return toDto(row, today);
}

/** GERÇEK silme — `Goal`a bağlı FK yok (gerekçe dosya başında). */
export async function deleteGoal(
  id: string,
  client: GoalClient = db,
  today: AppDay = appToday(),
): Promise<GoalDto> {
  const row = await client.goal.delete({ where: { id } });
  return toDto(row, today);
}

/** Biten dönemden kalan hedefi bugünün dönemine taşır; ilerlemesi korunur. */
export async function hedefiTasi(
  id: string,
  client: Pick<typeof db, 'goal'> = db,
  today: AppDay = appToday(),
): Promise<void> {
  const hedef = await client.goal.findUnique({ where: { id }, select: { period: true } });
  if (!hedef?.period) throw new GoalRuleError('Yalnızca dönemli hedef taşınabilir.');
  await client.goal.update({
    where: { id },
    data: { periodKey: donemAnahtari(hedef.period as GoalPeriod, today) },
  });
}

/** Dönemi geçmiş hedef Bugün'de görünmez; uzun vadeli her zaman günceldir. SAF. */
export function guncelHedefMi(
  hedef: Pick<GoalDto, 'period' | 'periodKey'>,
  bugun: AppDay,
): boolean {
  return !hedef.period || hedef.periodKey === donemAnahtari(hedef.period, bugun);
}
