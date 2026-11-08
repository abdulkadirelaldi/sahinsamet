'use client';

import { Check, Mic, Snail, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { diziKontrol, kelimeler, konusmaKontrol, yaziKontrol } from '@/lib/ingilizce/degerlendir';
import type {
  DinleAlistirma,
  EslestirAlistirma,
  KonusAlistirma,
  SecmeliAlistirma,
  YazAlistirma,
} from '@/lib/ingilizce/tipler';
import { cn } from '@/lib/utils/cn';

import { karistir } from './karistir';
import { dinle, oku, okumaVarMi, tanimaVarMi, type DinlemeHatasi } from './ses';

/** Cevap bildirimi: oynatıcı geri bildirimi gösterir, yanlışsa soruyu sona ekler. */
export interface Cevap {
  dogru: boolean;
  /** Geri bildirimde gösterilecek doğru cevap. */
  dogruCevap?: string;
  /** Doğru sayıldı ama düzeltme var (yazım hatası). */
  not?: string;
  /** `false`: yanlış da olsa yeniden sorulmaz (eşleştirme tamamlandığında). */
  tekrarla?: boolean;
}

interface Ortak {
  kilitli: boolean;
  onCevap: (c: Cevap) => void;
}

const BIRINCIL =
  'focus-ring bg-accent hover:bg-accent-hover h-12 w-full rounded-full font-semibold text-white transition-colors disabled:opacity-40';

function KontrolDugmesi({
  kilitli,
  hazir,
  onClick,
}: {
  kilitli: boolean;
  hazir: boolean;
  onClick: () => void;
}) {
  if (kilitli) return null;
  return (
    <button type="button" disabled={!hazir} onClick={onClick} className={BIRINCIL}>
      Kontrol et
    </button>
  );
}

function Baslik({ children, gorsel }: { children: ReactNode; gorsel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-primary text-lg font-semibold tracking-tight">{children}</h2>
      {gorsel && (
        <span className="ing-suzul text-5xl leading-none" aria-hidden="true">
          {gorsel}
        </span>
      )}
    </div>
  );
}

function DinleDugmeleri({ cumle, otomatik }: { cumle: string; otomatik?: boolean }) {
  const ilk = useRef(false);
  useEffect(() => {
    // Tarayıcı izin veriyorsa ilk açılışta bir kez okur (iOS dokunuş ister, sessiz kalabilir).
    if (otomatik && !ilk.current) {
      ilk.current = true;
      oku(cumle);
    }
  }, [cumle, otomatik]);
  if (!okumaVarMi()) return null;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => oku(cumle)}
        aria-label="Dinle"
        className="focus-ring bg-accent flex size-16 items-center justify-center rounded-2xl text-white shadow-[var(--golge-kart)]"
      >
        <Volume2 className="size-7" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => oku(cumle, true)}
        aria-label="Yavaş dinle"
        className="focus-ring bg-elevated text-primary flex size-12 items-center justify-center rounded-2xl"
      >
        <Snail className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Boşluğu doldur ve çoktan seçmeli. */
