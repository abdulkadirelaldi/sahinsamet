'use client';

import {
  CheckCircle2,
  ChevronLeft,
  Droplet,
  Moon,
  Plus,
  Scale,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useGeriTusuylaKapat } from '@/components/panel/geri-tusu';
import { useOdakTuzagi } from '@/components/panel/odak-tuzagi';

import { tutarOku } from '@/components/panel/cuzdan-bicim';
import { gunAy } from '@/components/panel/hayat-bicim';
import { paraBicim } from '@/components/panel/para-bicim';
import { istanbulGunu, kuyrugaEkle, type KuyrukTuru } from '@/components/panel/hizli-kuyruk';
import { HARCAMA_KATEGORILERI } from '@/lib/harcama-kategorileri';
import { cn } from '@/lib/utils/cn';
import {
  hizliHarcamaAction,
  hizliKiloAction,
  hizliHesaplarAction,
  hizliSuAction,
  hizliUykuAction,
  sonKiloAction,
  suGeriAlAction,
} from '@/server/actions/hizli-ekle';

/**
 * HIZLI EKLEME (2026-10-30) — her panel ekranında, alt sekme çubuğunun
 * üstünde "+". Telefonda en sık üç iş tek dokunuşla: harcama, kilo, su.
 * Alttan açılan sayfa (iOS "sheet"); ESC, dışına dokunmak ya da Android'in geri
 * jesti kapatır.
 */

type Gorunum = 'menu' | 'harcama' | 'kilo' | 'su' | 'uyku';

