'use client';

import { Pause, Pencil, Play } from 'lucide-react';
import { useEffect, useState, useTransition, type FormEvent } from 'react';

import { sureBicim } from '@/components/panel/hayat-bicim';
import { sayacBaslatAction, sayacDurdurAction } from '@/server/actions/habit';

const HIZLI_EKLE = [15, 30] as const;
const EN_COK_DK = 1440;

/** Saniye → "12:04" ya da "1:02:04". SAF. */
function sayacBicim(saniye: number): string {
  const s = Math.floor(saniye / 3600);
  const d = Math.floor((saniye % 3600) / 60);
  const sn = saniye % 60;
  const ikiHane = (n: number) => String(n).padStart(2, '0');
  return s > 0 ? `${s}:${ikiHane(d)}:${ikiHane(sn)}` : `${d}:${ikiHane(sn)}`;
}

/** Metin → dakika; geçersizse `null`. SAF. */
function dakikaOku(metin: string, enAz: number): number | null {
  if (!/^\d{1,4}$/.test(metin.trim())) return null;
  const dk = Number(metin);
  return dk >= enAz && dk <= EN_COK_DK ? dk : null;
}

/**
 * SÜRELİ ALIŞKANLIK (2026-11-02): "kitap oku 30 dk". Üç yol: yaparken sayaç, unutulduysa
 * sonradan ekleme, yanlış yazıldıysa toplamı düzeltme. Hedefin üstü de yazılır ve gösterilir.
 *
 * Sayaç sunucuda; bu bileşen yalnızca geçen süreyi çizer, kapanıp açılınca kaldığı yerden
 * sürer. Süre yalnızca istemcide hesaplanır: sunucu saatiyle çizilirse hidrasyon uyuşmaz.
 */
