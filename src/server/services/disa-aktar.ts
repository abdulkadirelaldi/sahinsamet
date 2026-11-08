import { db } from '@/server/db';

import { dateToAppDay, toMeasureString } from './_shared';
import { gunDurumu } from './habit-gun';

/**
 * VERİYİ DIŞA AKTARMA (2026-10-31) — Cüzdan, Sağlık, Alışkanlık, Spor, Günlük, Hedef → CSV.
 *
 * EXCEL TÜRKÇE İÇİN: UTF-8 BOM (yoksa ç/ğ/ş bozuk görünür), `;` ayırıcı ve
 * VİRGÜLLÜ ondalık — TR bölgesel ayarlı Excel çift tıklamada sütunları ve
 * sayıları doğru açar. Tutarlar metinden yazılır, sayıya çevrilmez (ADR-014/D).
 */

export type DisaAktarTuru = 'cuzdan' | 'saglik' | 'aliskanlik' | 'spor' | 'gunluk' | 'hedef';

/** Tek hücre: `;`, tırnak ya da satır sonu varsa tırnaklanır. SAF. */
function csvHucre(deger: string | number | boolean | null | undefined): string {
  if (deger === null || deger === undefined) return '';
  const metin = typeof deger === 'boolean' ? (deger ? 'evet' : 'hayır') : String(deger);
  // Formül enjeksiyonu: =, +, -, @ ile başlayan metin Excel'de formül olur.
  const guvenli = /^[=+\-@\t\r]/.test(metin) && !/^-?\d+(,\d+)?$/.test(metin) ? `'${metin}` : metin;
  return /[;"\n\r]/.test(guvenli) ? `"${guvenli.replace(/"/g, '""')}"` : guvenli;
}

/** Ondalık metin → Excel TR biçimi (`"1250.50"` → `"1250,50"`). SAF. */
export const ondalik = (deger: string | null | undefined): string | null =>
  deger ? deger.replace('.', ',') : null;

/** Satırlar → CSV (BOM + `;` + CRLF). SAF. */
export function csv(baslik: string[], satirlar: (string | number | boolean | null)[][]): string {
  const satir = (s: (string | number | boolean | null)[]) => s.map(csvHucre).join(';');
  return '﻿' + [baslik, ...satirlar].map(satir).join('\r\n') + '\r\n';
}

async function cuzdanCsv(): Promise<string> {
  const [hesaplar, borclar, akislar, odemeler, netVarlik, transferler] = await Promise.all([
    db.walletAccount.findMany({ orderBy: { createdAt: 'asc' } }),
    db.walletDebt.findMany({ orderBy: { createdAt: 'asc' } }),
    db.walletFlow.findMany({ orderBy: [{ date: 'desc' }, { createdAt: 'asc' }] }),
    db.walletDebtPayment.findMany({
      orderBy: { date: 'desc' },
      include: { debt: { select: { name: true, unit: true } } },
    }),
    db.netVarlikKaydi.findMany({ orderBy: { gun: 'desc' } }),
    db.walletTransfer.findMany({ orderBy: { gun: 'desc' } }),
  ]);
  const hesapAdi = new Map(hesaplar.map((h) => [h.id, h]));
  const para = (d: unknown) => ondalik(toMeasureString(d as never, 2));
  return csv(
    [
      'Bölüm',
      'Ad',
      'Kime/Kimden',
      'Tutar',
      'Kalan',
      'Aylık taksit',
      'Birim',
      'Sıklık',
      'Gün',
      'Tarih',
      'Kategori',
      'Not',
    ],
    [
      ...hesaplar.map((h) => [
        h.isArchived ? 'Hesap (kaldırıldı)' : 'Hesap',
        h.name,
        null,
        para(h.balance),
        null,
        null,
        h.unit,
        null,
        null,
        null,
        h.kind,
        null,
      ]),
      ...borclar.map((b) => [
        b.isClosed ? 'Borç (kapandı)' : 'Borç',
        b.name,
        b.lender,
        para(b.totalAmount),
        para(b.remainingAmount),
        para(b.monthlyPayment),
        b.unit,
        null,
        b.paymentDay,
        b.endDate ? dateToAppDay(b.endDate) : null,
        null,
        b.note,
      ]),
      ...akislar.map((a) => [
        a.kind === 'INCOME' ? 'Gelir' : 'Gider',
        a.name,
        a.counterparty,
        para(a.amount),
        null,
        null,
        a.unit,
        a.frequency,
        a.day,
        a.date ? dateToAppDay(a.date) : null,
        a.category,
        a.note,
      ]),
      ...odemeler.map((o) => [
        'Borç ödemesi',
        o.debt.name,
        null,
        para(o.amount),
        null,
        null,
        o.debt.unit,
        null,
        null,
        dateToAppDay(o.date),
        null,
        o.note,
      ]),
      ...transferler.map((t) => [
        'Transfer',
        hesapAdi.get(t.kaynakId)?.name ?? null,
        hesapAdi.get(t.hedefId)?.name ?? null,
        para(t.amount),
        null,
        null,
        hesapAdi.get(t.kaynakId)?.unit ?? null,
        null,
        null,
        dateToAppDay(t.gun),
        null,
        t.note,
      ]),
      ...netVarlik.map((n) => [
        'Net varlık',
        null,
        null,
        para(n.netTl),
        para(n.borcTl),
        null,
        'TRY',
        null,
        null,
        dateToAppDay(n.gun),
        null,
        null,
      ]),
    ],
  );
}

async function saglikCsv(): Promise<string> {
  const kayitlar = await db.healthLog.findMany({ orderBy: { date: 'asc' } });
  const o = (d: unknown, olcek: number) => ondalik(toMeasureString(d as never, olcek));
  return csv(
    [
      'Gün',
      'Kilo',
      'Yağ %',
      'BMI',
      'Su %',
      'Kas kg',
      'Kemik kg',
      'Protein %',
      'İç yağ',
      'Deri altı yağ %',
      'İskelet kası %',
      'Bazal metab.',
      'Metabolik yaş',
      'Uyku sa',
      'Su ml',
      'Nabız',
      'Adım',
      'Ruh hâli',
      'Not',
    ],
    kayitlar.map((k) => [
      dateToAppDay(k.date),
      o(k.weightKg, 2),
      o(k.bodyFatPct, 1),
      o(k.bmi, 1),
      o(k.waterPct, 1),
      o(k.muscleKg, 2),
      o(k.boneKg, 2),
      o(k.proteinPct, 1),
      o(k.visceralFat, 1),
      o(k.subcutaneousFatPct, 1),
      o(k.skeletalMusclePct, 1),
      k.bmrKcal,
      k.metabolicAge,
      o(k.sleepHours, 2),
      k.waterMl,
      k.restingHr,
      k.steps,
      k.mood,
      k.note,
    ]),
  );
}

const DURUM_METNI = {
  YAPILDI: 'yapıldı',
  EKSIK: 'eksik',
  YAPILMADI: 'yapılmadı',
  ISARETSIZ: '',
} as const;

async function aliskanlikCsv(): Promise<string> {
  const isaretler = await db.habitLog.findMany({
    orderBy: [{ date: 'asc' }],
    select: {
      date: true,
      count: true,
      missed: true,
      habit: { select: { name: true, targetPerDay: true, sureli: true } },
    },
  });
  return csv(
    ['Gün', 'Alışkanlık', 'Sayı', 'Hedef', 'Birim', 'Durum'],
    isaretler.map((i) => [
      dateToAppDay(i.date),
      i.habit.name,
      i.count,
      i.habit.targetPerDay ?? 1,
      i.habit.sureli ? 'dakika' : 'kez',
      DURUM_METNI[gunDurumu(i.count, i.missed, i.habit.targetPerDay)],
    ]),
  );
}

async function sporCsv(): Promise<string> {
  const setler = await db.workoutSet.findMany({
    orderBy: [{ workout: { date: 'desc' } }, { exerciseId: 'asc' }, { setNo: 'asc' }],
    include: {
      exercise: { select: { name: true } },
      workout: {
        select: {
          date: true,
          type: true,
          durationMin: true,
          kcal: true,
          programDay: { select: { name: true } },
        },
      },
    },
  });
  return csv(
    ['Tarih', 'Program', 'Tür', 'Hareket', 'Set', 'Tekrar', 'Kg', 'RPE', 'Süre (dk)', 'Kalori'],
    setler.map((s) => [
      dateToAppDay(s.workout.date),
      s.workout.programDay?.name ?? null,
      s.workout.type,
      s.exercise.name,
      s.setNo,
      s.reps,
      ondalik(toMeasureString(s.weightKg, 2)),
      s.rpe,
      s.workout.durationMin,
      s.workout.kcal,
    ]),
  );
}

async function gunlukCsv(): Promise<string> {
  const yazilar = await db.journalEntry.findMany({ orderBy: { date: 'desc' } });
  return csv(
    ['Tarih', 'Başlık', 'Ruh hâli', 'Etiketler', 'İçerik'],
    yazilar.map((y) => [dateToAppDay(y.date), y.title, y.mood, y.tags.join(', '), y.content]),
  );
}

async function hedefCsv(): Promise<string> {
  const hedefler = await db.goal.findMany({ orderBy: { createdAt: 'desc' } });
  return csv(
    [
      'Başlık',
      'Kategori',
      'Durum',
      'İlerleme (%)',
      'Dönem',
      'Dönem anahtarı',
      'Hedef tarih',
      'Açıklama',
    ],
    hedefler.map((h) => [
      h.title,
      h.category,
      h.status,
      h.progress,
      h.period,
      h.periodKey,
      h.targetDate ? dateToAppDay(h.targetDate) : null,
      h.description,
    ]),
  );
}

export async function disaAktar(tur: DisaAktarTuru): Promise<string> {
  if (tur === 'cuzdan') return cuzdanCsv();
  if (tur === 'saglik') return saglikCsv();
  if (tur === 'spor') return sporCsv();
  if (tur === 'gunluk') return gunlukCsv();
  if (tur === 'hedef') return hedefCsv();
  return aliskanlikCsv();
}
