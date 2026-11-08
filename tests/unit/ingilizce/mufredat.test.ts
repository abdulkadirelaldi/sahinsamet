import { describe, expect, it } from 'vitest';

import { kelimeler, normallestir, yaziKontrol } from '@/lib/ingilizce/degerlendir';
import { PARKURLAR } from '@/lib/ingilizce/mufredat';
import type { Alistirma, Parkur } from '@/lib/ingilizce/tipler';

/**
 * MÜFREDAT DENETİMİ (2026-11-06) — içerik elle yazıldı; bu test biçim hatasını,
 * çakışan kimliği ve kendi cevabını kabul etmeyen soruyu yakalar. Doğruluğu (dil
 * bilgisi, anlam) ölçemez: o, içerik gözden geçirilerek sağlandı.
 */

const SEVIYE_SIRASI = ['A1', 'A2', 'B1', 'B2', 'C1'];

function alistirmalar(p: Parkur): { dersId: string; a: Alistirma }[] {
  return p.uniteler.flatMap((u) =>
    u.dersler.flatMap((d) => d.alistirmalar.map((a) => ({ dersId: d.id, a }))),
  );
}

describe('müfredat', () => {
  it('üç parkur var', () => {
    expect(PARKURLAR.map((p) => p.id)).toEqual(['gunluk', 'yazilim', 'sinav']);
  });

  it('bütün kimlikler eşsiz ve parkur önekli', () => {
    const goruldu = new Set<string>();
    for (const p of PARKURLAR) {
      for (const u of p.uniteler) {
        for (const id of [
          u.id,
          ...u.dersler.map((d) => d.id),
          ...u.dersler.flatMap((d) => d.alistirmalar.map((a) => a.id)),
        ]) {
          expect(id.startsWith(`${p.id}-`), id).toBe(true);
          expect(/^[a-z0-9-]+$/.test(id), id).toBe(true);
          expect(goruldu.has(id), `tekrar: ${id}`).toBe(false);
          goruldu.add(id);
        }
      }
    }
  });

  for (const p of PARKURLAR) {
    describe(p.ad, () => {
      it('seviyeler temelden ileriye, en az dört ünite', () => {
        expect(p.uniteler.length).toBeGreaterThanOrEqual(4);
        const sira = p.uniteler.map((u) => SEVIYE_SIRASI.indexOf(u.seviye));
        expect(sira.every((s) => s >= 0)).toBe(true);
        expect([...sira].sort((a, b) => a - b)).toEqual(sira);
      });

      it('her ünite ve dersin tek emojilik simgesi var; alıştırma görseli de tek emoji', () => {
        const emoji = (g: string | undefined) =>
          g !== undefined &&
          /\p{Extended_Pictographic}/u.test(g) &&
          [...g].length <= 4 &&
          !/[a-zA-Z0-9]/.test(g);
        for (const u of p.uniteler) {
          expect(emoji(u.gorsel), `${u.id} simge`).toBe(true);
          for (const d of u.dersler) {
            expect(emoji(d.gorsel), `${d.id} simge`).toBe(true);
            for (const a of d.alistirmalar) {
              if ('gorsel' in a && a.gorsel !== undefined)
                expect(emoji(a.gorsel), `${a.id} görsel`).toBe(true);
            }
          }
        }
      });

      it('her ünitede en az üç ders; her ders not ve 8–14 alıştırma, en az üç tür', () => {
        for (const u of p.uniteler) {
          expect(u.dersler.length, u.id).toBeGreaterThanOrEqual(3);
          expect(u.ozet.length, u.id).toBeGreaterThan(10);
          for (const d of u.dersler) {
            expect(d.not.length, `${d.id} notu kısa`).toBeGreaterThanOrEqual(150);
            expect(d.alistirmalar.length, d.id).toBeGreaterThanOrEqual(8);
            expect(d.alistirmalar.length, d.id).toBeLessThanOrEqual(14);
            expect(new Set(d.alistirmalar.map((a) => a.tur)).size, d.id).toBeGreaterThanOrEqual(3);
          }
        }
      });

      it('her alıştırma kendi kurallarına uyuyor', () => {
        for (const { a } of alistirmalar(p)) {
          switch (a.tur) {
            case 'bosluk':
            case 'secmeli': {
              expect(a.secenekler.length, a.id).toBeGreaterThanOrEqual(3);
              expect(a.secenekler.length, a.id).toBeLessThanOrEqual(5);
              expect(
                new Set(a.secenekler.map((s) => s.trim().toLowerCase())).size,
                `${a.id} aynı şık`,
              ).toBe(a.secenekler.length);
              expect(a.dogru, a.id).toBeGreaterThanOrEqual(0);
              expect(a.dogru, a.id).toBeLessThan(a.secenekler.length);
              expect(a.aciklama.length, `${a.id} açıklama kısa`).toBeGreaterThanOrEqual(20);
              if (a.tur === 'bosluk')
                expect(a.soru.includes('___'), `${a.id} boşluk yok`).toBe(true);
              break;
            }
            case 'dinle': {
              const k = kelimeler(a.cumle);
              expect(k.length, a.id).toBeGreaterThanOrEqual(2);
              expect(k.length, `${a.id} uzun`).toBeLessThanOrEqual(14);
              expect(a.celdiriciler.length, a.id).toBeGreaterThanOrEqual(2);
              expect(a.celdiriciler.length, a.id).toBeLessThanOrEqual(4);
              const kucuk = new Set(k.map((x) => x.toLowerCase()));
              for (const c of a.celdiriciler)
                expect(kucuk.has(c.toLowerCase()), `${a.id} çeldirici cümlede: ${c}`).toBe(false);
              expect(a.anlam.length, a.id).toBeGreaterThan(0);
              break;
            }
            case 'konus': {
              const k = kelimeler(a.cumle);
              expect(k.length, a.id).toBeGreaterThanOrEqual(2);
              expect(k.length, `${a.id} uzun`).toBeLessThanOrEqual(14);
              expect(a.anlam.length, a.id).toBeGreaterThan(0);
              break;
            }
            case 'yaz': {
              expect(a.cevaplar.length, a.id).toBeGreaterThanOrEqual(1);
              expect(a.kaynak.length, a.id).toBeGreaterThan(0);
              for (const c of a.cevaplar) {
                expect(normallestir(c).length, a.id).toBeGreaterThan(0);
                expect(
                  yaziKontrol(c, a.cevaplar).durum,
                  `${a.id} kendi cevabını kabul etmiyor`,
                ).toBe('dogru');
              }
              break;
            }
            case 'eslestir': {
              expect(a.ciftler.length, a.id).toBeGreaterThanOrEqual(4);
              expect(a.ciftler.length, a.id).toBeLessThanOrEqual(6);
              expect(new Set(a.ciftler.map((c) => c[0].toLowerCase())).size, a.id).toBe(
                a.ciftler.length,
              );
              expect(new Set(a.ciftler.map((c) => c[1].toLowerCase())).size, a.id).toBe(
                a.ciftler.length,
              );
              break;
            }
          }
        }
      });

      it('⚠️ açıklama şıkkı harf ya da sırayla anmaz (şıklar ekranda karışık)', () => {
        // Harf: büyük harfe duyarlı ("I'd)" yakalanmasın). Sıra sözcükleri: duyarsız.
        const harf = /(^|[\s("'])[A-E]\)|\b[A-E] (şıkkı|şık|seçene)/;
        const sira =
          /(ilk|ikinci|üçüncü|dördüncü|beşinci|birinci|son) (şık|seçenek)|\b(ilki|ikincisi|üçüncüsü|dördüncüsü|beşincisi|sonuncusu)\b/i;
        for (const { a } of alistirmalar(p)) {
          if (a.tur !== 'bosluk' && a.tur !== 'secmeli') continue;
          if (a.secenekler.every((s) => /^[IVX]+$/.test(s))) continue;
          const metin = a.aciklama.replace(/İ/g, 'i');
          expect(harf.test(metin) || sira.test(metin), `${a.id}: ${a.aciklama}`).toBe(false);
        }
      });

      it('dört beceri de var: okuma/dil bilgisi, dinleme, konuşma, yazma', () => {
        const turler = new Set(alistirmalar(p).map(({ a }) => a.tur));
        for (const t of ['dinle', 'konus', 'yaz']) expect(turler.has(t as never), t).toBe(true);
        expect(turler.has('bosluk') || turler.has('secmeli')).toBe(true);
      });
    });
  }
});
