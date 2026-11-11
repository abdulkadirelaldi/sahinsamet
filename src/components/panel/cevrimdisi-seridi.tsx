'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { kurulumIstemiDinle } from '@/components/panel/kurulum-istemi';
import {
  kayitOzeti,
  KUYRUK_OLAYI,
  kuyruguIsle,
  kuyruguOku,
  kuyruguYaz,
  reddedilenleriOku,
  reddedilenleriYaz,
  type GonderimSonucu,
  type KuyrukKaydi,
} from '@/components/panel/hizli-kuyruk';
import {
  hizliHarcamaAction,
  hizliKiloAction,
  hizliSuAction,
  hizliUykuAction,
} from '@/server/actions/hizli-ekle';

async function gonder(k: KuyrukKaydi, oturumKapali: () => void): Promise<GonderimSonucu> {
  const sonuc =
    k.tur === 'harcama'
      ? await hizliHarcamaAction(k.girdi)
      : k.tur === 'kilo'
        ? await hizliKiloAction(k.girdi)
        : k.tur === 'uyku'
          ? await hizliUykuAction(k.girdi)
          : await hizliSuAction(k.girdi);
  if (sonuc.ok) return 'tamam';
  if (sonuc.error.code === 'VALIDATION_ERROR') return 'red';
  // Oturum düşmüş ya da sınıra takılmış: bütün sıra için geçerli, sonra yeniden denenir.
  if (sonuc.error.code === 'UNAUTHORIZED') {
    oturumKapali();
    return 'bekle';
  }
  if (sonuc.error.code === 'RATE_LIMITED') return 'bekle';
  // Bu kayda özgü sunucu hatası: arkasındakileri bekletmez, deneme sayılır.
  return 'atla';
}

/**
 * ÇEVRİMDIŞI ŞERİDİ (2026-10-31): service worker'ı kurar, bağlantı durumunu ve
 * bekleyen kayıtları gösterir, bağlantı gelince kuyruğu gönderir. Geliştirmede
 * service worker kurulmaz (HMR ile çakışır).
 */
