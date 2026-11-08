import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/server/db';
import { appDayToDate } from '@/server/services/_shared';
import { otomatikIsaretle, sporIsaretiniGeriAl } from '@/server/services/habit-gun';

const AD = 'zzit-spor';
const GUN = '2020-03-03';
const temizle = async () => {
  await db.habit.deleteMany({ where: { name: AD } });
  await db.workout.deleteMany({ where: { date: appDayToDate(GUN), note: AD } });
};

beforeEach(temizle);
afterAll(async () => {
  await temizle();
  await db.$disconnect();
});

describe('spor alışkanlığı', () => {
  it('antrenman silinince işaret kalkar; başka biten antrenman varsa kalır', async () => {
    const habit = await db.habit.create({
      data: { name: AD, otoKaynak: 'SPOR' },
      select: { id: true },
    });
    await otomatikIsaretle('SPOR', GUN);
    const sayi = () => db.habitLog.count({ where: { habitId: habit.id } });
    expect(await sayi()).toBe(1);

    const kalan = await db.workout.create({
      data: { date: appDayToDate(GUN), note: AD, finishedAt: new Date() },
    });
    await sporIsaretiniGeriAl(GUN);
    expect(await sayi()).toBe(1);

    await db.workout.delete({ where: { id: kalan.id } });
    await sporIsaretiniGeriAl(GUN);
    expect(await sayi()).toBe(0);
  });
});
