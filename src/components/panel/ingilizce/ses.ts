'use client';

/**
 * Tarayıcının ses yetenekleri (2026-11-06): okuma `speechSynthesis`, konuşma tanıma
 * `SpeechRecognition` (Safari ve Chrome'da `webkit` önekli). İkisi de cihazda yoksa
 * alıştırma yine çalışır: dinlemede metin gösterilir, konuşma atlanabilir.
 */

let sesler: SpeechSynthesisVoice[] = [];
const TERCIH = ['Samantha', 'Ava', 'Allison', 'Google US English', 'Microsoft Aria', 'Alex'];

function sesSec(): SpeechSynthesisVoice | undefined {
  if (sesler.length === 0) sesler = window.speechSynthesis.getVoices();
  const ingilizce = sesler.filter((s) => s.lang.replace('_', '-').startsWith('en-US'));
  return (
    TERCIH.map((ad) => ingilizce.find((s) => s.name.includes(ad))).find(Boolean) ??
    ingilizce.find((s) => s.localService) ??
    ingilizce[0] ??
    sesler.find((s) => s.lang.startsWith('en'))
  );
}

export function okumaVarMi(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Cümleyi okur; `yavas` öğrenme hızı. iOS yalnızca dokunuşla başlatılan okumaya izin verir. */
export function oku(metin: string, yavas = false): void {
  if (!okumaVarMi()) return;
  const s = window.speechSynthesis;
  s.cancel();
  const soz = new SpeechSynthesisUtterance(metin);
  soz.lang = 'en-US';
  soz.rate = yavas ? 0.6 : 0.92;
  const ses = sesSec();
  if (ses) soz.voice = ses;
  s.speak(soz);
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // Sesler çoğu tarayıcıda geç yüklenir.
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    sesler = window.speechSynthesis.getVoices();
  });
}

interface TanimaSonucu {
  0: { transcript: string };
  length: number;
  [i: number]: { transcript: string };
}
interface Tanima {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: { 0: TanimaSonucu; length: number } }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type TanimaYapici = new () => Tanima;

function yapici(): TanimaYapici | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: TanimaYapici;
    webkitSpeechRecognition?: TanimaYapici;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function tanimaVarMi(): boolean {
  return yapici() !== null;
}

export type DinlemeHatasi = 'izin' | 'duyulmadi' | 'yok' | 'diger';

/**
 * Bir kez dinler; duyulan cümle adaylarını döndürür. `iptal` ile durdurulur.
 * Hata: izin verilmedi, ses gelmedi, cihazda yok ya da başka.
 */
export function dinle(): { sonuc: Promise<string[]>; iptal: () => void } {
  const Y = yapici();
  if (!Y)
    return { sonuc: Promise.reject<string[]>('yok' satisfies DinlemeHatasi), iptal: () => {} };
  const t = new Y();
  t.lang = 'en-US';
  t.interimResults = false;
  t.maxAlternatives = 5;
  t.continuous = false;
  const sonuc = new Promise<string[]>((coz, reddet) => {
    let bitti = false;
    t.onresult = (e) => {
      const r = e.results[0];
      const adaylar: string[] = [];
      for (let i = 0; i < r.length; i += 1) adaylar.push(r[i]!.transcript);
      bitti = true;
      coz(adaylar);
    };
    t.onerror = (e) => {
      bitti = true;
      reddet(
        (e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'izin'
          : e.error === 'no-speech'
            ? 'duyulmadi'
            : 'diger') satisfies DinlemeHatasi,
      );
    };
    t.onend = () => {
      if (!bitti) reddet('duyulmadi' satisfies DinlemeHatasi);
    };
  });
  try {
    t.start();
  } catch {
    return { sonuc: Promise.reject<string[]>('diger' satisfies DinlemeHatasi), iptal: () => {} };
  }
  return { sonuc, iptal: () => t.abort() };
}
