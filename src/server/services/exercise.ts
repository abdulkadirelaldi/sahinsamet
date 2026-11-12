import type {
  ArchiveExerciseInput,
  CreateExerciseInput,
  ExerciseFilterInput,
  UpdateExerciseInput,
} from '@/lib/schemas';
import { db } from '@/server/db';
import type { Equipment, MuscleGroup } from '@/types';

import { panelSkipTake, toPagedResult } from './_shared';
import type { PagedResult } from './content-dto';

/**
 * `Exercise` servisi — §4.2 "egzersiz kütüphanesi", T-111.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SİLİNMEZ, ARŞİVLENİR — VE BURADA ŞEMA ZORLUYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-017 referans veride `isArchived` istiyor ve `Exercise` tam olarak referans
 * veri. Ama burada gerekçe tercihten DAHA GÜÇLÜ: `WorkoutSet.exerciseId` ve
 * `PersonalRecord.exerciseId` ikisi de `onDelete: Restrict`. Yani bir egzersizi
 * silmeye çalışmak, ona ait tek bir set varsa P2003 veriyor.
 *
 * ⚠️ T-038'in ölçütü burada net cevap veriyor: FK bağımlısı VAR → gerçek silme
 * yok. (`HealthLog`ta tersi ölçülmüştü: bağlı FK yoktu, gerçek silme seçildi.
 * Ölçüt aynı, cevap farklı — kuralı kopyalamıyorum, uyguluyorum.)
 *
 * Arşivlenmiş egzersiz GEÇMİŞİ BOZMAZ: eski setler ve rekorlar yerinde kalır,
 * egzersiz yalnızca yeni set girişinde seçilebilir listelerden düşer. Bu,
 * arşivlemenin burada neden doğru şey olduğunun kendisi — "artık bu hareketi
 * yapmıyorum" ile "bu hareketi hiç yapmadım" farklı iki ifade.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖNBELLEKLENMEZ · `revalidateTag` YOK — T-111'de TARANDI
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Dört modelin hiçbiri public tarafta görünmüyor: `ContentEntity` birleşiminde
 * yok, `cached.ts` hiçbirini okumuyor, `getSiteStats` hiçbirini saymıyor
 * (ADR-029 taraması: `stats.ts` yalnızca `post`, `project`, `skill`,
 * `experience`, `service` sayıyor). Düşürülecek etiket TANIMLI DEĞİL.
 * `fetchX` adlandırması da bundan: önbelleksiz okuma (T-038/T-040/T-052).
 */

