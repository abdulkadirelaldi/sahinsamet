/**
 * Zod sözleşmesi — toplu yeniden ihraç (PROGRAM.md §7.3).
 *
 * Frontend TEK yerden tüketir:
 *   import { createProjectSchema, type CreateProjectInput } from '@/lib/schemas';
 *
 * Bu dosyalar Backend mülkiyetindedir. Frontend form doğrulamasında AYNI şemayı
 * kullanır — kural iki yerde yazılmaz, dolayısıyla ayrışamaz.
 *
 * Enum'lar burada DEĞİL `@/types`'tadır (T-010 sözleşmesi) ve şemalar onları
 * tek kaynak olarak kullanır; Zod içinde elle yeniden yazılmaz.
 */

export * from './common';

// Kimlik & sistem
export * from './user';
export * from './login-attempt';
export * from './audit-log';
export * from './attachment';

// Site içeriği
export * from './profile';

// Sağlık & spor
export * from './health-log';
export * from './exercise';
export * from './workout';
export * from './workout-set';
export * from './personal-record';

// Hayat
export * from './habit';
export * from './habit-log';
export * from './goal';
export * from './wallet';
export * from './journal-entry';

// Takvim
export * from './takvim';
