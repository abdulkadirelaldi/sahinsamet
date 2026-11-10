'use client';

import {
  Bell,
  BellOff,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  Droplet,
  Flame,
  Loader2,
  Sparkles,
  Trophy,
  Wallet,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { litreBicim } from '@/lib/hedefler';
import { cn } from '@/lib/utils/cn';
import {
  bildirimAboneOlAction,
  bildirimAyrilAction,
  bildirimTercihAction,
  testBildirimiAction,
} from '@/server/actions/bildirim';

type Tercih = {
  borc: boolean;
  aliskanlik: boolean;
  su: boolean;
  rekor: boolean;
  haftalik: boolean;
  aylik: boolean;
  ingilizce: boolean;
  takvim: boolean;
  suHedefMl: number;
  suSaatleri: number[];
  aliskanlikSaati: number;
};
type Destek = 'kontrol' | 'yok' | 'anaEkran' | 'var';

const SU_HEDEFLERI = [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];
const SU_SAAT_SECENEKLERI = Array.from({ length: 16 }, (_, i) => i + 7); // 07–22
const ALISKANLIK_SAATLERI = [18, 19, 20, 21, 22, 23];
const EN_COK_SU_SAATI = 6;

const saatBicim = (s: number) => `${String(s).padStart(2, '0')}:00`;

/** VAPID genel anahtarı (base64url) → `applicationServerKey`. */
function anahtar(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const ham = atob(b64);
  const dizi = new Uint8Array(new ArrayBuffer(ham.length));
  for (let i = 0; i < ham.length; i++) dizi[i] = ham.charCodeAt(i);
  return dizi;
}

function cihazAdi(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  return 'Tarayıcı';
}

/**
 * BİLDİRİM AYARLARI (2026-10-30). iPhone'da push YALNIZCA ana ekrana eklenmiş
 * uygulamada (iOS 16.4+) çalışır; Safari sekmesinde açıldıysa ekran bunu
 * söyler. İzin isteği bir dokunuşla başlar — iOS kendiliğinden sormaya izin
 * vermez.
 */
export function BildirimAyarlari({
  vapidAnahtari,
  tercih: ilkTercih,
}: {
  vapidAnahtari: string | null;
  tercih: Tercih;
}) {
  const [destek, setDestek] = useState<Destek>('kontrol');
  const [abone, setAbone] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [tercih, setTercih] = useState(ilkTercih);
  const [mesaj, setMesaj] = useState<{ ton: 'ok' | 'hata'; metin: string } | null>(null);

  useEffect(() => {
    const iOS = /iPhone|iPad/.test(navigator.userAgent);
    const anaEkranda =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setDestek(iOS && !anaEkranda ? 'anaEkran' : 'yok');
      return;
    }
    setDestek('var');
    void navigator.serviceWorker
      .getRegistration('/')
      .then((k) => k?.pushManager.getSubscription())
      .then((s) => setAbone(!!s));
  }, []);

  const ac = async () => {
    if (!vapidAnahtari) return;
    setBekliyor(true);
    setMesaj(null);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== 'granted') {
        setMesaj({
          ton: 'hata',
          metin: 'İzin verilmedi. Ayarlar → Bildirimler → SŞ Panel’den açabilirsin.',
        });
        return;
      }
      const kayit = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const abonelik =
        (await kayit.pushManager.getSubscription()) ??
        (await kayit.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: anahtar(vapidAnahtari),
        }));
      const json = abonelik.toJSON();
      const sonuc = await bildirimAboneOlAction({
        endpoint: json.endpoint,
        keys: json.keys,
        cihaz: cihazAdi(),
      });
      if (sonuc.ok) {
        setAbone(true);
        setMesaj({ ton: 'ok', metin: 'Bildirimler açıldı.' });
      } else setMesaj({ ton: 'hata', metin: sonuc.error.message });
    } catch {
      setMesaj({ ton: 'hata', metin: 'Bildirimler açılamadı. Yeniden dene.' });
    } finally {
      setBekliyor(false);
    }
  };

  const kapat = async () => {
    setBekliyor(true);
    setMesaj(null);
    try {
      const kayit = await navigator.serviceWorker.getRegistration('/');
      const abonelik = await kayit?.pushManager.getSubscription();
      if (abonelik) {
        await bildirimAyrilAction({ endpoint: abonelik.endpoint });
        await abonelik.unsubscribe();
      }
      setAbone(false);
      setMesaj({ ton: 'ok', metin: 'Bu cihazda bildirimler kapandı.' });
    } finally {
      setBekliyor(false);
    }
  };

  const kaydet = async (yeni: Tercih) => {
    const onceki = tercih;
    setTercih(yeni);
    try {
      const sonuc = await bildirimTercihAction(yeni);
      if (!sonuc.ok) {
        setTercih(onceki);
        setMesaj({ ton: 'hata', metin: sonuc.error.message });
      }
    } catch {
      setTercih(onceki);
      setMesaj({ ton: 'hata', metin: 'Bağlantı kurulamadı. Yeniden dene.' });
    }
  };

  const degistir = (
    alan: 'borc' | 'aliskanlik' | 'su' | 'rekor' | 'haftalik' | 'aylik' | 'ingilizce' | 'takvim',
  ) => kaydet({ ...tercih, [alan]: !tercih[alan] });

  const suSaatiDegistir = (saat: number) => {
    const secili = tercih.suSaatleri.includes(saat);
    void kaydet({
      ...tercih,
      suSaatleri: secili
        ? tercih.suSaatleri.filter((s) => s !== saat)
        : [...tercih.suSaatleri, saat].sort((a, b) => a - b),
    });
  };

  const test = async () => {
    setMesaj(null);
    const sonuc = await testBildirimiAction();
    setMesaj(
      sonuc.ok
        ? { ton: 'ok', metin: 'Test bildirimi gönderildi — birkaç saniye içinde gelir.' }
        : { ton: 'hata', metin: sonuc.error.message },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-card border-line bg-surface flex flex-col gap-4 border p-5">
        <div className="flex items-start gap-3">
          <span className="bg-accent/12 text-accent flex size-10 shrink-0 items-center justify-center rounded-xl">
            {abone ? (
              <Bell className="size-5" aria-hidden="true" />
            ) : (
              <BellOff className="size-5" aria-hidden="true" />
            )}
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-base">
              {abone ? 'Bu cihazda açık' : 'Bildirimler kapalı'}
            </h2>
            <p className="text-muted text-sm">
              Ödeme günleri, kalan alışkanlıklar ve su hatırlatmaları telefonuna gelir.
            </p>
          </div>
        </div>

        {!vapidAnahtari ? (
          <p className="text-warning text-sm">Bildirim anahtarları sunucuda henüz tanımlı değil.</p>
        ) : destek === 'anaEkran' ? (
          <p className="rounded-input bg-elevated text-body p-3 text-sm">
            iPhone’da bildirim için paneli <strong>ana ekrana ekle</strong> ve oradan aç: Safari’de
            Paylaş → “Ana Ekrana Ekle”.
          </p>
        ) : destek === 'yok' ? (
          <p className="text-muted text-sm">Bu tarayıcı bildirimleri desteklemiyor.</p>
        ) : destek === 'var' ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={bekliyor}
              onClick={() => void (abone ? kapat() : ac())}
              className={cn(
                'focus-ring rounded-btn flex min-h-12 flex-1 items-center justify-center gap-2 px-4 font-medium disabled:opacity-60',
                abone ? 'bg-elevated text-primary' : 'bg-gradient-accent text-white',
              )}
            >
              {bekliyor && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {abone ? 'Bu cihazda kapat' : 'Bildirimleri aç'}
            </button>
            {abone && (
              <button
                type="button"
                onClick={() => void test()}
                className="focus-ring rounded-btn border-line text-primary min-h-12 flex-1 border px-4 font-medium"
              >
                Test bildirimi gönder
              </button>
            )}
          </div>
        ) : null}

        <p role="status" className="text-sm">
          {mesaj && (
            <span className={mesaj.ton === 'ok' ? 'text-success' : 'text-danger'}>
              {mesaj.metin}
            </span>
          )}
        </p>
      </section>

      <section aria-label="Bildirim türleri" className="rounded-card border-line bg-surface border">
        <Anahtar
          ikon={<Wallet className="size-4" aria-hidden="true" />}
          renk="from-emerald-500 to-teal-500"
          baslik="Ödeme günleri"
          aciklama="2 gün önce ve ödeme günü, 09:00"
          acik={tercih.borc}
          onClick={() => void degistir('borc')}
        />
        <Anahtar
          ikon={<Sparkles className="size-4" aria-hidden="true" />}
          renk="from-violet-500 to-purple-500"
          baslik="Kalan alışkanlıklar"
          aciklama={`${saatBicim(tercih.aliskanlikSaati)}, işaretlenmemiş varsa`}
          acik={tercih.aliskanlik}
          onClick={() => void degistir('aliskanlik')}
        />
        <Anahtar
          ikon={<Droplet className="size-4" aria-hidden="true" />}
          renk="from-sky-500 to-blue-600"
          baslik="Su hatırlatması"
          aciklama={`${tercih.suSaatleri.map(saatBicim).join(', ')} — ${litreBicim(tercih.suHedefMl)} L'ye ulaşmadıysan`}
          acik={tercih.su}
          onClick={() => void degistir('su')}
        />
        <Anahtar
          ikon={<Trophy className="size-4" aria-hidden="true" />}
          renk="from-amber-500 to-orange-500"
          baslik="Yeni rekor"
          aciklama="Bir harekette rekorunu geçtiğinde"
          acik={tercih.rekor}
          onClick={() => void degistir('rekor')}
        />
        <Anahtar
          ikon={<ChartColumn className="size-4" aria-hidden="true" />}
          renk="from-indigo-500 to-violet-600"
          baslik="Haftalık özet"
          aciklama="Pazar akşamı 20:00"
          acik={tercih.haftalik}
          onClick={() => void degistir('haftalik')}
        />
        <Anahtar
          ikon={<CalendarDays className="size-4" aria-hidden="true" />}
          renk="from-teal-500 to-emerald-600"
          baslik="Aylık rapor"
          aciklama="Her ayın 1'i 10:00 — önceki ayda ne harcadın, ne yaptın"
          acik={tercih.aylik}
          onClick={() => void degistir('aylik')}
        />
        <Anahtar
          ikon={<Flame className="size-4" aria-hidden="true" />}
          renk="from-amber-500 to-orange-600"
          baslik="İngilizce serisi"
          aciklama="20:00 — seri sürüyor ve bugün ders yapmadıysan"
          acik={tercih.ingilizce}
          onClick={() => void degistir('ingilizce')}
        />
        <Anahtar
          ikon={<CalendarClock className="size-4" aria-hidden="true" />}
          renk="from-sky-500 to-indigo-600"
          baslik="Takvim"
          aciklama="Her etkinliğin kendi hatırlatma saatinde"
          acik={tercih.takvim}
          onClick={() => void degistir('takvim')}
        />
      </section>

      <section
        aria-label="Saatler ve su hedefi"
        className="rounded-card border-line bg-surface flex flex-col gap-4 border p-5"
      >
        <label className="flex items-center justify-between gap-3">
          <span className="text-primary text-sm font-medium">Günlük su hedefi</span>
          <select
            value={tercih.suHedefMl}
            onChange={(e) => void kaydet({ ...tercih, suHedefMl: Number(e.target.value) })}
            className="focus-ring rounded-input border-line-strong bg-elevated text-primary tabular min-h-10 border px-3 text-sm"
          >
            {[...new Set([...SU_HEDEFLERI, tercih.suHedefMl])]
              .sort((a, b) => a - b)
              .map((ml) => (
                <option key={ml} value={ml}>
                  {litreBicim(ml)} L
                </option>
              ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-primary text-sm font-medium">Alışkanlık hatırlatması</span>
          <select
            value={tercih.aliskanlikSaati}
            onChange={(e) => void kaydet({ ...tercih, aliskanlikSaati: Number(e.target.value) })}
            className="focus-ring rounded-input border-line-strong bg-elevated text-primary tabular min-h-10 border px-3 text-sm"
          >
            {[...new Set([...ALISKANLIK_SAATLERI, tercih.aliskanlikSaati])]
              .sort((a, b) => a - b)
              .map((s) => (
                <option key={s} value={s}>
                  {saatBicim(s)}
                </option>
              ))}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-primary text-sm font-medium">Su hatırlatma saatleri</legend>
          <p className="text-muted text-xs">En az 1, en çok {EN_COK_SU_SAATI} saat.</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {SU_SAAT_SECENEKLERI.map((s) => {
              const secili = tercih.suSaatleri.includes(s);
              const kilitli = secili
                ? tercih.suSaatleri.length === 1
                : tercih.suSaatleri.length >= EN_COK_SU_SAATI;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={secili}
                  disabled={kilitli}
                  onClick={() => suSaatiDegistir(s)}
                  className={cn(
                    'focus-ring rounded-btn tabular min-h-10 text-sm font-medium disabled:opacity-50',
                    secili ? 'bg-accent text-white' : 'bg-elevated text-primary',
                  )}
                >
                  {saatBicim(s)}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>
    </div>
  );
}

function Anahtar({
  ikon,
  renk,
  baslik,
  aciklama,
  acik,
  onClick,
}: {
  ikon: ReactNode;
  renk: string;
  baslik: string;
  aciklama: string;
  acik: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={acik}
      onClick={onClick}
      className="focus-ring border-line flex w-full items-center gap-3 border-b p-4 text-left last:border-b-0"
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-[0.6rem] bg-linear-to-br text-white',
          renk,
        )}
      >
        {ikon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-primary text-sm font-medium">{baslik}</span>
        <span className="text-muted text-xs">{aciklama}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          acik ? 'bg-success' : 'bg-line-hover',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform',
            acik ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}