export function CevrimdisiSeridi() {
  const router = useRouter();
  const [cevrimdisi, setCevrimdisi] = useState(false);
  const [bekleyen, setBekleyen] = useState(0);
  const [reddedilen, setReddedilen] = useState<KuyrukKaydi[]>([]);
  const [oturumKapali, setOturumKapali] = useState(false);
  const [acik, setAcik] = useState(false);
  const [liste, setListe] = useState<KuyrukKaydi[]>([]);
  const isleniyor = useRef(false);

  const isle = useCallback(async () => {
    const kayitlar = kuyruguOku();
    if (isleniyor.current || !navigator.onLine || kayitlar.length === 0) return;
    isleniyor.current = true;
    setOturumKapali(false);
    const {
      kalan,
      gonderilen,
      reddedilen: red,
    } = await kuyruguIsle(kayitlar, (k) => gonder(k, () => setOturumKapali(true)));
    // Gönderim sürerken eklenen kayıtlar üzerine yazılmasın.
    const islenen = new Set(kayitlar.map((k) => k.id));
    const simdiki = kuyruguOku();
    const duruyor = new Set(simdiki.map((k) => k.id));
    // Gönderim sürerken silinen kayıt geri gelmesin.
    kuyruguYaz([
      ...kalan.filter((k) => duruyor.has(k.id)),
      ...simdiki.filter((k) => !islenen.has(k.id)),
    ]);
    isleniyor.current = false;
    if (red.length > 0) {
      const tumu = [...reddedilenleriOku(), ...red];
      reddedilenleriYaz(tumu);
      setReddedilen(tumu);
    }
    if (gonderilen > 0) router.refresh();
  }, [router]);

  useEffect(() => {
    // Chrome'un yükleme olayı sayfa açılırken bir kez gelir; panelin her ekranında yakalanır.
    kurulumIstemiDinle();
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    }
    const guncelle = () => {
      setCevrimdisi(!navigator.onLine);
      setBekleyen(kuyruguOku().length);
      setListe(kuyruguOku());
    };
    setReddedilen(reddedilenleriOku());
    const baglandi = () => {
      guncelle();
      void isle();
    };
    const gorunur = () => {
      if (document.visibilityState === 'visible') void isle();
    };
    guncelle();
    void isle();
    window.addEventListener('online', baglandi);
    window.addEventListener('offline', guncelle);
    window.addEventListener(KUYRUK_OLAYI, guncelle);
    document.addEventListener('visibilitychange', gorunur);
    return () => {
      window.removeEventListener('online', baglandi);
      window.removeEventListener('offline', guncelle);
      window.removeEventListener(KUYRUK_OLAYI, guncelle);
      document.removeEventListener('visibilitychange', gorunur);
    };
  }, [isle]);

  if (!cevrimdisi && bekleyen === 0 && reddedilen.length === 0) return null;

  const ac = () => {
    setListe(kuyruguOku());
    setAcik((a) => !a);
  };
  const sil = (id: string) => {
    kuyruguYaz(kuyruguOku().filter((k) => k.id !== id));
    setListe(kuyruguOku());
    setBekleyen(kuyruguOku().length);
  };

  const metin =
    reddedilen.length > 0 && bekleyen === 0 && !cevrimdisi
      ? `${reddedilen.length} kayıt eklenemedi`
      : [
          cevrimdisi ? 'Bağlantı yok' : null,
          oturumKapali ? 'Oturum kapandı' : null,
          bekleyen > 0 ? `${bekleyen} kayıt bekliyor` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <div
      data-yazdirmada-gizle
      className="fixed top-[calc(env(safe-area-inset-top)+4.5rem)] left-1/2 z-40 flex w-max max-w-[90vw] -translate-x-1/2 flex-col items-center gap-2"
    >
      <button
        type="button"
        onClick={ac}
        aria-expanded={acik}
        aria-label={`${metin}: ayrıntılar`}
        className="focus-ring bg-primary text-canvas flex min-h-9 max-w-full items-center gap-2 rounded-full px-4 py-2 text-xs font-medium shadow-lg"
      >
        {cevrimdisi ? (
          <CloudOff className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <RefreshCw className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span role="status" className="truncate">
          {metin}
        </span>
      </button>

      {acik && (
        <div
          role="dialog"
          aria-label="Bekleyen kayıtlar"
          className="bg-surface border-line rounded-card flex max-h-[60vh] w-80 max-w-[90vw] flex-col gap-3 overflow-y-auto border p-4 text-sm shadow-xl"
        >
          {oturumKapali && (
            <p className="text-warning">
              Kayıtlar cihazda duruyor; giriş yapınca gönderilir.{' '}
              <Link href="/giris" className="focus-ring font-medium underline">
                Giriş yap
              </Link>
            </p>
          )}
          {liste.length > 0 && (
            <ul className="divide-line flex flex-col divide-y">
              {liste.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-primary tabular min-w-0">{kayitOzeti(k)}</span>
                  <button
                    type="button"
                    onClick={() => sil(k.id)}
                    aria-label={`${kayitOzeti(k)}: sil`}
                    className="focus-ring text-danger min-h-10 shrink-0 rounded-full px-3 font-medium"
                  >
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}
          {reddedilen.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-danger font-medium">Eklenemedi, yeniden girmen gerekiyor:</p>
              <ul className="flex flex-col gap-1">
                {reddedilen.map((k) => (
                  <li key={k.id} className="text-primary tabular">
                    {kayitOzeti(k)}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  reddedilenleriYaz([]);
                  setReddedilen([]);
                  setAcik(false);
                }}
                className="focus-ring bg-elevated text-body min-h-10 self-start rounded-full px-4 font-medium"
              >
                Tamam
              </button>
            </div>
          )}
          {liste.length === 0 && reddedilen.length === 0 && (
            <p className="text-muted">Bekleyen kayıt yok.</p>
          )}
        </div>
      )}
    </div>
  );
}
