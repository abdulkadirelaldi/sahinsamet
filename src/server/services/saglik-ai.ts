import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod';

import { createHealthLogSchema } from '@/lib/schemas/health-log';

import type { HealthLogDto } from './health-log';

/**
 * SAĞLIK · YAPAY ZEKÂ (2026-10-30) — Claude API.
 *
 * İKİ İŞ:
 *   1. `tartiGorseliniOku` — akıllı tartı uygulamasının ekran görüntüsünden
 *      ölçümleri okur. Sonuç KAYDEDİLMEZ: formu doldurur, kullanıcı bakıp onaylar.
 *   2. `saglikDegerlendirmesi` — son kayıtlara hekim + diyetisyen gözüyle yorum.
 *
 * GİZLİLİK: görsel tarayıcıda küçültülüp (≤1568 px, JPEG) yalnızca bu istekte
 * gönderilir; sunucuda ya da depolamada SAKLANMAZ. Gönderim denetim kaydına
 * `EXPORT` olarak yazılır (eylem katmanı), değerler yazılmaz.
 *
 * ANAHTAR: `ANTHROPIC_API_KEY` sunucu ortamında. Yoksa özellik kapalı ve ekran
 * bunu söyler — form elle doldurulmaya devam eder.
 *
 * GÜVENLİK AĞI: model çıktısı ŞEMAYA bağlı (structured outputs) ve her değer
 * yine kayıt şemasından (`createHealthLogSchema`) geçer; aralık dışı ya da
 * fazla basamaklı bir okuma SESSİZCE DÜŞER, uydurulmuş bir sayı forma girmez.
 */

export const SAGLIK_MODELI = 'claude-opus-5-5';

export class SaglikAiHatasi extends Error {
  constructor(
    readonly kod: 'ANAHTAR_YOK' | 'OKUNAMADI' | 'REDDEDILDI',
    message: string,
  ) {
    super(message);
    this.name = 'SaglikAiHatasi';
  }
}

export type AiClient = Pick<Anthropic, 'beta'>;

/** Anahtar yoksa `null` — çağıran "özellik kapalı" der. */
export function aiIstemcisi(
  env: Record<string, string | undefined> = process.env,
): AiClient | null {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  return apiKey ? new Anthropic({ apiKey }) : null;
}

const ORTAK = {
  model: SAGLIK_MODELI,
  max_tokens: 16000,
  // Ret hâlinde aynı istek uygun modelde yeniden koşar (sunucu tarafı).
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
} as const;

/* ===========================================================================
 * 1. TARTI EKRANI
 * ======================================================================== */

const sayiYaDaYok = z.number().nullable();

const TartiOkumasi = z.object({
  tarih: z.string().nullable().describe('Ölçüm günü YYYY-MM-DD; ekranda yoksa null'),
  weightKg: sayiYaDaYok.describe('Kilo, kg'),
  bodyFatPct: sayiYaDaYok.describe('Vücut yağ oranı, %'),
  bmi: sayiYaDaYok.describe('Vücut kitle indeksi'),
  waterPct: sayiYaDaYok.describe('Vücut suyu, %'),
  muscleKg: sayiYaDaYok.describe('Kas kütlesi, kg'),
  boneKg: sayiYaDaYok.describe('Kemik kütlesi, kg'),
  proteinPct: sayiYaDaYok.describe('Protein, %'),
  visceralFat: sayiYaDaYok.describe('İç (viseral) yağ seviyesi'),
  subcutaneousFatPct: sayiYaDaYok.describe('Deri altı yağ, %'),
  skeletalMusclePct: sayiYaDaYok.describe('İskelet kası oranı, %'),
  bmrKcal: sayiYaDaYok.describe('Bazal metabolizma, kcal'),
  metabolicAge: sayiYaDaYok.describe('Metabolik / vücut yaşı'),
});

