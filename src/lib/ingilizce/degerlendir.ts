/**
 * Cevap değerlendirme (2026-11-06) — SAF, istemcide çalışır.
 *
 * Yazılı cevapta büyük/küçük harf, noktalama ve kısaltma farkı yanlış sayılmaz: "I'm" ile
 * "I am" aynı cevaptır. Tek harflik yazım hatası kabul edilir ama söylenir; dil bilgisi
 * hatası (ek, tekil/çoğul, kısa kelime) kabul edilmez. Konuşmada tanıma motoru kusurlu: kelimelerin
 * çoğu duyulduysa geçer, duyulmayanlar gösterilir.
 */

const KISALTMALAR: Record<string, string> = {
  "i'm": 'i am',
  "you're": 'you are',
  "we're": 'we are',
  "they're": 'they are',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "that's": 'that is',
  "there's": 'there is',
  "what's": 'what is',
  "where's": 'where is',
  "who's": 'who is',
  "i've": 'i have',
  "you've": 'you have',
  "we've": 'we have',
  "they've": 'they have',
  "i'll": 'i will',
  "you'll": 'you will',
  "we'll": 'we will',
  "they'll": 'they will',
  "he'll": 'he will',
  "she'll": 'she will',
  "it'll": 'it will',
  "i'd": 'i would',
  "you'd": 'you would',
  "we'd": 'we would',
  "they'd": 'they would',
  "let's": 'let us',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "hadn't": 'had not',
  "won't": 'will not',
  "wouldn't": 'would not',
  "can't": 'cannot',
  "couldn't": 'could not',
  "shouldn't": 'should not',
  "mustn't": 'must not',
  'can not': 'cannot',
  "should've": 'should have',
  "could've": 'could have',
  "would've": 'would have',
  "must've": 'must have',
  "might've": 'might have',
  "there're": 'there are',
  "here's": 'here is',
  "how's": 'how is',
  "when's": 'when is',
  "why's": 'why is',
  "he'd": 'he would',
  "she'd": 'she would',
  "it'd": 'it would',
  "that'll": 'that will',
  "there'll": 'there will',
};

const BIRLER = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const ONLAR = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

/** 0–999 arası sayının yazısı ("twenty one", "three hundred five"). SAF. */
export function sayiYazisi(n: number): string {
  if (n < 20) return BIRLER[n]!;
  if (n < 100)
    return n % 10 === 0 ? ONLAR[n / 10]! : `${ONLAR[Math.floor(n / 10)]} ${BIRLER[n % 10]}`;
  const kalan = n % 100;
  return `${BIRLER[Math.floor(n / 100)]} hundred${kalan === 0 ? '' : ` ${sayiYazisi(kalan)}`}`;
}

