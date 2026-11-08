import { describe, expect, it } from 'vitest';

import { ayinGunu } from '@/components/panel/cuzdan-bicim';

describe('ayinGunu (2026-11-01)', () => {
  it.each([
    [1, "ayın 1'i"],
    [2, "ayın 2'si"],
    [3, "ayın 3'ü"],
    [4, "ayın 4'ü"],
    [5, "ayın 5'i"],
    [6, "ayın 6'sı"],
    [7, "ayın 7'si"],
    [8, "ayın 8'i"],
    [9, "ayın 9'u"],
    [10, "ayın 10'u"],
    [20, "ayın 20'si"],
    [23, "ayın 23'ü"],
    [30, "ayın 30'u"],
    [31, "ayın 31'i"],
  ])('%i', (gun, beklenen) => {
    expect(ayinGunu(gun)).toBe(beklenen);
  });
});