const TARTI_ISTEMI = `Bu bir akıllı tartı uygulamasının ekran görüntüsü. Ekranda YAZAN ölçümleri oku.
- Yalnızca ekranda açıkça görünen değerleri yaz; görünmeyen, kesilmiş ya da emin olmadığın alan null.
- Tahmin etme, hesaplama yapma (ör. BMI ekranda yoksa kilodan türetme).
- Ondalık ayıracı virgül olabilir: "26,8" → 26.8.
- Kas kütlesi kg olarak yazıyorsa muscleKg; yalnızca yüzde varsa skeletalMusclePct.
- Tarih ekranda görünüyorsa YYYY-MM-DD; yıl yoksa null.`;

/** Formun beklediği biçim: ondalıklar metin ("87.5"), tam sayılar sayı. */
type OndalikAlan =
  | 'weightKg'
  | 'bodyFatPct'
  | 'bmi'
  | 'waterPct'
  | 'muscleKg'
  | 'boneKg'
  | 'proteinPct'
  | 'visceralFat'
  | 'subcutaneousFatPct'
  | 'skeletalMusclePct';
export type TartiOnerisi = { tarih: string | null } & Partial<Record<OndalikAlan, string>> &
  Partial<Record<'bmrKcal' | 'metabolicAge', number>>;

/** Sütun ölçeği (schema.prisma) — fazla basamak şemada düşer. */
const OLCEK: Record<OndalikAlan, number> = {
  weightKg: 2,
  bodyFatPct: 1,
  bmi: 1,
  waterPct: 1,
  muscleKg: 2,
  boneKg: 2,
  proteinPct: 1,
  visceralFat: 1,
  subcutaneousFatPct: 1,
  skeletalMusclePct: 1,
};

/**
 * Model okumasını forma uygun öneriye çevirir. SAF.
 * Her değer kayıt şemasından geçer; geçmeyen DÜŞER (uydurma değer forma girmez).
 */
export function tartiOnerisi(okuma: z.infer<typeof TartiOkumasi>): TartiOnerisi {
  const shape = createHealthLogSchema.shape;
  const sonuc: Record<string, string | number | null> = {
    tarih: okuma.tarih && shape.date.safeParse(okuma.tarih).success ? okuma.tarih : null,
  };

  for (const [alan, olcek] of Object.entries(OLCEK) as [OndalikAlan, number][]) {
    const deger = okuma[alan];
    if (deger === null || !Number.isFinite(deger) || deger < 0) continue;
    const metin = deger.toFixed(olcek).replace(/\.?0+$/, '');
    if (shape[alan].safeParse(metin).success) sonuc[alan] = metin;
  }
  for (const alan of ['bmrKcal', 'metabolicAge'] as const) {
    const deger = okuma[alan];
    if (deger === null) continue;
    const tam = Math.round(deger);
    if (shape[alan].safeParse(tam).success) sonuc[alan] = tam;
  }
  return sonuc as TartiOnerisi;
}

function retKontrolu(stop: string | null): void {
  if (stop === 'refusal') {
    throw new SaglikAiHatasi(
      'REDDEDILDI',
      'Görsel işlenemedi. Lütfen yalnızca tartı ekranını yükle.',
    );
  }
}

export async function tartiGorseliniOku(
  gorsel: { data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' },
  client: AiClient | null = aiIstemcisi(),
): Promise<TartiOnerisi> {
  if (!client) throw new SaglikAiHatasi('ANAHTAR_YOK', 'Yapay zekâ anahtarı tanımlı değil.');

  const yanit = await client.beta.messages.parse({
    ...ORTAK,
    betas: [...ORTAK.betas],
    output_config: { effort: 'low', format: betaZodOutputFormat(TartiOkumasi) },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: gorsel.mediaType, data: gorsel.data },
          },
          { type: 'text', text: TARTI_ISTEMI },
        ],
      },
    ],
  });

  retKontrolu(yanit.stop_reason);
  if (!yanit.parsed_output) {
    throw new SaglikAiHatasi(
      'OKUNAMADI',
      'Ekrandaki değerler okunamadı. Daha net bir görüntü dene.',
    );
  }
  const oneri = tartiOnerisi(yanit.parsed_output);
  if (Object.keys(oneri).length === 1) {
    throw new SaglikAiHatasi('OKUNAMADI', 'Görselde tartı ölçümü bulunamadı.');
  }
  return oneri;
}

