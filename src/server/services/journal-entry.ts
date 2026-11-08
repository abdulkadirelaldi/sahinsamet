import type {
  CreateJournalEntryInput,
  JournalEntryFilterInput,
  UpdateJournalEntryInput,
} from '@/lib/schemas';
import { db } from '@/server/db';

import { appDayToDate, dateToAppDay, panelSkipTake, toPagedResult } from './_shared';
import type { PagedResult } from './content-dto';

/**
 * `JournalEntry` servisi — §4.2 `/panel/hayat` "günlük", ADR-016, ADR-020, T-112.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GÜNDE BİRDEN ÇOK KAYIT — `HealthLog`UN TERSİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `JournalEntry.date` `@unique` DEĞİL. Bir günlük, gün içinde birden çok kez
 * yazılabilir (sabah notu, akşam değerlendirmesi). İki sonucu var:
 *   - günde tek kayıt kontrolü YOK (`createHealthLog`daki CONFLICT burada yok);
 *   - sıralamada İKİNCİL ANAHTAR ZORUNLU (`createdAt`, sonra `id`) — `Workout`ta
 *     ölçülen sınıf: aynı güne düşen iki kaydın sırası belirsiz kalırsa
 *     sayfalama satır tekrarlar.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LİSTE ÖZET TAŞIR, METNİN TAMAMINI DEĞİL
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `content` 100.000 karaktere kadar (`longTextSchema`). Liste sayfası 20
 * kaydı tam metinle taşısaydı, ekranın kullanmadığı megabaytlar Server →
 * Client sınırından geçerdi. Liste `excerpt` taşır; tam metin yalnızca
 * `fetchJournalEntryById`de.
 *
 * ⚠️ Özet SUNUCUDA kesiliyor ama veritabanı yine tam metni okuyor — Prisma
 * `substring` seçemez. Kazanç ağ/serileştirme tarafında, sorgu tarafında değil.
 *
 * GERÇEK SİLME — bağlı FK yok (T-038 ölçütü). ÖNBELLEKLENMEZ — F5 modelleri
 * public tarafta yok.
 */

/** Liste özetinin uzunluğu (karakter). */
export const JOURNAL_EXCERPT_LENGTH = 240;

