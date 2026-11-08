import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/server/db';
import { sayaciBaslat, sayaciDurdur } from '@/server/services/habit-log';

const AD = 'zzit-sayac';
const temizle = () => db.habit.deleteMany({ where: { name: AD } });
const ac = (sayacBaslangic: Date | null = null) =>
  db.habit.create({
    data: { name: AD, sureli: true, targetPerDay: 30, sayacBaslangic },
    select: { id: true },
  });

beforeEach(temizle);
afterAll(async () => {
  await temizle();
  await db.$disconnect();
});

describe('süre sayacı', () => {
  it('aynı anda iki durdurma süreyi bir kez ekler', async () => {
    const simdi = new Date('2026-11-02T12:00:00Z');
    const habit = await ac(new Date(simdi.getTime() - 20 * 60_000));
    const sonuclar = await Promise.all([
      sayaciDurdur({ habitId: habit.id }, simdi),
      sayaciDurdur({ habitId: habit.id }, simdi),
    ]);
    expect(sonuclar.filter((s) => s.durum === 'KAYDEDILDI')).toHaveLength(1);
    const log = await db.habitLog.findFirstOrThrow({ where: { habitId: habit.id } });
    expect(log.count).toBe(20);
  });

  it('aynı anda iki başlatma tek başlangıç bırakır', async () => {
    const habit = await ac();
    const [a, b] = await Promise.all([
      sayaciBaslat(habit.id, new Date('2026-11-02T12:00:00Z')),
      sayaciBaslat(habit.id, new Date('2026-11-02T12:00:05Z')),
    ]);
    expect(a).toBe(b);
  });
});
