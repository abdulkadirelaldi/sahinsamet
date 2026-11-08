import { describe, expect, it, vi } from 'vitest';

import {
  addProgramHareket,
  createProgramGun,
  fetchProgramGunDuzen,
  moveProgramHareket,
} from '@/server/services/antrenman-program';

describe('antrenman programı (2026-11-01)', () => {
  it('⚠️ arşivli gün düzenlenemez', async () => {
    const client = {
      programDay: { findUnique: vi.fn().mockResolvedValue({ isArchived: true, exercises: [] }) },
    } as never;
    expect(await fetchProgramGunDuzen('g', client)).toBeNull();
  });

  it('yeni gün ve hareket sona eklenir', async () => {
    const gun = {
      findFirst: vi.fn().mockResolvedValue({ order: 40 }),
      create: vi.fn().mockResolvedValue({ id: 'g' }),
    };
    await createProgramGun({ name: 'A', focus: null, weekday: 1 }, { programDay: gun } as never);
    expect(gun.create.mock.calls[0]?.[0].data.order).toBe(50);

    const hareket = {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'h' }),
    };
    await addProgramHareket('g', 'e', { sets: 3, reps: '8-12', restSec: 90 }, {
      programExercise: hareket,
    } as never);
    expect(hareket.create.mock.calls[0]?.[0].data).toMatchObject({ order: 10, dayId: 'g' });
  });

  describe('moveProgramHareket', () => {
    const kurulum = () => {
      const update = vi.fn();
      return {
        update,
        client: {
          programExercise: {
            findUnique: vi.fn().mockResolvedValue({ dayId: 'g' }),
            findMany: vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
            update,
          },
        } as never,
      };
    };
    const sira = (update: ReturnType<typeof vi.fn>) =>
      update.mock.calls.map((c) => [c[0].where.id, c[0].data.order]);

    it('komşusuyla yer değiştirir ve yeniden numaralar', async () => {
      const { client, update } = kurulum();
      await moveProgramHareket('b', 'yukari', client);
      expect(sira(update)).toEqual([
        ['b', 10],
        ['a', 20],
        ['c', 30],
      ]);
    });

    it('⚠️ uçtaki hareket taşınmaz', async () => {
      const { client, update } = kurulum();
      await moveProgramHareket('a', 'yukari', client);
      await moveProgramHareket('c', 'asagi', client);
      expect(update).not.toHaveBeenCalled();
    });
  });
});
