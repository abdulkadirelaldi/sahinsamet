'use client';

import { Plus, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { tutarOku, tutarYaz } from '@/components/panel/cuzdan-bicim';
import { paraBicim } from '@/components/panel/para-bicim';
import { HARCAMA_KATEGORILERI } from '@/lib/schemas/wallet';
import { cn } from '@/lib/utils/cn';
import { butceKoyAction } from '@/server/actions/cuzdan';
import type { ButceSatiri } from '@/server/services/cuzdan';

type Kategori = (typeof HARCAMA_KATEGORILERI)[number];

/** %100 üstü kırmızı, %80 üstü turuncu, altı yeşil. SAF. */
function ton(yuzde: number | null): string {
  // Durum belirteçleri METİN kontrastı için koyu; çubukta canlı tonlar.
  if (yuzde === null) return 'bg-accent';
  if (yuzde > 100) return 'bg-rose-500';
  return yuzde >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
}

/**
 * AYLIK BÜTÇE (2026-10-31) — kategori başına limit ve bu ayki harcama.
 * Satıra dokununca limit düzenlenir; kategoriler `HARCAMA_KATEGORILERI`nden.
 */
export function ButceKarti({ satirlar }: { satirlar: ButceSatiri[] }) {
  const router = useRouter();
  const [acik, setAcik] = useState<string | null>(null);
  const [deger, setDeger] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  const mevcut = new Set(satirlar.filter((s) => s.limitTl !== null).map((s) => s.kategori));
  const eklenebilir = HARCAMA_KATEGORILERI.filter((k) => !mevcut.has(k));

  const ac = (kategori: string, limitTl: string | null) => {
    setAcik(kategori);
    setDeger(limitTl ? tutarYaz(limitTl) : '');
    setHata(null);
  };

  const kaydet = async (kategori: string, limitTl: string | null) => {
    setBekliyor(true);
    setHata(null);
    try {
      const sonuc = await butceKoyAction({ kategori: kategori as Kategori, limitTl });
      if (sonuc.ok) {
        setAcik(null);
        router.refresh();
      } else setHata(sonuc.error.message);
    } catch {
      setHata('Bağlantı kurulamadı. Yeniden dene.');
    } finally {
      setBekliyor(false);
    }
  };

  const duzenleyici = (kategori: string, varMi: boolean) => (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const t = tutarOku(deger);
        if (!t) return setHata('Tutar geçersiz — örn. 5.000');
        void kaydet(kategori, t);
      }}
    >
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`butce-${kategori}`}>
          {kategori} aylık limiti (₺)
        </label>
        <input
          id={`butce-${kategori}`}
          inputMode="decimal"
          autoFocus
          value={deger}
          onChange={(e) => setDeger(e.target.value)}
          placeholder="Aylık limit ₺"
          className="focus-ring rounded-input border-line-strong bg-elevated text-primary tabular h-11 min-w-0 flex-1 border px-3"
        />
        <button
          type="submit"
          disabled={bekliyor}
          className="focus-ring rounded-btn bg-gradient-accent h-11 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          Kaydet
        </button>
      </div>
      <div className="flex gap-3 text-sm">
        <button
          type="button"
          onClick={() => setAcik(null)}
          className="focus-ring text-muted min-h-10 rounded px-2"
        >
          Vazgeç
        </button>
        {varMi && (
          <button
            type="button"
            disabled={bekliyor}
            onClick={() => void kaydet(kategori, null)}
            className="focus-ring text-danger min-h-10 rounded px-2"
          >
            Limiti kaldır
          </button>
        )}
      </div>
    </form>
  );

  return (
    <section
      aria-labelledby="butce-baslik"
      className="rounded-card border-line bg-surface flex flex-col gap-4 border p-4"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-[0.6rem] bg-linear-to-br from-emerald-500 to-teal-500 text-white">
          <Target className="size-4" aria-hidden="true" />
        </span>
        <h2 id="butce-baslik" className="text-primary text-base font-semibold">
          Bu ayın bütçesi
        </h2>
      </div>

      {satirlar.length === 0 && (
        <p className="text-muted text-sm">
          Market, yemek, ulaşım… kategori başına aylık limit koy; harcadıkça dolsun.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {satirlar.map((s) => (
          <li key={s.kategori} className="flex flex-col gap-1.5">
            {acik === s.kategori ? (
              <>
                <span className="text-primary text-sm font-medium">{s.kategori}</span>
                {duzenleyici(s.kategori, s.limitTl !== null)}
              </>
            ) : (
              <button
                type="button"
                onClick={() => ac(s.kategori, s.limitTl)}
                className="focus-ring flex flex-col gap-1.5 rounded-lg text-left"
              >
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-primary font-medium">{s.kategori}</span>
                  <span className="tabular text-muted text-xs">
                    <span className="text-primary font-semibold">
                      {paraBicim(s.harcananTl, 'TRY')}
                    </span>
                    {s.limitTl ? ` / ${paraBicim(s.limitTl, 'TRY')}` : ' · limit koy'}
                  </span>
                </span>
                {s.yuzde !== null && (
                  <span className="bg-elevated block h-2 overflow-hidden rounded-full">
                    <span
                      className={cn('block h-full rounded-full', ton(s.yuzde))}
                      style={{ width: `${Math.min(100, s.yuzde)}%` }}
                    />
                  </span>
                )}
                {s.kalanTl?.startsWith('-') && (
                  <span className="tabular text-danger text-xs font-medium">
                    {paraBicim(s.kalanTl.slice(1), 'TRY')} aşıldı
                  </span>
                )}
              </button>
            )}
          </li>
        ))}
      </ul>

      {acik !== null && !satirlar.some((s) => s.kategori === acik) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-primary text-sm font-medium">{acik}</span>
          {duzenleyici(acik, false)}
        </div>
      )}

      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}

      {acik === null && eklenebilir.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted flex items-center gap-1 text-xs">
            <Plus className="size-3.5" aria-hidden="true" />
            Bütçe ekle
          </span>
          {eklenebilir.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => ac(k, null)}
              className="focus-ring border-line text-body min-h-10 rounded-full border px-3 text-xs"
            >
              {k}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