export interface ExerciseDto {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Rekor sayısıyla birlikte — kütüphane ekranının "bu hareketin 3 rekoru var"
 * satırı için. Setlerin TAMAMI sayılmıyor: liste ekranı o sayıyı kullanmıyor ve
 * her satır için ikinci bir sayım, kullanılmayan bir maliyet olurdu.
 */
export interface ExerciseWithRecordCountDto extends ExerciseDto {
  recordCount: number;
}

const EXERCISE_SELECT = {
  id: true,
  name: true,
  muscleGroup: true,
  equipment: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
} as const;

const EXERCISE_LIST_SELECT = {
  ...EXERCISE_SELECT,
  _count: { select: { personalRecords: true } },
} as const;

interface ExerciseRow {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ExerciseListRow extends ExerciseRow {
  _count: { personalRecords: number };
}

export interface ExerciseClient {
  exercise: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof EXERCISE_LIST_SELECT;
      orderBy: Array<Record<string, 'asc' | 'desc'>>;
      skip?: number;
      take?: number;
    }): Promise<ExerciseListRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      select: typeof EXERCISE_SELECT;
    }): Promise<ExerciseRow | null>;
    findFirst(args: {
      where: { name: { equals: string; mode: 'insensitive' } };
      select: typeof EXERCISE_SELECT;
    }): Promise<ExerciseRow | null>;
    create(args: {
      data: { name: string; muscleGroup: MuscleGroup; equipment: Equipment };
      select: typeof EXERCISE_SELECT;
    }): Promise<ExerciseRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof EXERCISE_SELECT;
    }): Promise<ExerciseRow>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR (T-110'un kalıbı). */
const _uyumKontrolu: ExerciseClient = db;
void _uyumKontrolu;

function toDto(row: ExerciseRow): ExerciseDto {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscleGroup as MuscleGroup,
    equipment: row.equipment as Equipment,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toListDto(row: ExerciseListRow): ExerciseWithRecordCountDto {
  return { ...toDto(row), recordCount: row._count.personalRecords };
}

/* ===========================================================================
 * OKUMA
 * ======================================================================== */

/**
 * Filtreyi `where`e çevirir — SAF.
 *
 * ⚠️ `isArchived` VARSAYILANI YOK ve bu bilinçli: `booleanFilterSchema`
 * (ADR-033) üç durum taşıyor — `true`, `false`, verilmedi. "Verilmedi"
 * TÜMÜ demek. Buraya sessiz bir `isArchived: false` varsayılanı koymak,
 * arşiv ekranının hiç çalışmaması demekti; çağıran ne istediğini SÖYLÜYOR.
 */
export function buildExerciseWhere(filter: ExerciseFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.muscleGroup) where.muscleGroup = filter.muscleGroup;
  if (filter.equipment) where.equipment = filter.equipment;
  if (filter.isArchived !== undefined) where.isArchived = filter.isArchived;
  if (filter.q) where.name = { contains: filter.q, mode: 'insensitive' };

  return where;
}

/**
 * Egzersiz kütüphanesi — sayfalı.
 *
 * SIRA: kas grubu, sonra ad. Kütüphane ekranı bir SEÇİM listesi, bir akış
 * değil; "en son eklenen" burada işe yaramaz, "göğüs hareketleri nerede"
 * işe yarar. İkincil anahtar `name` ve `name @unique`, yani sıra BELİRLİ
 * (aynı kas grubunda iki özdeş ad olamaz).
 */
export async function fetchExercises(
  filter: ExerciseFilterInput,
  client: ExerciseClient = db,
): Promise<PagedResult<ExerciseWithRecordCountDto>> {
  const where = buildExerciseWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.exercise.findMany({
      where,
      select: EXERCISE_LIST_SELECT,
      orderBy: [{ muscleGroup: 'asc' }, { name: 'asc' }],
      skip,
      take,
    }),
    client.exercise.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toListDto);
}