export function SecmeliSoru({ a, kilitli, onCevap }: Ortak & { a: SecmeliAlistirma }) {
  const [secim, setSecim] = useState<number | null>(null);
  const parcalar = a.soru.split('___');
  // Doğru şıkkın yeri ezberlenmesin: soru kimliğiyle karıştırılır. Roma rakamlı şıklar
  // ("anlamı bozan cümle") sırasında kalır.
  const sira = useMemo(
    () =>
      a.secenekler.every((s) => /^[IVX]+$/.test(s))
        ? a.secenekler.map((_, i) => i)
        : karistir(
            a.secenekler.map((_, i) => i),
            a.id,
          ),
    [a],
  );
  return (
    <div className="flex flex-col gap-4">
      <Baslik gorsel={a.gorsel}>
        {a.tur === 'bosluk' ? 'Boşluğu doldur' : 'Doğru seçeneği bul'}
      </Baslik>
      {a.metin && (
        <div className="bg-elevated text-body rounded-2xl p-4 text-[15px] leading-relaxed whitespace-pre-line">
          {a.metin}
        </div>
      )}
      <p className="text-primary text-lg leading-relaxed">
        {parcalar.map((p, i) => (
          <span key={i}>
            {p}
            {i < parcalar.length - 1 && (
              <span className="border-accent text-accent mx-1 inline-block min-w-16 border-b-2 text-center font-semibold">
                {secim !== null ? a.secenekler[secim] : ' '}
              </span>
            )}
          </span>
        ))}
      </p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Seçenekler">
        {sira.map((i, gosterim) => {
          const s = a.secenekler[i]!;
          const dogruMu = kilitli && i === a.dogru;
          const yanlisMi = kilitli && i === secim && i !== a.dogru;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={secim === i}
              disabled={kilitli}
              onClick={() => setSecim(i)}
              className={cn(
                'focus-ring rounded-2xl border-2 px-4 py-3 text-left text-[15px] transition-colors',
                secim === i && !kilitli
                  ? 'border-accent bg-accent/10 text-primary'
                  : 'border-line bg-surface text-body',
                dogruMu && 'border-success bg-success/10 text-primary',
                yanlisMi && 'border-danger bg-danger/10 text-primary',
              )}
            >
              {a.secenekler.length === 5 && (
                <span className="text-muted mr-2 font-semibold">{'ABCDE'[gosterim]})</span>
              )}
              {s}
            </button>
          );
        })}
      </div>
      <KontrolDugmesi
        kilitli={kilitli}
        hazir={secim !== null}
        onClick={() =>
          secim !== null && onCevap({ dogru: secim === a.dogru, dogruCevap: a.secenekler[a.dogru] })
        }
      />
    </div>
  );
}

