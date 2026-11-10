/**
 * Ajanlar arası paylaşılan tipler (§4.3, §10.1 — Backend mülkiyetinde).
 *
 * İçerik: §7.2 yanıt zarfı + §6 enum sözleşmesi (§7.3).
 */

/* ---------------------------------------------------------------------------
 * §6 / §7.3 — ENUM SÖZLEŞMESİ
 *
 * Frontend enum'ları BURADAN alır, `@/server/generated/**` içine ASLA uzanmaz.
 * Yeniden ihraç edilen modül (`prisma/enums`) hiçbir şey import etmeyen, saf
 * sabit nesnelerden oluşan bir yaprak dosyadır — istemci paketine Prisma
 * çalışma zamanı sızmaz.
 *
 * Her enum hem DEĞER hem TİP olarak dışa aktarılır:
 *   import { GoalStatus } from '@/types';
 *   GoalStatus.ACTIVE                         // değer
 *   const s: GoalStatus = GoalStatus.ACTIVE;  // tip
 *   Object.values(GoalStatus)                 // select seçenekleri
 * ------------------------------------------------------------------------- */

export {
  AttachmentEntity,
  AuditAction,
  Equipment,
  GoalCategory,
  GoalPeriod,
  GoalStatus,
  MuscleGroup,
  TakvimKategori,
  TakvimTekrar,
  WalletAccountKind,
  WalletFlowKind,
  WalletFrequency,
  WalletUnit,
  WorkoutType,
} from '@/server/generated/prisma/enums';

/** §7.2 — route handler hata kodları. */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

/** §7.2 — başarılı yanıt zarfı. */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** §7.2 — hatalı yanıt zarfı. `fields` alan bazlı doğrulama hataları içindir. */
export interface ApiFailure {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