/* ===========================================================================
 * 2. HEKİM + DİYETİSYEN DEĞERLENDİRMESİ
 * ======================================================================== */

const Degerlendirme = z.object({
  ozet: z.string().describe('2-3 cümlelik genel durum'),
  iyiGidenler: z.array(z.string()).describe('Olumlu gidişler, en fazla 4'),
  dikkat: z.array(z.string()).describe('Dikkat edilmesi gerekenler, en fazla 4'),
  oneriler: z.array(z.string()).describe('Somut, uygulanabilir öneriler, en fazla 6'),
  gunlukSuLitre: z.number().nullable().describe('Önerilen günlük su, litre'),
  doktoraDanis: z.string().nullable().describe('Hekime görünmeyi gerektiren bir işaret varsa'),
});
export type SaglikDegerlendirmesi = z.infer<typeof Degerlendirme>;

const DEGERLENDIRME_SISTEMI = `Kullanıcının kişisel paneli için hem hekimi hem diyetisyeni gibi konuşuyorsun: sıcak, net, Türkçe, "sen" diliyle.
Ölçümleri tarih sırasıyla yorumla: kilo, yağ oranı, iç yağ, kas, su oranı, bazal metabolizma, uyku, adım, nabız.
- Eğilimi söyle (ör. "3 haftada 1,2 kg verdin, yağ oranı 0,8 puan düştü"); tek ölçüme fazla anlam yükleme.
- Öneriler somut olsun: su miktarı, protein hedefi (g/kg), kalori açığı, uyku, adım, kuvvet antrenmanı.
- Tanı koyma, ilaç önerme. Ciddi bir işaret görürsen doktoraDanis alanında açıkça söyle.
- Veride olmayan bir şeyi biliyormuş gibi yazma.`;

/** Kayıtları modele verilecek kısa tabloya çevirir. SAF. */
export function kayitTablosu(kayitlar: HealthLogDto[]): string {
  const sutunlar = [
    ['date', 'gün'],
    ['weightKg', 'kg'],
    ['bodyFatPct', 'yağ%'],
    ['visceralFat', 'iç yağ'],
    ['muscleKg', 'kas kg'],
    ['waterPct', 'su%'],
    ['bmi', 'BMI'],
    ['bmrKcal', 'BMR'],
    ['sleepHours', 'uyku sa'],
    ['steps', 'adım'],
    ['restingHr', 'nabız'],
    ['waterMl', 'içilen su ml'],
  ] as const;
  const satirlar = kayitlar.map((k) => sutunlar.map(([alan]) => k[alan] ?? '-').join(' | '));
  return [sutunlar.map(([, ad]) => ad).join(' | '), ...satirlar].join('\n');
}

export async function saglikDegerlendirmesi(
  kayitlar: HealthLogDto[],
  client: AiClient | null = aiIstemcisi(),
): Promise<SaglikDegerlendirmesi> {
  if (!client) throw new SaglikAiHatasi('ANAHTAR_YOK', 'Yapay zekâ anahtarı tanımlı değil.');
  if (kayitlar.length === 0) {
    throw new SaglikAiHatasi('OKUNAMADI', 'Yorum için önce en az bir ölçüm kaydet.');
  }

  const yanit = await client.beta.messages.parse({
    ...ORTAK,
    betas: [...ORTAK.betas],
    system: DEGERLENDIRME_SISTEMI,
    output_config: { effort: 'medium', format: betaZodOutputFormat(Degerlendirme) },
    messages: [
      {
        role: 'user',
        content: `Son ölçümlerim (eskiden yeniye):\n\n${kayitTablosu(kayitlar)}\n\nDurumumu değerlendir.`,
      },
    ],
  });

  retKontrolu(yanit.stop_reason);
  if (!yanit.parsed_output) {
    throw new SaglikAiHatasi(
      'OKUNAMADI',
      'Değerlendirme şu an üretilemedi. Biraz sonra yeniden dene.',
    );
  }
  return yanit.parsed_output;
}
