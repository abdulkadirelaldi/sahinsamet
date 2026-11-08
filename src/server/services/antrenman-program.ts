import { db } from '@/server/db';
import type { MuscleGroup } from '@/types';

/**
 * ANTRENMAN PROGRAMI DÜZENLEME (2026-11-01). Gün silinmez, arşivlenir: geçmiş
 * antrenmanlar adını kaybetmesin. Çıkarılan hareketin yapılmış setlerine dokunulmaz;
 * süren oturum onları "sonradan eklenen" olarak gösterir.
 */

export interface ProgramGunGirdisi {
  name: string;
  focus: string | null;
  weekday: number | null;
}

export interface ProgramHareketGirdisi {
  sets: number;
  reps: string;
  restSec: number;
}

export interface ProgramGunDuzenDto extends ProgramGunGirdisi {
  id: string;
  hareketler: (ProgramHareketGirdisi & {
    id: string;
    exerciseId: string;
    ad: string;
    kas: MuscleGroup;
  })[];
}

type Client = Pick<typeof db, 'programDay' | 'programExercise'>;

export async function fetchProgramGunDuzen(
  id: string,
  client: Pick<typeof db, 'programDay'> = db,
): Promise<ProgramGunDuzenDto | null> {
  const g = await client.programDay.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      focus: true,
      weekday: true,
      isArchived: true,
      exercises: {
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          exerciseId: true,
          sets: true,
          reps: true,
          restSec: true,
          exercise: { select: { name: true, muscleGroup: true } },
        },
      },
    },
  });
  if (!g || g.isArchived) return null;
  return {
    id: g.id,
    name: g.name,
    focus: g.focus,
    weekday: g.weekday,
    hareketler: g.exercises.map((h) => ({
      id: h.id,
      exerciseId: h.exerciseId,
      sets: h.sets,
      reps: h.reps,
      restSec: h.restSec,
      ad: h.exercise.name,
      kas: h.exercise.muscleGroup as MuscleGroup,
    })),
  };
}

export async function createProgramGun(
  girdi: ProgramGunGirdisi,
  client: Pick<typeof db, 'programDay'> = db,
): Promise<{ id: string }> {
  const son = await client.programDay.findFirst({
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return client.programDay.create({
    data: { ...girdi, order: (son?.order ?? 0) + 10 },
    select: { id: true },
  });
}

export async function updateProgramGun(
  id: string,
  girdi: ProgramGunGirdisi,
  client: Pick<typeof db, 'programDay'> = db,
): Promise<void> {
  await client.programDay.update({ where: { id }, data: girdi });
}

export async function archiveProgramGun(
  id: string,
  client: Pick<typeof db, 'programDay'> = db,
): Promise<void> {
  await client.programDay.update({ where: { id }, data: { isArchived: true } });
}

export async function addProgramHareket(
  dayId: string,
  exerciseId: string,
  girdi: ProgramHareketGirdisi,
  client: Pick<typeof db, 'programExercise'> = db,
): Promise<{ id: string }> {
  const son = await client.programExercise.findFirst({
    where: { dayId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return client.programExercise.create({
    data: { dayId, exerciseId, ...girdi, order: (son?.order ?? 0) + 10 },
    select: { id: true },
  });
}

export async function updateProgramHareket(
  id: string,
  girdi: ProgramHareketGirdisi,
  client: Pick<typeof db, 'programExercise'> = db,
): Promise<void> {
  await client.programExercise.update({ where: { id }, data: girdi });
}

export async function removeProgramHareket(
  id: string,
  client: Pick<typeof db, 'programExercise'> = db,
): Promise<void> {
  await client.programExercise.delete({ where: { id } });
}

/** Komşusuyla yer değiştirir; sıralar eşitse (eski kayıtlar) önce numaralanır. */
export async function moveProgramHareket(
  id: string,
  yon: 'yukari' | 'asagi',
  client: Client = db,
): Promise<void> {
  const satir = await client.programExercise.findUnique({
    where: { id },
    select: { dayId: true },
  });
  if (!satir) return;
  const liste = await client.programExercise.findMany({
    where: { dayId: satir.dayId },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });
  const i = liste.findIndex((h) => h.id === id);
  const j = yon === 'yukari' ? i - 1 : i + 1;
  const a = liste[i];
  const b = liste[j];
  if (!a || !b) return;
  liste[i] = b;
  liste[j] = a;
  for (const [sira, h] of liste.entries()) {
    await client.programExercise.update({ where: { id: h.id }, data: { order: (sira + 1) * 10 } });
  }
}
