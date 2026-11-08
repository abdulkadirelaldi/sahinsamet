import { describe, expect, it } from 'vitest';

import {
  diziKontrol,
  kelimeler,
  konusmaKontrol,
  normallestir,
  uzaklik,
  yaziKontrol,
} from '@/lib/ingilizce/degerlendir';
import { karistir } from '@/components/panel/ingilizce/karistir';

describe('normallestir', () => {
  it('harf, noktalama ve kısaltma farkını siler', () => {
    expect(normallestir("I'm from Turkey.")).toBe('i am from turkey');
    expect(normallestir('I am  from TURKEY!')).toBe('i am from turkey');
    expect(normallestir('I don’t know')).toBe('i do not know');
    expect(normallestir("We can't, can not, cannot")).toBe('we cannot cannot cannot');
  });
  it('Türkçe ve aksanlı harf korunur, tire boşluk sayılır', () => {
    expect(normallestir('I live in Türkiye.')).toBe('i live in türkiye');
    expect(normallestir('a well-known café')).toBe('a well known café');
  });
  it('0–999 rakamla da yazıyla da aynı; yıl olduğu gibi kalır', () => {
    expect(normallestir('My sister is 17.')).toBe(normallestir('My sister is seventeen.'));
    expect(normallestir('at 8:30')).toBe('at eight thirty');
    expect(normallestir('It costs 105 dollars')).toBe('it costs one hundred five dollars');
    expect(normallestir('in 2021')).toBe('in 2021');
  });
  it('konuşma tanıma rakam yazsa da geçer', () => {
    expect(
      konusmaKontrol(['I got home at 8 last night'], 'I got home at eight last night.').eksikler,
    ).toEqual([]);
  });
  it('kipli kısaltmalar açılır', () => {
    expect(normallestir("You should've told me")).toBe('you should have told me');
    expect(normallestir("It could've been worse")).toBe('it could have been worse');
  });
  it('iyelik eki korunur', () => {
    expect(normallestir("My brother's car")).toBe("my brother's car");
  });
});

describe('kelimeler', () => {
  it('uçtaki noktalamayı atar, büyük harfi korur', () => {
    expect(kelimeler('Hello, how are you?')).toEqual(['Hello', 'how', 'are', 'you']);
    expect(kelimeler("I'm fine.")).toEqual(["I'm", 'fine']);
  });
});

describe('uzaklik', () => {
  it('düzenleme uzaklığı, yer değiştirme tek hata', () => {
    expect(uzaklik('kitten', 'sitting')).toBe(3);
    expect(uzaklik('turkey', 'turkye')).toBe(1);
    expect(uzaklik('abc', 'abc')).toBe(0);
    expect(uzaklik('', 'ab')).toBe(2);
  });
});

describe('yaziKontrol', () => {
  const cevaplar = ['I am from Turkey', 'I come from Turkey'];
  it('kısaltma ve alternatif doğru', () => {
    expect(yaziKontrol("i'm from turkey", cevaplar)).toEqual({ durum: 'dogru' });
    expect(yaziKontrol('I come from Turkey.', cevaplar)).toEqual({ durum: 'dogru' });
  });
  it('tek kelimede tek harflik yazım hatası yakın: doğru sayılır, doğrusu gösterilir', () => {
    expect(yaziKontrol('I am from Turky', cevaplar).durum).toBe('yakin');
    expect(yaziKontrol('I am frum Turky', cevaplar).durum).toBe('yanlis');
    expect(yaziKontrol('I am from Turkye', cevaplar)).toEqual({
      durum: 'yakin',
      dogruCevap: 'I am from Turkey',
    });
  });
  it('⚠️ eksik kelime yazım hatası değil', () => {
    expect(yaziKontrol('I from Turkey', cevaplar).durum).toBe('yanlis');
  });
  it('⚠️ dil bilgisi hatası yakın sayılmaz', () => {
    expect(yaziKontrol('She go to school', ['She goes to school']).durum).toBe('yanlis');
    expect(yaziKontrol('I have two dog', ['I have two dogs']).durum).toBe('yanlis');
    expect(yaziKontrol('I work yesterday', ['I worked yesterday']).durum).toBe('yanlis');
    expect(yaziKontrol('He it a teacher', ['He is a teacher']).durum).toBe('yanlis');
    expect(yaziKontrol('He are a teacher', ['He is a teacher']).durum).toBe('yanlis');
    expect(yaziKontrol('', cevaplar)).toEqual({ durum: 'yanlis', dogruCevap: 'I am from Turkey' });
  });
});

describe('diziKontrol', () => {
  it('sıra önemli, noktalama ve harf değil', () => {
    expect(diziKontrol(['I', 'am', 'fine'], "I'm fine.")).toBe(true);
    expect(diziKontrol(['am', 'I', 'fine'], 'I am fine.')).toBe(false);
    expect(diziKontrol(['Where', 'is', 'the', 'station'], 'Where is the station?')).toBe(true);
  });
});

describe('konusmaKontrol', () => {
  it('%75 ve üstü geçer, eksikler gösterilir', () => {
    const s = konusmaKontrol(['where is the train'], 'Where is the train station?');
    expect(s).toEqual({ gecti: true, oran: 0.8, eksikler: ['station'] });
  });
  it('en iyi adayı seçer', () => {
    const s = konusmaKontrol(['were is', 'where is the station'], 'Where is the station?');
    expect(s.gecti).toBe(true);
    expect(s.eksikler).toEqual([]);
  });
  it('kısaltma açılımı eşleşir', () => {
    expect(konusmaKontrol(['I am fine thank you'], "I'm fine, thank you.").gecti).toBe(true);
  });
  it('yarısı duyulursa geçmez', () => {
    expect(konusmaKontrol(['the station'], 'Where is the station?').gecti).toBe(false);
  });
});

describe('karistir', () => {
  it('aynı tohum aynı sıra, öğeler korunur', () => {
    const a = karistir([1, 2, 3, 4, 5, 6], 'gunluk-u1-d1-a1');
    expect(karistir([1, 2, 3, 4, 5, 6], 'gunluk-u1-d1-a1')).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