/** Dinle ve kelimeleri sıraya diz. */
export function DinleSoru({ a, kilitli, onCevap }: Ortak & { a: DinleAlistirma }) {
  const kutular = useMemo(
    () =>
      karistir(
        [...kelimeler(a.cumle), ...a.celdiriciler].map((k, i) => ({ k, i })),
        a.id,
      ),
    [a],
  );
  const [secilen, setSecilen] = useState<number[]>([]);
  const sesYok = !okumaVarMi();
  return (
    <div className="flex flex-col gap-4">
      <Baslik gorsel={a.gorsel}>Duyduğunu yaz</Baslik>
      <DinleDugmeleri cumle={a.cumle} otomatik />
      {sesYok && (
        <p className="text-muted text-sm">
          Bu cihazda sesli okuma yok. Anlamından kur:{' '}
          <span className="text-primary">{a.anlam}</span>
        </p>
      )}
      <div
        role="group"
        aria-label="Cevabın"
        className="border-line flex min-h-24 flex-wrap content-start gap-2 border-b-2 pb-3"
      >
        {secilen.map((i) => (
          <button
            key={i}
            type="button"
            disabled={kilitli}
            onClick={() => setSecilen(secilen.filter((s) => s !== i))}
            className="focus-ring bg-surface border-line text-primary ing-belir rounded-xl border-2 px-3 py-2 text-[15px] shadow-sm"
          >
            {kutular.find((x) => x.i === i)!.k}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Kelimeler" className="flex flex-wrap justify-center gap-2">
        {kutular.map(({ k, i }) => {
          const kullanildi = secilen.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={kilitli || kullanildi}
              onClick={() => setSecilen([...secilen, i])}
              className={cn(
                'focus-ring rounded-xl border-2 px-3 py-2 text-[15px] transition-opacity',
                kullanildi
                  ? 'border-line bg-elevated text-transparent'
                  : 'border-line bg-surface text-primary shadow-sm',
              )}
            >
              {k}
            </button>
          );
        })}
      </div>
      <KontrolDugmesi
        kilitli={kilitli}
        hazir={secilen.length > 0}
        onClick={() =>
          onCevap({
            dogru: diziKontrol(
              secilen.map((i) => kutular.find((x) => x.i === i)!.k),
              a.cumle,
            ),
            dogruCevap: `${a.cumle}\n${a.anlam}`,
          })
        }
      />
    </div>
  );
}

const DINLEME_HATASI: Record<DinlemeHatasi, string> = {
  izin: 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin ver ya da bu soruyu atla.',
  duyulmadi: 'Ses duyulmadı. Mikrofona yakın, net bir sesle yeniden dene.',
  yok: 'Bu tarayıcı konuşma tanımayı desteklemiyor.',
  diger: 'Dinleme başlatılamadı. Yeniden dene.',
};

/** Sesli söyle. Üç denemede geçemezse yanlış sayılır; mikrofon yoksa atlanır. */
export function KonusSoru({
  a,
  kilitli,
  onCevap,
  onAtla,
}: Ortak & { a: KonusAlistirma; onAtla: () => void }) {
  const [durum, setDurum] = useState<'hazir' | 'dinliyor'>('hazir');
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [eksikler, setEksikler] = useState<string[]>([]);
  const [deneme, setDeneme] = useState(0);
  const iptalRef = useRef<(() => void) | null>(null);
  const destek = tanimaVarMi();

  useEffect(() => () => iptalRef.current?.(), []);

  const baslat = async () => {
    setMesaj(null);
    setDurum('dinliyor');
    const { sonuc, iptal } = dinle();
    iptalRef.current = iptal;
    try {
      const duyulan = await sonuc;
      const k = konusmaKontrol(duyulan, a.cumle);
      if (k.gecti) {
        onCevap({ dogru: true });
      } else if (deneme + 1 >= 3) {
        onCevap({ dogru: false, dogruCevap: a.cumle, tekrarla: false });
      } else {
        setDeneme(deneme + 1);
        setEksikler(k.eksikler);
        setMesaj(`Duyduğum: “${duyulan[0] ?? ''}”. İşaretli kelimelere dikkat edip yeniden dene.`);
      }
    } catch (hata) {
      setMesaj(DINLEME_HATASI[(hata as DinlemeHatasi) ?? 'diger'] ?? DINLEME_HATASI.diger);
    } finally {
      setDurum('hazir');
      iptalRef.current = null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Baslik gorsel={a.gorsel}>Sesli söyle</Baslik>
      <div className="flex items-start gap-3">
        <DinleDugmeleri cumle={a.cumle} />
      </div>
      <p className="text-primary text-xl leading-relaxed font-medium">
        {kelimeler(a.cumle).map((k, i) => (
          <span
            key={i}
            className={cn(
              eksikler.includes(k) && 'text-danger underline decoration-2 underline-offset-4',
            )}
          >
            {k}{' '}
          </span>
        ))}
      </p>
      <p className="text-muted text-sm">{a.anlam}</p>
      {a.ipucu && (
        <p className="bg-elevated text-body rounded-xl px-3 py-2 text-sm">💡 {a.ipucu}</p>
      )}
      {mesaj && <p className="text-warning text-sm">{mesaj}</p>}
      {!kilitli && (
        <div className="flex flex-col items-center gap-3">
          {destek ? (
            <button
              type="button"
              onClick={() => (durum === 'dinliyor' ? iptalRef.current?.() : void baslat())}
              aria-label={durum === 'dinliyor' ? 'Dinlemeyi durdur' : 'Konuşmaya başla'}
              className={cn(
                'focus-ring flex size-20 items-center justify-center rounded-full text-white shadow-[var(--golge-kart)] transition-transform',
                durum === 'dinliyor' ? 'bg-danger scale-110 animate-pulse' : 'bg-accent',
              )}
            >
              <Mic className="size-8" aria-hidden="true" />
            </button>
          ) : (
            <p className="text-muted text-center text-sm">{DINLEME_HATASI.yok}</p>
          )}
          <span className="text-muted text-xs">
            {durum === 'dinliyor' ? 'Dinliyorum…' : destek ? 'Dokun ve cümleyi söyle' : ''}
          </span>
          <button
            type="button"
            onClick={onAtla}
            className="focus-ring text-accent rounded px-2 py-1 text-sm font-medium"
          >
            Şu an konuşamıyorum
          </button>
        </div>
      )}
    </div>
  );
}

/** Türkçeden İngilizceye yaz. */
export function YazSoru({ a, kilitli, onCevap }: Ortak & { a: YazAlistirma }) {
  const [metin, setMetin] = useState('');
  const kontrol = () => {
    const s = yaziKontrol(metin, a.cevaplar);
    if (s.durum === 'dogru') onCevap({ dogru: true });
    else if (s.durum === 'yakin')
      onCevap({ dogru: true, not: `Küçük bir yazım hatası var. Doğrusu: ${s.dogruCevap}` });
    else onCevap({ dogru: false, dogruCevap: s.dogruCevap });
  };
  return (
    <div className="flex flex-col gap-4">
      <Baslik gorsel={a.gorsel}>İngilizceye çevir</Baslik>
      <p className="bg-elevated text-primary rounded-2xl px-4 py-3 text-lg">{a.kaynak}</p>
      <textarea
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!kilitli && metin.trim()) kontrol();
          }
        }}
        disabled={kilitli}
        rows={3}
        lang="en"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="İngilizce yaz"
        aria-label="İngilizce çeviri"
        className="focus-ring border-line bg-surface text-primary rounded-2xl border-2 px-4 py-3 text-[16px]"
      />
      <KontrolDugmesi kilitli={kilitli} hazir={metin.trim().length > 0} onClick={kontrol} />
    </div>
  );
}