export function SureBolumu({
  habitId,
  gun,
  baslangic,
  setBaslangic,
  yenile,
  hedef,
  count,
  renk,
  bekliyor,
  bugunMu,
  ekle,
  duzelt,
  sayacSonucu,
}: {
  habitId: string;
  gun: string;
  baslangic: string | null;
  setBaslangic: (deger: string | null) => void;
  yenile: () => void;
  hedef: number;
  count: number;
  renk: string;
  bekliyor: boolean;
  bugunMu: boolean;
  ekle: (dakika: number) => void;
  duzelt: (toplam: number) => void;
  sayacSonucu: (yeniToplam: number) => void;
}) {
  const [simdi, setSimdi] = useState<number | null>(null);
  const [duzenle, setDuzenle] = useState(false);
  const [deger, setDeger] = useState('');
  const [uzunDk, setUzunDk] = useState<number | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [sayacBekliyor, basla] = useTransition();

  useEffect(() => {
    if (!baslangic) return;
    setSimdi(Date.now());
    const zaman = window.setInterval(() => setSimdi(Date.now()), 1000);
    return () => window.clearInterval(zaman);
  }, [baslangic]);

  const gecenSn =
    baslangic && simdi ? Math.max(0, Math.floor((simdi - Date.parse(baslangic)) / 1000)) : 0;
  // Geçmiş günün satırına bugün akan sayaç eklenmez; sayaç yalnızca bugünde görünür.
  const sayacGorunur = bugunMu && baslangic !== null;
  const goster = count + (sayacGorunur ? Math.floor(gecenSn / 60) : 0);
  const fazla = goster - hedef;
  const mesgul = bekliyor || sayacBekliyor;

  const baslat = () => {
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await sayacBaslatAction({ habitId });
        if (!sonuc.ok) return setHata(sonuc.error.message);
        setBaslangic(sonuc.data.baslangic);
        yenile();
      } catch {
        setHata('Bağlantı kurulamadı. Yeniden dene.');
      }
    });
  };

  const durdur = (dakika?: number) => {
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await sayacDurdurAction({ habitId, dakika });
        if (!sonuc.ok) return setHata(sonuc.error.message);
        if (sonuc.data.durum === 'UZUN') {
          setUzunDk(sonuc.data.gecenDk);
          setDeger('');
          return;
        }
        setBaslangic(null);
        setSimdi(null);
        setUzunDk(null);
        setDeger('');
        // Sayaç başka günde başladıysa süre o güne yazıldı; bu satırın toplamı değişmez.
        if (sonuc.data.durum === 'KAYDEDILDI' && sonuc.data.sonuc.date === gun) {
          sayacSonucu(sonuc.data.sonuc.count);
        }
      } catch {
        setHata('Bağlantı kurulamadı. Yeniden dene.');
      }
    });
  };

  const uzunKaydet = (e: FormEvent) => {
    e.preventDefault();
    const dk = dakikaOku(deger, 0);
    if (dk === null) return setHata(`0 ile ${EN_COK_DK} arasında dakika yaz.`);
    durdur(dk);
  };

  const duzeltKaydet = (e: FormEvent) => {
    e.preventDefault();
    const dk = dakikaOku(deger, 0);
    if (dk === null) return setHata(`0 ile ${EN_COK_DK} arasında dakika yaz.`);
    setHata(null);
    setDuzenle(false);
    duzelt(dk);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="tabular text-primary text-lg font-semibold">{sureBicim(goster)}</span>
        <span className="tabular text-muted text-xs">hedef {sureBicim(hedef)}</span>
      </div>

      <div className="bg-elevated h-2 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${Math.min(100, (goster / Math.max(1, hedef)) * 100)}%`,
            backgroundColor: renk,
          }}
        />
      </div>

      {fazla > 0 && (
        <p className="tabular text-success text-xs font-medium">
          Hedefin {sureBicim(fazla)} üstünde
        </p>
      )}

      {uzunDk !== null ? (
        <form onSubmit={uzunKaydet} className="flex flex-col gap-2">
          <p role="status" className="text-warning text-sm">
            Sayaç {sureBicim(uzunDk)} açık kalmış. Gerçekte kaç dakika yaptın?
          </p>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor={`uzun-${habitId}`}>
              Yapılan süre (dakika)
            </label>
            <input
              id={`uzun-${habitId}`}
              inputMode="numeric"
              value={deger}
              onChange={(e) => setDeger(e.target.value)}
              placeholder="dk"
              className="focus-ring rounded-input border-line-strong bg-elevated text-primary tabular h-10 w-20 border px-3 text-sm"
            />
            <button
              type="submit"
              disabled={mesgul}
              className="focus-ring rounded-btn bg-gradient-accent min-h-10 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              Kaydet
            </button>
            <button
              type="button"
              disabled={mesgul}
              onClick={() => durdur(0)}
              className="focus-ring rounded-btn text-muted min-h-10 px-3 text-sm disabled:opacity-60"
            >
              Kaydetmeden kapat
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {sayacGorunur ? (
            <button
              type="button"
              disabled={mesgul}
              onClick={() => durdur()}
              className="focus-ring rounded-btn bg-gradient-accent tabular flex min-h-10 items-center gap-2 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              <Pause className="size-4" aria-hidden="true" />
              Durdur · {sayacBicim(gecenSn)}
            </button>
          ) : (
            bugunMu && (
              <button
                type="button"
                disabled={mesgul}
                onClick={baslat}
                className="focus-ring rounded-btn border-accent/35 bg-accent/6 text-accent flex min-h-10 items-center gap-2 border px-4 text-sm font-medium disabled:opacity-60"
              >
                <Play className="size-4" aria-hidden="true" />
                Başlat
              </button>
            )
          )}

          {HIZLI_EKLE.map((dk) => (
            <button
              key={dk}
              type="button"
              disabled={mesgul}
              aria-label={`${dk} dakika ekle`}
              onClick={() => ekle(dk)}
              className="focus-ring bg-elevated text-body tabular min-h-10 rounded-full px-3 text-sm font-medium transition-transform active:scale-95 disabled:opacity-60"
            >
              +{dk}
            </button>
          ))}

          <button
            type="button"
            aria-label="Süreyi yaz"
            aria-expanded={duzenle}
            onClick={() => {
              setDuzenle(!duzenle);
              setDeger(String(count));
              setHata(null);
            }}
            className="focus-ring text-muted hover:text-primary flex size-10 items-center justify-center rounded-full"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {duzenle && uzunDk === null && (
        <form onSubmit={duzeltKaydet} className="flex items-center gap-2">
          <label className="text-muted text-xs" htmlFor={`toplam-${habitId}`}>
            Günün toplamı (dk)
          </label>
          <input
            id={`toplam-${habitId}`}
            inputMode="numeric"
            value={deger}
            onChange={(e) => setDeger(e.target.value)}
            className="focus-ring rounded-input border-line-strong bg-elevated text-primary tabular h-10 w-20 border px-3 text-sm"
          />
          <button
            type="submit"
            disabled={mesgul}
            className="focus-ring rounded-btn bg-gradient-accent min-h-10 px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            Kaydet
          </button>
        </form>
      )}

      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}
    </div>
  );
}
