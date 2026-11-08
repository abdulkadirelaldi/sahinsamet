import type { AttachmentRefDto } from '../content-dto';

/**
 * Eklenti (Attachment) sorgu yardımcıları — ADR-018.
 */

/** Prisma'dan okunan `Attachment` satırının DTO karşılığı — `url` YOK (ADR-018). */
export interface AttachmentRow {
  id: string;
  key: string;
  mime: string;
  width: number | null;
  height: number | null;
}

export function toAttachmentRef(row: AttachmentRow | null | undefined): AttachmentRefDto | null {
  if (!row) return null;
  return { id: row.id, key: row.key, mime: row.mime, width: row.width, height: row.height };
}

/** Prisma `select` bloğu — her yerde aynı alanlar okunsun diye tek yerde. */
export const ATTACHMENT_SELECT = {
  id: true,
  key: true,
  mime: true,
  width: true,
  height: true,
} as const;