export interface JournalEntryDto {
  id: string;
  /** Gün (`YYYY-MM-DD`) — `@db.Date`. */
  date: string;
  title: string | null;
  content: string;
  /** 1–5 ölçek (ADR-020). */
  mood: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type JournalEntryListItemDto = Omit<JournalEntryDto, 'content'> & {
  excerpt: string;
  /** Özet metnin tamamı değilse `true` — ekran "devamı" bağlantısı gösterir. */
  truncated: boolean;
};

const JOURNAL_SELECT = {
  id: true,
  date: true,
  title: true,
  content: true,
  mood: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
} as const;

interface JournalRow {
  id: string;
  date: Date;
  title: string | null;
  content: string;
  mood: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntryClient {
  journalEntry: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof JOURNAL_SELECT;
      orderBy: Array<Record<string, 'asc' | 'desc'>>;
      skip?: number;
      take?: number;
    }): Promise<JournalRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      select: typeof JOURNAL_SELECT;
    }): Promise<JournalRow | null>;
    create(args: {
      data: {
        date: Date;
        title: string | null;
        content: string;
        mood: number | null;
        tags: string[];
      };
      select: typeof JOURNAL_SELECT;
    }): Promise<JournalRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof JOURNAL_SELECT;
    }): Promise<JournalRow>;
    delete(args: { where: { id: string } }): Promise<JournalRow>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR (T-110'un kalıbı). */
const _uyumKontrolu: JournalEntryClient = db;
void _uyumKontrolu;

function toDto(row: JournalRow): JournalEntryDto {
  return {
    id: row.id,
    date: dateToAppDay(row.date),
    title: row.title,
    content: row.content,
    mood: row.mood,
    tags: row.tags,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Özet — SAF. Boşlukları tek boşluğa indirir ve KELİME sınırında keser.
 *
 * ⚠️ Kesim `Array.from` ile KOD NOKTASI üzerinden: `slice` UTF-16 birimi
 * sayar ve bir emojiyi ortasından bölüp ekrana bozuk karakter basabilirdi.
 */
export function journalExcerpt(
  content: string,
  length: number = JOURNAL_EXCERPT_LENGTH,
): { excerpt: string; truncated: boolean } {
  const flat = content.replace(/\s+/g, ' ').trim();
  const chars = Array.from(flat);

  if (chars.length <= length) return { excerpt: flat, truncated: false };

  const cut = chars.slice(0, length).join('');
  const lastSpace = cut.lastIndexOf(' ');
  // Tek dev kelimede boşluk yoksa sert kesim; yoksa kelime sınırı.
  const base = lastSpace > length * 0.6 ? cut.slice(0, lastSpace) : cut;

  return { excerpt: `${base.trimEnd()}…`, truncated: true };
}

function toListDto(row: JournalRow): JournalEntryListItemDto {
  const { content, ...rest } = toDto(row);
  return { ...rest, ...journalExcerpt(content) };
}

/* ===========================================================================
 * OKUMA
 * ======================================================================== */

/**
 * Filtreyi `where`e çevirir — SAF.
 *
 * `date` bir `@db.Date` → `appDayToDate` (T-102 kuralı: yardımcıyı sütunun
 * tipi belirler). Arama başlık VE içerikte; günlükte aranan şey çoğu zaman
 * metnin içindedir.
 */
export function buildJournalEntryWhere(filter: JournalEntryFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.from || filter.to) {
    where.date = {
      ...(filter.from ? { gte: appDayToDate(filter.from) } : {}),
      ...(filter.to ? { lte: appDayToDate(filter.to) } : {}),
    };
  }
  if (filter.tag) where.tags = { has: filter.tag };
  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q, mode: 'insensitive' } },
      { content: { contains: filter.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

/** Günlük listesi — EN YENİ GÜN ÖNCE, aynı günde en yeni yazılan önce. */
export async function fetchJournalEntries(
  filter: JournalEntryFilterInput,
  client: JournalEntryClient = db,
): Promise<PagedResult<JournalEntryListItemDto>> {
  const where = buildJournalEntryWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.journalEntry.findMany({
      where,
      select: JOURNAL_SELECT,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    }),
    client.journalEntry.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toListDto);
}

export async function fetchJournalEntryById(
  id: string,
  client: JournalEntryClient = db,
): Promise<JournalEntryDto | null> {
  const row = await client.journalEntry.findUnique({ where: { id }, select: JOURNAL_SELECT });
  return row ? toDto(row) : null;
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

function bosaNull(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

export async function createJournalEntry(
  input: CreateJournalEntryInput,
  client: JournalEntryClient = db,
): Promise<JournalEntryDto> {
  const row = await client.journalEntry.create({
    data: {
      date: appDayToDate(input.date),
      title: bosaNull(input.title),
      content: input.content,
      mood: input.mood ?? null,
      tags: input.tags,
    },
    select: JOURNAL_SELECT,
  });

  return toDto(row);
}

/** Günceller — KISMİ (`undefined` ≠ "temizle"). */
export async function updateJournalEntry(
  input: UpdateJournalEntryInput,
  client: JournalEntryClient = db,
): Promise<JournalEntryDto> {
  const { id, ...fields } = input;

  const row = await client.journalEntry.update({
    where: { id },
    data: {
      ...(fields.date !== undefined ? { date: appDayToDate(fields.date) } : {}),
      ...(fields.title !== undefined ? { title: bosaNull(fields.title) } : {}),
      ...(fields.content !== undefined ? { content: fields.content } : {}),
      ...(fields.mood !== undefined ? { mood: fields.mood } : {}),
      ...(fields.tags !== undefined ? { tags: fields.tags } : {}),
    },
    select: JOURNAL_SELECT,
  });

  return toDto(row);
}

/** GERÇEK silme — bağlı FK yok. */
export async function deleteJournalEntry(
  id: string,
  client: JournalEntryClient = db,
): Promise<JournalEntryDto> {
  const row = await client.journalEntry.delete({ where: { id } });
  return toDto(row);
}