export function HizliEkle() {
  const router = useRouter();
  const pathname = usePathname();
  const [acik, setAcik] = useState(false);
  const [gorunum, setGorunum] = useState<Gorunum>('menu');
  const [basari, setBasari] = useState<string | null>(null);
  const [geriAl, setGeriAl] = useState<(() => Promise<void>) | null>(null);

  const kapanisZamani = useRef<number | null>(null);
  const pencere = useRef<HTMLDivElement>(null);
  useOdakTuzagi(acik, pencere, () => kapat());
  useGeriTusuylaKapat(acik, () => kapat());
  const kapat = () => {
    // Eski zamanlayıcı yeniden açılan pencereyi ve yazılan değeri kapatmasın.
    if (kapanisZamani.current !== null) window.clearTimeout(kapanisZamani.current);
    kapanisZamani.current = null;
    setAcik(false);
    setGorunum('menu');
    setBasari(null);
  };

  useEffect(() => {
    if (!acik) return;
    const tus = (e: KeyboardEvent) => e.key === 'Escape' && kapat();
    document.addEventListener('keydown', tus);
    const onceki = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tus);
      document.body.style.overflow = onceki;
    };
  }, [acik]);

  /*
   * Aşağı kaydırırken gizlenir, yukarı kaydırınca döner: düğme satırların sağındaki
   * tutarların üstüne biniyordu. `passive` + rAF: kaydırmayı yavaşlatmaz; 8 px altı
   * titreşim sayılmaz. Sayfanın başında ve sonunda hep görünür.
   */
  /*
   * Kısayol adresi (2026-11-01): `/panel?ekle=harcama|su|kilo` sayfayı doğrudan açar.
   * Manifest kısayolları (Android, masaüstü) ve iPhone Kısayollar bunu kullanır.
   * Parametre sonra adresten silinir: yenilemede yeniden açılmasın.
   */
  useEffect(() => {
    const url = new URL(window.location.href);
    const ekle = url.searchParams.get('ekle');
    if (ekle !== 'harcama' && ekle !== 'su' && ekle !== 'kilo' && ekle !== 'uyku') return;
    setGorunum(ekle);
    setAcik(true);
    url.searchParams.delete('ekle');
    window.history.replaceState(window.history.state, '', url);
  }, []);

  const [gizli, setGizli] = useState(false);
  useEffect(() => {
    let onceki = window.scrollY;
    let bekliyor = false;
    const kaydir = () => {
      if (bekliyor) return;
      bekliyor = true;
      requestAnimationFrame(() => {
        bekliyor = false;
        const y = window.scrollY;
        const sonda = y + window.innerHeight >= document.documentElement.scrollHeight - 8;
        if (y < 40 || sonda) setGizli(false);
        else if (Math.abs(y - onceki) >= 8) setGizli(y > onceki);
        if (Math.abs(y - onceki) >= 8) onceki = y;
      });
    };
    window.addEventListener('scroll', kaydir, { passive: true });
    return () => window.removeEventListener('scroll', kaydir);
  }, []);

  /*
   * `yenile: false` — kuyruğa alınan kayıt: bağlantı yokken `router.refresh()`
   * sayfayı tam yeniden yükletir ve kullanıcı "Bağlantı yok" ekranına düşerdi
   * (e2e ile yakalandı).
   */
  const tamam = (mesaj: string, yenile = true, geriAl?: () => Promise<void>) => {
    setBasari(mesaj);
    setGeriAl(geriAl ? () => geriAl : null);
    if (yenile) router.refresh();
    // Geri alınabiliyorsa düğmeye dokunacak kadar açık kalır.
    kapanisZamani.current = window.setTimeout(kapat, geriAl ? 3500 : 1100);
  };

  // Ders odak ekranı: düğme geri bildirim panelinin üstüne biniyordu.
  if (pathname.startsWith('/panel/ingilizce/ders/')) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        aria-label="Hızlı kayıt"
        aria-haspopup="dialog"
        data-yazdirmada-gizle
        className={cn(
          'focus-ring bg-gradient-accent ease-brand fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-40 flex size-14 items-center justify-center rounded-full text-white shadow-[0_10px_28px_-8px_var(--accent-glow)] transition-[transform,opacity] duration-200 active:scale-90 lg:right-8 lg:bottom-8',
          gizli && 'pointer-events-none translate-y-6 opacity-0',
        )}
        tabIndex={gizli ? -1 : undefined}
      >
        <Plus className="size-7" aria-hidden="true" />
      </button>

      {acik && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
          <button
            type="button"
            aria-label="Kapat"
            tabIndex={-1}
            onClick={kapat}
            className="hizli-ortu absolute inset-0 bg-black/40"
          />
          <div
            ref={pencere}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hizli-baslik"
            className="hizli-sayfa bg-surface relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl lg:rounded-[1.75rem] lg:pb-5"
          >
            <span
              aria-hidden="true"
              className="bg-line mx-auto mb-4 block h-1.5 w-10 rounded-full lg:hidden"
            />
            <div className="mb-4 flex items-center gap-2">
              {gorunum !== 'menu' && !basari && (
                <button
                  type="button"
                  onClick={() => setGorunum('menu')}
                  aria-label="Geri"
                  className="focus-ring text-muted hover:text-primary -ml-2 flex size-11 items-center justify-center rounded-full"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
              )}
              <h2 id="hizli-baslik" className="text-primary flex-1 text-lg">
                {BASLIK[gorunum]}
              </h2>
              <button
                type="button"
                onClick={kapat}
                aria-label="Kapat"
                className="focus-ring bg-elevated text-muted hover:text-primary flex size-11 items-center justify-center rounded-full"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {basari ? (
              <p
                role="status"
                className="text-success flex flex-col items-center gap-2 py-6 text-center font-medium"
              >
                <CheckCircle2 className="size-10" aria-hidden="true" />
                {basari}
                {geriAl && (
                  <button
                    type="button"
                    onClick={() => {
                      const is = geriAl;
                      setGeriAl(null);
                      setBasari('Geri alınıyor…');
                      // Sonuç söylenmeden "geri alındı" denmez; kapanış da sonucu bekler.
                      if (kapanisZamani.current !== null) {
                        window.clearTimeout(kapanisZamani.current);
                      }
                      void is()
                        .then(() => setBasari('Geri alındı'))
                        .catch(() => setBasari('Geri alınamadı, su kaydı duruyor'))
                        .finally(() => {
                          kapanisZamani.current = window.setTimeout(kapat, 1500);
                        });
                    }}
                    className="focus-ring bg-elevated text-body mt-1 min-h-11 rounded-full px-5 text-sm font-medium"
                  >
                    Geri al
                  </button>
                )}
              </p>
            ) : gorunum === 'menu' ? (
              <div className="grid grid-cols-2 gap-3">
                <Kutu
                  ikon={Wallet}
                  renk="from-emerald-500 to-teal-500"
                  onClick={() => setGorunum('harcama')}
                >
                  Harcama
                </Kutu>
                <Kutu
                  ikon={Scale}
                  renk="from-rose-500 to-pink-500"
                  onClick={() => setGorunum('kilo')}
                >
                  Kilo
                </Kutu>
                <Kutu
                  ikon={Droplet}
                  renk="from-sky-500 to-blue-600"
                  onClick={() => setGorunum('su')}
                >
                  Su
                </Kutu>
                <Kutu
                  ikon={Moon}
                  renk="from-indigo-500 to-violet-600"
                  onClick={() => setGorunum('uyku')}
                >
                  Uyku
                </Kutu>
                <Link
                  href="/panel/hayat"
                  // Sayfanın eklediği geçmiş kaydının yerine yazılır (`useGeriTusuylaKapat`).
                  replace
                  onClick={kapat}
                  className="focus-ring bg-elevated text-body col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl text-sm font-medium"
                >
                  <Sparkles className="text-accent size-4" aria-hidden="true" />
                  Bugünün alışkanlıklarını işaretle
                </Link>
              </div>
            ) : gorunum === 'harcama' ? (
              <HarcamaFormu tamam={tamam} />
            ) : gorunum === 'kilo' ? (
              <KiloFormu tamam={tamam} />
            ) : gorunum === 'uyku' ? (
              <UykuFormu tamam={tamam} />
            ) : (
              <SuFormu tamam={tamam} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

const BASLIK: Record<Gorunum, string> = {
  menu: 'Hızlı ekle',
  harcama: 'Harcama',
  kilo: 'Bugünkü kilo',
  su: 'Su içtim',
  uyku: 'Dün geceki uyku',
};

function Kutu({
  ikon: Ikon,
  renk,
  onClick,
  children,
}: {
  ikon: typeof Wallet;
  renk: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring bg-elevated text-primary flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-sm font-medium transition-transform active:scale-95"
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-[0.9rem] bg-linear-to-br text-white shadow-sm',
          renk,
        )}
      >
        <Ikon className="size-5" aria-hidden="true" />
      </span>
      {children}
    </button>
  );
}

/** Ağ hatası: kayıt kaybolmasın — cihazda bekler. Cihaza da yazılamazsa form açık kalır. */
function kuyrugaAl(
  tur: KuyrukTuru,
  girdi: Record<string, unknown>,
  tamam: (mesaj: string, yenile?: boolean) => void,
  setHata: (mesaj: string) => void,
) {
  // Hata bağlantıdan olmayabilir (sunucu 500, yayın sonrası eski sayfa): mesaj durumu söylesin.
  const sebep = navigator.onLine ? 'Sunucuya ulaşılamadı' : 'Bağlantı yok';
  if (kuyrugaEkle(tur, girdi)) {
    tamam(
      navigator.onLine
        ? 'Sunucuya ulaşılamadı — sonra yeniden denenecek'
        : 'Bağlantı yok — gelince kaydedilecek',
      false,
    );
  } else setHata(`${sebep} ve cihaza da yazılamadı. Kayıt alınmadı, yeniden dene.`);
}

const SON_KATEGORI = 'sahinsamet-son-kategori';
const SON_HESAP = 'sahinsamet-son-hesap';

function sonHesap(): string {
  try {
    return localStorage.getItem(SON_HESAP) ?? '';
  } catch {
    return '';
  }
}

function sonKategori(): (typeof HARCAMA_KATEGORILERI)[number] {
  try {
    const k = localStorage.getItem(SON_KATEGORI);
    return HARCAMA_KATEGORILERI.find((v) => v === k) ?? 'Market';
  } catch {
    return 'Market';
  }
}

/** Takvim gününden bir önceki gün. SAF. */
function birGunOnce(gun: string): string {
  const t = new Date(`${gun}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}

const GIRDI =
  'focus-ring rounded-input border-line-strong bg-elevated text-primary placeholder:text-muted h-12 w-full border px-4';

function Gonder({ bekliyor, children }: { bekliyor: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={bekliyor}
      className="focus-ring rounded-btn bg-gradient-accent min-h-12 w-full font-medium text-white active:opacity-80 disabled:opacity-60"
    >
      {bekliyor ? 'Kaydediliyor…' : children}
    </button>
  );
}

function Hata({ metin }: { metin: string | null }) {
  return metin ? (
    <p role="alert" className="text-danger text-sm">
      {metin}
    </p>
  ) : null;
}

function HarcamaFormu({ tamam }: { tamam: (m: string, yenile?: boolean) => void }) {
  const tutarRef = useRef<HTMLInputElement>(null);
  const [kategori, setKategori] = useState(sonKategori);
  const [dun, setDun] = useState(false);
  const [hesaplar, setHesaplar] = useState<{ id: string; ad: string; bakiye: string }[]>([]);
  const [hesapId, setHesapId] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => tutarRef.current?.focus(), []);
  useEffect(() => {
    // Yalnızca seçim: alınamazsa harcama hesapsız kaydedilir.
    hizliHesaplarAction()
      .then((sonuc) => {
        if (!sonuc.ok) return;
        setHesaplar(sonuc.data);
        const son = sonHesap();
        if (sonuc.data.some((h) => h.id === son)) setHesapId(son);
      })
      .catch(() => undefined);
  }, []);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const tutar = tutarOku(String(f.get('tutar') ?? ''));
        if (!tutar || Number(tutar) <= 0)
          return setHata('Tutar geçersiz — örn. 250 ya da 1.250,50');
        const ne = String(f.get('ne') ?? '').trim() || kategori;
        setBekliyor(true);
        setHata(null);
        const bugun = istanbulGunu();
        const girdi = {
          tutar,
          ne,
          kategori,
          gun: dun ? birGunOnce(bugun) : bugun,
          anahtar: crypto.randomUUID(),
          ...(hesapId ? { hesapId } : {}),
        };
        try {
          localStorage.setItem(SON_KATEGORI, kategori);
          localStorage.setItem(SON_HESAP, hesapId);
        } catch {
          // Hatırlanamazsa kayıt yine yapılır.
        }
        try {
          const sonuc = await hizliHarcamaAction(girdi);
          if (sonuc.ok) tamam(dun ? 'Dünkü harcama eklendi' : 'Harcama eklendi');
          else setHata(sonuc.error.message);
        } catch {
          kuyrugaAl('harcama', girdi, tamam, setHata);
        } finally {
          setBekliyor(false);
        }
      }}
    >
      <label className="sr-only" htmlFor="hizli-tutar">
        Tutar (₺)
      </label>
      <div className="relative">
        <input
          ref={tutarRef}
          id="hizli-tutar"
          name="tutar"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          className={cn(GIRDI, 'tabular h-16 pr-10 text-3xl font-semibold tracking-tight')}
        />
        <span className="text-muted absolute top-1/2 right-4 -translate-y-1/2 text-xl">₺</span>
      </div>
      <label className="sr-only" htmlFor="hizli-ne">
        Ne için
      </label>
      <input id="hizli-ne" name="ne" placeholder="Ne için? (isteğe bağlı)" className={GIRDI} />
      <div role="radiogroup" aria-label="Kategori" className="flex flex-wrap gap-2">
        {HARCAMA_KATEGORILERI.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kategori === k}
            onClick={() => setKategori(k)}
            className={cn(
              'focus-ring min-h-10 rounded-full border px-3 text-sm transition-colors',
              kategori === k
                ? 'border-accent bg-accent/12 text-accent'
                : 'border-line bg-elevated text-body',
            )}
          >
            {k}
          </button>
        ))}
      </div>
      {hesaplar.length > 0 && (
        <select
          aria-label="Düşülecek hesap"
          value={hesapId}
          onChange={(e) => setHesapId(e.target.value)}
          className={GIRDI}
        >
          <option value="">Hesaptan düşme</option>
          {hesaplar.map((h) => (
            <option key={h.id} value={h.id}>
              {h.ad} · {paraBicim(h.bakiye, 'TRY')}
            </option>
          ))}
        </select>
      )}
      <label className="text-body flex min-h-10 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={dun}
          onChange={(e) => setDun(e.target.checked)}
          className="accent-accent size-5"
        />
        Dünün harcaması
      </label>
      <Hata metin={hata} />
      <Gonder bekliyor={bekliyor}>Ekle</Gonder>
    </form>
  );
}

function KiloFormu({ tamam }: { tamam: (m: string, yenile?: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [son, setSon] = useState<{ kg: string; gun: string; bugun: boolean } | null>(null);

  useEffect(() => ref.current?.focus(), []);
  useEffect(() => {
    // Yalnızca bilgi: alınamazsa form yine çalışır.
    sonKiloAction()
      .then((sonuc) => {
        if (sonuc.ok) setSon(sonuc.data);
      })
      .catch(() => undefined);
  }, []);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const kg = String(new FormData(e.currentTarget).get('kg') ?? '')
          .trim()
          .replace(',', '.');
        if (!/^\d{2,3}(\.\d{1,2})?$/.test(kg) || Number(kg) < 30 || Number(kg) > 250) {
          return setHata('Kilo geçersiz — örn. 82,5');
        }
        setBekliyor(true);
        setHata(null);
        const girdi = { kg, gun: istanbulGunu(), anahtar: crypto.randomUUID() };
        try {
          const sonuc = await hizliKiloAction(girdi);
          if (sonuc.ok) tamam(`${kg.replace('.', ',')} kg kaydedildi`);
          else setHata(sonuc.error.message);
        } catch {
          kuyrugaAl('kilo', girdi, tamam, setHata);
        } finally {
          setBekliyor(false);
        }
      }}
    >
      <label className="sr-only" htmlFor="hizli-kg">
        Kilo (kg)
      </label>
      <div className="relative">
        <input
          ref={ref}
          id="hizli-kg"
          name="kg"
          inputMode="decimal"
          autoComplete="off"
          placeholder="82,5"
          className={cn(GIRDI, 'tabular h-16 pr-12 text-3xl font-semibold tracking-tight')}
        />
        <span className="text-muted absolute top-1/2 right-4 -translate-y-1/2 text-xl">kg</span>
      </div>
      {son && (
        <p className={cn('tabular text-sm', son.bugun ? 'text-warning' : 'text-muted')}>
          {son.bugun
            ? `Bugünkü ${son.kg.replace('.', ',')} kg kaydı değişecek.`
            : `Son tartı: ${son.kg.replace('.', ',')} kg · ${gunAy(son.gun)}`}
        </p>
      )}
      <Hata metin={hata} />
      <Gonder bekliyor={bekliyor}>Kaydet</Gonder>
    </form>
  );
}

/** Geri alma: kayıt sunucuya ulaştıysa çıkarılır; sonuç sayfayı yeniler. */
async function suyuGeriAl(ml: number, gun: string, yenile: () => void): Promise<void> {
  try {
    const sonuc = await suGeriAlAction({ ml, gun });
    if (!sonuc.ok) throw new Error(sonuc.error.message);
  } finally {
    yenile();
  }
}

const SU_SECENEKLERI = [
  { ml: 250, etiket: '1 bardak' },
  { ml: 330, etiket: 'Kutu' },
  { ml: 500, etiket: 'Küçük şişe' },
  { ml: 750, etiket: 'Büyük şişe' },
] as const;

function SuFormu({
  tamam,
}: {
  tamam: (m: string, yenile?: boolean, geriAl?: () => Promise<void>) => void;
}) {
  const router = useRouter();
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const ekle = async (ml: number) => {
    setBekliyor(true);
    setHata(null);
    const gun = istanbulGunu();
    const girdi = { ml, gun, anahtar: crypto.randomUUID() };
    try {
      const sonuc = await hizliSuAction(girdi);
      if (sonuc.ok) {
        const toplam = ((sonuc.data.waterMl ?? 0) / 1000).toLocaleString('tr-TR');
        tamam(`+${ml} ml · bugün ${toplam} L`, true, () =>
          suyuGeriAl(ml, gun, () => router.refresh()),
        );
      } else setHata(sonuc.error.message);
    } catch {
      kuyrugaAl('su', girdi, tamam, setHata);
    } finally {
      setBekliyor(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {SU_SECENEKLERI.map(({ ml, etiket }) => (
          <button
            key={ml}
            type="button"
            disabled={bekliyor}
            onClick={() => void ekle(ml)}
            className="focus-ring bg-elevated text-primary flex flex-col items-center gap-1 rounded-2xl py-4 transition-transform active:scale-95 disabled:opacity-60"
          >
            <Droplet className="size-6 text-sky-500" aria-hidden="true" />
            <span className="tabular text-xl font-semibold">+{ml} ml</span>
            <span className="text-muted text-xs">{etiket}</span>
          </button>
        ))}
      </div>
      <Hata metin={hata} />
    </div>
  );
}

function UykuFormu({ tamam }: { tamam: (m: string, yenile?: boolean) => void }) {
  const [saat, setSaat] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async (metin: string) => {
    const deger = metin.trim().replace(',', '.');
    if (!/^\d{1,2}(\.\d)?$/.test(deger) || Number(deger) < 1 || Number(deger) > 16) {
      return setHata('Uyku geçersiz — örn. 7,5');
    }
    setBekliyor(true);
    setHata(null);
    const girdi = { saat: deger, gun: istanbulGunu(), anahtar: crypto.randomUUID() };
    try {
      const sonuc = await hizliUykuAction(girdi);
      if (sonuc.ok) tamam(`${deger.replace('.', ',')} saat kaydedildi`);
      else setHata(sonuc.error.message);
    } catch {
      kuyrugaAl('uyku', girdi, tamam, setHata);
    } finally {
      setBekliyor(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void kaydet(saat);
      }}
    >
      <div className="grid grid-cols-4 gap-2">
        {['6', '7', '8', '9'].map((s) => (
          <button
            key={s}
            type="button"
            disabled={bekliyor}
            onClick={() => void kaydet(s)}
            className="focus-ring bg-elevated text-primary tabular min-h-12 rounded-2xl font-semibold disabled:opacity-60"
          >
            {s} sa
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="hizli-uyku">
        Uyku (saat)
      </label>
      <input
        id="hizli-uyku"
        value={saat}
        onChange={(e) => setSaat(e.target.value)}
        inputMode="decimal"
        autoComplete="off"
        placeholder="Başka: 7,5"
        className={GIRDI}
      />
      <Hata metin={hata} />
      <Gonder bekliyor={bekliyor}>Kaydet</Gonder>
    </form>
  );
}

/** Bugün ekranında tek dokunuşla su: bağlantı yoksa kuyruğa düşer. */
export function SuHizliDugmesi() {
  const router = useRouter();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  const ekle = async () => {
    setBekliyor(true);
    setMesaj(null);
    const girdi = { ml: 250, gun: istanbulGunu(), anahtar: crypto.randomUUID() };
    try {
      const sonuc = await hizliSuAction(girdi);
      if (sonuc.ok) router.refresh();
      else setMesaj(sonuc.error.message);
    } catch {
      setMesaj(
        kuyrugaEkle('su', girdi)
          ? 'Bağlantı yok — gelince eklenecek'
          : 'Kaydedilemedi, yeniden dene',
      );
    } finally {
      setBekliyor(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={bekliyor}
        onClick={() => void ekle()}
        className="su-hizli focus-ring tabular min-h-10 self-start rounded-full px-3.5 text-sm font-medium transition-transform active:scale-95 disabled:opacity-60"
      >
        {bekliyor ? 'Ekleniyor…' : '+250 ml su'}
      </button>
      {mesaj && (
        <span role="status" className="text-muted text-xs">
          {mesaj}
        </span>
      )}
    </div>
  );
}