export async function fetchExerciseById(
  id: string,
  client: ExerciseClient = db,
): Promise<ExerciseDto | null> {
  const row = await client.exercise.findUnique({ where: { id }, select: EXERCISE_SELECT });
  return row ? toDto(row) : null;
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

/**
 * AYNI ADLI HAREKET — büyük/küçük harf duyarsız (2026-11-12).
 *
 * `name @unique` veritabanında harfe DUYARLI: "bench press" ile "Bench Press" ikisi de
 * yazılabiliyordu ve rekorlar ikiye bölünüyordu. Daha kötüsü, ARŞİVDEKİ bir hareketle aynı adı
 * girmek "zaten var" diyordu ama hareket listede görünmüyordu — sahibi hareketi ne bulabiliyor
 * ne ekleyebiliyordu. Artık çakışan kayıt ÇAĞIRANA veriliyor: arşivdeyse geri alınabilir.
 */
export class EgzersizCakismasi extends Error {
  constructor(readonly mevcut: ExerciseDto) {
    super(`exercise: ad çakışması (${mevcut.isArchived ? 'arşivde' : 'aktif'})`);
    this.name = 'EgzersizCakismasi';
  }
}

/**
 * Ad karşılaştırma anahtarı — SAF. Türkçe büyük/küçük harf: "İ"/"I"/"ı"/"i" aynı sayılır
 * (klavyeden "Incline" de "incline" de "İncline" de yazılabiliyor), fazla boşluk tekleşir.
 * Veritabanının `mode: 'insensitive'`ı bunu yapamıyor: `lower('I')` Türkçe değil.
 */
export function egzersizAdAnahtari(ad: string): string {
  return ad
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr')
    .replace(/\u0307/g, '')
    .replace(/ı/g, 'i');
}

export async function findExerciseByName(
  name: string,
  client: ExerciseClient = db,
): Promise<ExerciseDto | null> {
  // Hızlı yol: birebir (harf duyarsız) eşleşme.
  const row = await client.exercise.findFirst({
    where: { name: { equals: name.trim(), mode: 'insensitive' } },
    select: EXERCISE_SELECT,
  });
  if (row) return toDto(row);
  // Türkçe harf farkı: kütüphane küçük (yüzlerce satır), bellekte karşılaştırılır.
  const anahtar = egzersizAdAnahtari(name);
  const hepsi = await client.exercise.findMany({
    where: {},
    select: EXERCISE_LIST_SELECT,
    orderBy: [{ name: 'asc' }],
  });
  const bulunan = hepsi.find((e) => egzersizAdAnahtari(e.name) === anahtar);
  return bulunan ? toDto(bulunan) : null;
}

/**
 * Egzersiz ekler.
 *
 * `name @unique` — aynı hareketi iki kez eklemek P2002 veriyor ve eylem bunu
 * CONFLICT'e çeviriyor. ⚠️ Tekillik İSTENEN bir şey: "Bench Press" iki kez
 * varsa rekorlar ikiye bölünür ve ikisi de yanlış olur (`@@unique([exerciseId,
 * reps])` egzersiz BAŞINA, yani çiftlenen egzersiz rekoru da çiftler).
 */
export async function createExercise(
  input: CreateExerciseInput,
  client: ExerciseClient = db,
): Promise<ExerciseDto> {
  const mevcut = await findExerciseByName(input.name, client);
  if (mevcut) throw new EgzersizCakismasi(mevcut);

  const row = await client.exercise.create({
    data: {
      name: input.name,
      muscleGroup: input.muscleGroup,
      equipment: input.equipment,
    },
    select: EXERCISE_SELECT,
  });

  return toDto(row);
}

/** Günceller — KISMİ (`undefined` ≠ "temizle"). Yeni ad BAŞKA bir hareketinkiyse çakışma. */
export async function updateExercise(
  input: UpdateExerciseInput,
  client: ExerciseClient = db,
): Promise<ExerciseDto> {
  const { id, ...fields } = input;
  if (fields.name !== undefined) {
    const mevcut = await findExerciseByName(fields.name, client);
    if (mevcut && mevcut.id !== id) throw new EgzersizCakismasi(mevcut);
  }

  const row = await client.exercise.update({
    where: { id },
    data: {
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.muscleGroup !== undefined ? { muscleGroup: fields.muscleGroup } : {}),
      ...(fields.equipment !== undefined ? { equipment: fields.equipment } : {}),
    },
    select: EXERCISE_SELECT,
  });

  return toDto(row);
}

/**
 * Arşivler veya arşivden çıkarır — SİLMEZ (gerekçe dosya başında).
 *
 * ⚠️ REKORLARA DOKUNULMUYOR ve bu bilinçli. Arşivlemek "bu hareketi artık
 * yapmıyorum" demek; rekorları silmek "bu hareketi hiç yapmadım" demek olurdu.
 * Üstelik `PersonalRecord.exerciseId` de `Restrict`, yani veritabanı da aynı
 * şeyi söylüyor. Arşivi geri açan kullanıcı rekorlarını YERİNDE bulur.
 */
export async function archiveExercise(
  input: ArchiveExerciseInput,
  client: ExerciseClient = db,
): Promise<ExerciseDto> {
  const row = await client.exercise.update({
    where: { id: input.id },
    data: { isArchived: input.isArchived },
    select: EXERCISE_SELECT,
  });

  return toDto(row);
}

/**
 * SEÇİCİDEN HIZLI EKLEME (2026-11-12) — program günü, canlı antrenman ve set formundaki
 * "listede yok mu? yeni hareket" yolu. Ad zaten varsa YENİSİ AÇILMAZ:
 *   - aktif → o hareket seçilir (`mevcut`),
 *   - arşivde → arşivden çıkarılır ve seçilir (`arsivden`) — kullanıcı onu yapmak istiyor.
 */
export async function hizliEgzersizEkle(
  input: CreateExerciseInput,
  client: ExerciseClient = db,
): Promise<{ egzersiz: ExerciseDto; durum: 'yeni' | 'mevcut' | 'arsivden' }> {
  const mevcut = await findExerciseByName(input.name, client);
  if (mevcut && !mevcut.isArchived) return { egzersiz: mevcut, durum: 'mevcut' };
  if (mevcut) {
    const egzersiz = await archiveExercise({ id: mevcut.id, isArchived: false }, client);
    return { egzersiz, durum: 'arsivden' };
  }
  return { egzersiz: await createExercise(input, client), durum: 'yeni' };
}