/** Karşılaştırma biçimi: küçük harf, kısaltmalar açık, 0–999 yazıyla, noktalama ve tire yok. SAF. */
export function normallestir(metin: string): string {
  let s = metin
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"');
  s = s.replace(/[a-z]+'[a-z]+/g, (k) => KISALTMALAR[k] ?? k);
  s = s.replace(/\bcan not\b/g, 'cannot');
  // Konuşma tanıma sayıyı rakamla yazabilir, kullanıcı da: "17" ile "seventeen" aynı cevap.
  // Yalnızca 0–999; yıl gibi uzun sayılar olduğu gibi kalır.
  s = s.replace(/(?<![\d.,])\d{1,3}(?![\d,])/g, (r) => sayiYazisi(Number(r)));
  return (
    s
      // Harf her alfabeden korunur ("Türkiye", "café"); tire boşluk sayılır ("well-known").
      .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
      .replace(/(^|\s)'|'(\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Kelime kutuları: boşlukla ayrılır, uçtaki noktalama atılır, büyük harf korunur. SAF. */
export function kelimeler(cumle: string): string[] {
  return cumle
    .split(/\s+/)
    .map((k) => k.replace(/^[.,!?;:"()]+|[.,!?;:"()]+$/g, ''))
    .filter((k) => k.length > 0);
}

/** Düzenleme uzaklığı; yan yana iki harfin yer değiştirmesi tek hata sayılır (OSA). SAF. */
export function uzaklik(a: string, b: string): number {
  if (a === b) return 0;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const fark = a[i - 1] === b[j - 1] ? 0 : 1;
      let deger = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + fark);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        deger = Math.min(deger, d[i - 2]![j - 2]! + 1);
      }
      d[i]![j] = deger;
    }
  }
  return d[a.length]![b.length]!;
}

export type YaziSonucu =
  | { durum: 'dogru' }
  | { durum: 'yakin'; dogruCevap: string }
  | { durum: 'yanlis'; dogruCevap: string };

const DIL_BILGISI_EKI = /^(s|es|d|ed)$/;

/** İki kelimenin farkı yazım hatası mı, dil bilgisi mi. SAF. */
function yazimHatasiMi(beklenen: string, yazilan: string): boolean {
  if (beklenen.length < 4 || uzaklik(beklenen, yazilan) !== 1) return false;
  // "dog/dogs", "work/worked", "go/goes" yazım değil, dil hatası.
  const [kisa, uzun] =
    beklenen.length <= yazilan.length ? [beklenen, yazilan] : [yazilan, beklenen];
  return !(uzun.startsWith(kisa) && DIL_BILGISI_EKI.test(uzun.slice(kisa.length)));
}

/**
 * Yazılı cevap. Tam eşleşme doğru. Tek kelimede tek harflik yazım hatası (en az dört
 * harfli kelimede, ek farkı değil) "yakın": doğru sayılır, doğru yazılışı gösterilir.
 * Eksik kelime, "a/an", "is/it", tekil/çoğul ya da zaman eki hatası yanlıştır. SAF.
 */
export function yaziKontrol(girdi: string, cevaplar: readonly string[]): YaziSonucu {
  const g = normallestir(girdi);
  const ilk = cevaplar[0] ?? '';
  if (g.length === 0) return { durum: 'yanlis', dogruCevap: ilk };
  const gk = g.split(' ');
  for (const c of cevaplar) if (normallestir(c) === g) return { durum: 'dogru' };
  for (const c of cevaplar) {
    const ck = normallestir(c).split(' ');
    if (ck.length !== gk.length) continue;
    const farkli = ck.flatMap((k, i) => (k === gk[i] ? [] : [[k, gk[i]!] as const]));
    if (farkli.length === 1 && yazimHatasiMi(farkli[0]![0], farkli[0]![1])) {
      return { durum: 'yakin', dogruCevap: c };
    }
  }
  return { durum: 'yanlis', dogruCevap: ilk };
}

/** Kelime dizme: sıra ve kelimeler aynı mı (harf ve noktalama farkı önemsiz). SAF. */
export function diziKontrol(secilen: readonly string[], cumle: string): boolean {
  return normallestir(secilen.join(' ')) === normallestir(kelimeler(cumle).join(' '));
}

export interface KonusmaSonucu {
  gecti: boolean;
  /** 0–1: hedef kelimelerin duyulan oranı. */
  oran: number;
  /** Duyulmayan hedef kelimeler, cümledeki yazılışıyla. */
  eksikler: string[];
}

/**
 * Konuşma: hedef cümlenin kelimelerinin en az %75'i duyulduysa geçer. Sıra aranmaz —
 * tanıma motoru kelimeleri birleştirip ayırabiliyor; aranan telaffuz. SAF.
 */
export function konusmaKontrol(duyulanlar: readonly string[], cumle: string): KonusmaSonucu {
  const hedef = kelimeler(cumle);
  let enIyi: KonusmaSonucu = { gecti: false, oran: 0, eksikler: hedef };
  for (const duyulan of duyulanlar) {
    const torba = normallestir(duyulan).split(' ');
    const eksikler: string[] = [];
    for (const k of hedef) {
      const parcalar = normallestir(k).split(' ');
      const hepsi = parcalar.every((p) => {
        const i = torba.indexOf(p);
        if (i === -1) return false;
        torba.splice(i, 1);
        return true;
      });
      if (!hepsi) eksikler.push(k);
    }
    const oran = hedef.length === 0 ? 0 : (hedef.length - eksikler.length) / hedef.length;
    if (oran > enIyi.oran) enIyi = { gecti: oran >= 0.75, oran, eksikler };
  }
  return enIyi;
}
