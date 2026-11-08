/**
 * İNGİLİZCE (2026-11-06) — müfredatın biçimi. İçerik `gunluk.ts`, `yazilim.ts`, `sinav.ts`;
 * ilerleme veritabanında, müfredat kodda. Kimlikler KALICI: tamamlanan ders ve yanlış
 * yapılan soru kimlikle saklanır, değişirse ilerleme kaybolur.
 */

export type ParkurKimligi = 'gunluk' | 'yazilim' | 'sinav';
export type Seviye = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

/** Çoktan seçmeli. `soru` içinde boşluk `___` ile; okuma sorusunda paragraf `metin`de. */
export interface SecmeliAlistirma {
  tur: 'bosluk' | 'secmeli';
  id: string;
  /** İsteğe bağlı görsel ipucu: tek emoji (ör. kelime sorusunda nesnenin kendisi). Cevabı ele vermemeli. */
  gorsel?: string;
  /** Okuma parçası ya da diyalog; yoksa yalnızca soru. */
  metin?: string;
  soru: string;
  secenekler: readonly string[];
  /** `secenekler` içindeki doğru şıkkın sırası (0'dan). */
  dogru: number;
  /** Cevaptan sonra gösterilir: NEDEN doğru, diğerleri neden değil. Türkçe. */
  aciklama: string;
}

/** Dinle ve kelimeleri sıraya diz: cümle sesli okunur, kullanıcı kelime kutularından kurar. */
export interface DinleAlistirma {
  tur: 'dinle';
  id: string;
  /** İsteğe bağlı görsel ipucu: tek emoji (ör. kelime sorusunda nesnenin kendisi). Cevabı ele vermemeli. */
  gorsel?: string;
  /** Okunacak ve kurulacak İngilizce cümle. */
  cumle: string;
  /** Türkçe anlamı — cevaptan sonra gösterilir. */
  anlam: string;
  /** Kutulara karıştırılan yanlış kelimeler (2–4). */
  celdiriciler: readonly string[];
  aciklama?: string;
}

/** Sesli söyle: mikrofon desteklenmiyorsa kullanıcı atlayabilir. */
export interface KonusAlistirma {
  tur: 'konus';
  id: string;
  /** İsteğe bağlı görsel ipucu: tek emoji (ör. kelime sorusunda nesnenin kendisi). Cevabı ele vermemeli. */
  gorsel?: string;
  cumle: string;
  anlam: string;
  /** Telaffuz ipucu, Türkçe (vurgu, yutulan ses, "th" gibi). */
  ipucu?: string;
}

/** Türkçeden İngilizceye yaz. */
export interface YazAlistirma {
  tur: 'yaz';
  id: string;
  /** İsteğe bağlı görsel ipucu: tek emoji (ör. kelime sorusunda nesnenin kendisi). Cevabı ele vermemeli. */
  gorsel?: string;
  /** Türkçe cümle. */
  kaynak: string;
  /** Kabul edilen İngilizce karşılıklar; ilki ekranda "doğru cevap" diye gösterilir. */
  cevaplar: readonly string[];
  aciklama?: string;
}

/** Eşleştir: İngilizce ↔ Türkçe çiftler (4–6). */
export interface EslestirAlistirma {
  tur: 'eslestir';
  id: string;
  ciftler: readonly (readonly [ingilizce: string, turkce: string])[];
}

export type Alistirma =
  SecmeliAlistirma | DinleAlistirma | KonusAlistirma | YazAlistirma | EslestirAlistirma;

export interface Ders {
  id: string;
  baslik: string;
  /** Dersin simgesi: tek emoji. */
  gorsel: string;
  /** Dersten önce okunan kısa konu anlatımı: kural, örnekler, sık yapılan hata. Türkçe, düz metin; `**kalın**` ve `- madde` desteklenir. */
  not: string;
  alistirmalar: readonly Alistirma[];
}

export interface Unite {
  id: string;
  seviye: Seviye;
  baslik: string;
  /** Ünitenin simgesi: tek emoji (ders yolunda büyük gösterilir). */
  gorsel: string;
  /** Tek cümle: bu ünitede ne öğreniliyor. */
  ozet: string;
  dersler: readonly Ders[];
}

export interface Parkur {
  id: ParkurKimligi;
  ad: string;
  aciklama: string;
  uniteler: readonly Unite[];
}
