import * as z from 'zod';

import {
  cuidSchema,
  dayDateSchema,
  longTextSchema,
  moodSchema,
  paginationSchema,
  partialWithoutDefaults,
  searchSchema,
  shortTextSchema,
  tagsSchema,
} from './common';

/** `JournalEntry` — günlük (§4.2 /panel/hayat). `mood` 1–5 ölçek (ADR-020). */
const journalEntryBase = z.object({
  date: dayDateSchema,
  title: shortTextSchema.optional(),
  content: longTextSchema.min(1, { error: 'Günlük içeriği boş olamaz.' }),
  mood: moodSchema.optional(),
  tags: tagsSchema,
});

export const createJournalEntrySchema = journalEntryBase;
/*
 * TEMİZLENEBİLİR ALANLAR — `null` = "boşalt", `undefined` = "dokunma" (T-031
 * kuralı). `partialWithoutDefaults` alanı yalnızca VERİLMEYEBİLİR yapıyordu;
 * veritabanında boş olabilen bir sütunu temizlemenin yolu YOKTU ve dolu bir
 * alanı formda boşaltmak eski değeri sessizce koruyordu (F5 formları bunu
 * ekranda uyarı olarak yazıyordu). Kural taban şemadan türetiliyor — tek yer.
 */
export const updateJournalEntrySchema = partialWithoutDefaults(journalEntryBase).extend({
  id: cuidSchema,
  title: journalEntryBase.shape.title.nullable(),
  mood: journalEntryBase.shape.mood.nullable(),
});

export const journalEntryFilterSchema = paginationSchema.extend({
  from: dayDateSchema.optional(),
  to: dayDateSchema.optional(),
  tag: z.string().trim().max(32).optional(),
  q: searchSchema.optional(),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
export type JournalEntryFilterInput = z.infer<typeof journalEntryFilterSchema>;