/** Eşleştir: yanlış dokunuş zayıf soru sayılır ama soru yeniden sorulmaz. */
export function EslestirSoru({ a, kilitli, onCevap }: Ortak & { a: EslestirAlistirma }) {
  const sol = useMemo(
    () =>
      karistir(
        a.ciftler.map((c) => c[0]),
        `${a.id}-sol`,
      ),
    [a],
  );
  const sag = useMemo(
    () =>
      karistir(
        a.ciftler.map((c) => c[1]),
        `${a.id}-sag`,
      ),
    [a],
  );
  const [secili, setSecili] = useState<{ yan: 'sol' | 'sag'; deger: string } | null>(null);
  const [eslesen, setEslesen] = useState<string[]>([]);
  const [hatali, setHatali] = useState<string[]>([]);
  const hataVar = useRef(false);

  const sec = (yan: 'sol' | 'sag', deger: string) => {
    if (kilitli) return;
    if (!secili || secili.yan === yan) {
      setSecili({ yan, deger });
      return;
    }
    const en = yan === 'sol' ? deger : secili.deger;
    const tr = yan === 'sag' ? deger : secili.deger;
    setSecili(null);
    if (a.ciftler.some((c) => c[0] === en && c[1] === tr)) {
      const yeni = [...eslesen, en];
      setEslesen(yeni);
      if (yeni.length === a.ciftler.length) onCevap({ dogru: !hataVar.current, tekrarla: false });
    } else {
      hataVar.current = true;
      setHatali([en, tr]);
      setTimeout(() => setHatali([]), 600);
    }
  };

  const tamam = (yan: 'sol' | 'sag', d: string) =>
    yan === 'sol'
      ? eslesen.includes(d)
      : a.ciftler.some((c) => c[1] === d && eslesen.includes(c[0]));

  const Kutu = ({ yan, d }: { yan: 'sol' | 'sag'; d: string }) => (
    <button
      type="button"
      disabled={kilitli || tamam(yan, d)}
      onClick={() => sec(yan, d)}
      className={cn(
        'focus-ring min-h-12 rounded-2xl border-2 px-3 py-2 text-[15px] transition-colors',
        tamam(yan, d)
          ? 'border-success/40 bg-success/10 text-muted'
          : hatali.includes(d)
            ? 'border-danger bg-danger/10 text-primary'
            : secili?.yan === yan && secili.deger === d
              ? 'border-accent bg-accent/10 text-primary'
              : 'border-line bg-surface text-primary',
      )}
    >
      {tamam(yan, d) && <Check className="mr-1 inline size-4" aria-hidden="true" />}
      {d}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <Baslik>Eşleştir</Baslik>
      <div className="grid grid-cols-2 gap-2">
        <div role="group" aria-label="İngilizce" className="flex flex-col gap-2">
          {sol.map((d) => (
            <Kutu key={d} yan="sol" d={d} />
          ))}
        </div>
        <div role="group" aria-label="Türkçe" className="flex flex-col gap-2">
          {sag.map((d) => (
            <Kutu key={d} yan="sag" d={d} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SonucIsareti({ dogru }: { dogru: boolean }) {
  return dogru ? (
    <Check className="size-5" aria-hidden="true" />
  ) : (
    <X className="size-5" aria-hidden="true" />
  );
}
