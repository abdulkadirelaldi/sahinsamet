import { describe, expect, it, vi } from 'vitest';

import type { HealthLogDto } from '@/server/services/health-log';
import {
  aiIstemcisi,
  kayitTablosu,
  saglikDegerlendirmesi,
  SaglikAiHatasi,
  tartiGorseliniOku,
  tartiOnerisi,
  type AiClient,
} from '@/server/services/saglik-ai';

const BOS = {
  tarih: null,
  weightKg: null,
  bodyFatPct: null,
  bmi: null,
  waterPct: null,
  muscleKg: null,
  boneKg: null,
  proteinPct: null,
  visceralFat: null,
  subcutaneousFatPct: null,
  skeletalMusclePct: null,
  bmrKcal: null,
  metabolicAge: null,
};

/** Sahibinin örnek tartı ekranındaki değerler. */
const OKUMA = {
  ...BOS,
  tarih: '2026-10-28',
  weightKg: 87.5,
  bmi: 27.6,
  bodyFatPct: 26.8,
  waterPct: 52,
  visceralFat: 13.5,
  bmrKcal: 1870,
};

const sahte = (yanit: { stop_reason: string; parsed_output: unknown }) => {
  const parse = vi.fn().mockResolvedValue(yanit);
  return { client: { beta: { messages: { parse } } } as unknown as AiClient, parse };
};

describe('tartiOnerisi — model okuması → form', () => {
  it('örnek ekran: ondalıklar metin, tam sayılar sayı, boşlar YOK', () => {
    expect(tartiOnerisi(OKUMA)).toEqual({
      tarih: '2026-10-28',
      weightKg: '87.5',
      bmi: '27.6',
      bodyFatPct: '26.8',
      waterPct: '52',
      visceralFat: '13.5',
      bmrKcal: 1870,
    });
  });

  it('⚠️ aralık dışı / bozuk değer DÜŞER — uydurma sayı forma girmez', () => {
    const o = tartiOnerisi({
      ...BOS,
      tarih: '28.10.2026',
      weightKg: 12345,
      bodyFatPct: -3,
      bmrKcal: 99,
      metabolicAge: 31.4,
    });
    expect(o).toEqual({ tarih: null, metabolicAge: 31 });
  });

  it('fazla ondalık sütun ölçeğine yuvarlanır', () => {
    expect(tartiOnerisi({ ...BOS, boneKg: 3.256, bmi: 27.64 })).toMatchObject({
      boneKg: '3.26',
      bmi: '27.6',
    });
  });
});

describe('tartiGorseliniOku', () => {
  const gorsel = { data: 'AAAA', mediaType: 'image/jpeg' as const };

  it('anahtar yoksa hiçbir şey göndermez', async () => {
    expect(aiIstemcisi({})).toBeNull();
    await expect(tartiGorseliniOku(gorsel, null)).rejects.toMatchObject({ kod: 'ANAHTAR_YOK' });
  });

  it('görseli base64 olarak, yapılandırılmış çıktı ve yedek modelle gönderir', async () => {
    const { client, parse } = sahte({ stop_reason: 'end_turn', parsed_output: OKUMA });
    expect(await tartiGorseliniOku(gorsel, client)).toMatchObject({ weightKg: '87.5' });
    const istek = parse.mock.calls[0]?.[0];
    expect(istek).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default' });
    expect(istek.messages[0].content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' },
    });
  });

  it('ret ve boş okuma anlaşılır hata', async () => {
    await expect(
      tartiGorseliniOku(gorsel, sahte({ stop_reason: 'refusal', parsed_output: null }).client),
    ).rejects.toMatchObject({ kod: 'REDDEDILDI' });
    await expect(
      tartiGorseliniOku(gorsel, sahte({ stop_reason: 'end_turn', parsed_output: BOS }).client),
    ).rejects.toBeInstanceOf(SaglikAiHatasi);
  });
});

describe('saglikDegerlendirmesi', () => {
  const kayit = {
    id: 'a',
    date: '2026-10-28',
    weightKg: '87.50',
    bodyFatPct: '26.8',
    sleepHours: null,
    waterMl: null,
    restingHr: null,
    steps: 8000,
    mood: null,
    note: 'özel not',
    bmi: '27.6',
    waterPct: '52.0',
    muscleKg: null,
    boneKg: null,
    proteinPct: null,
    visceralFat: '13.5',
    subcutaneousFatPct: null,
    skeletalMusclePct: null,
    bmrKcal: 1870,
    metabolicAge: null,
    createdAt: '',
    updatedAt: '',
  } satisfies HealthLogDto;

  it('⚠️ tablo ölçümleri taşır, serbest NOT GÖNDERİLMEZ', () => {
    const t = kayitTablosu([kayit]);
    expect(t).toContain('2026-10-28 | 87.50 | 26.8 | 13.5');
    expect(t).not.toContain('özel not');
  });

  it('kayıt yoksa istek atılmaz', async () => {
    const { client, parse } = sahte({ stop_reason: 'end_turn', parsed_output: null });
    await expect(saglikDegerlendirmesi([], client)).rejects.toMatchObject({ kod: 'OKUNAMADI' });
    expect(parse).not.toHaveBeenCalled();
  });

  it('yapılandırılmış yorumu döner', async () => {
    const yorum = {
      ozet: 'İyi gidiyorsun.',
      iyiGidenler: [],
      dikkat: ['İç yağ yüksek.'],
      oneriler: ['Günde 8 bin adım.'],
      gunlukSuLitre: 3.5,
      doktoraDanis: null,
    };
    const { client } = sahte({ stop_reason: 'end_turn', parsed_output: yorum });
    expect(await saglikDegerlendirmesi([kayit], client)).toEqual(yorum);
  });
});
