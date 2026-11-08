'use client';

import { ImageUp, LoaderCircle, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';

import { SaglikFormu } from '@/components/panel/saglik-formu';
import { tartiGorseliOkuAction } from '@/server/actions/saglik-ai';
import type { TartiOnerisi } from '@/server/services/saglik-ai';

/**
 * TARTI EKRANINDAN KAYIT (2026-10-30).
 *
 * Akıllı tartı uygulamasının ekran görüntüsü seçilir → tarayıcıda en uzun
 * kenarı 1568 px'e küçültülüp JPEG'e çevrilir (Claude'un görsel tavanı; iPhone
 * ekran görüntüsü ~3 MB PNG, bu ~250 KB) → Claude değerleri okur → form o
 * değerlerle DOLU açılır. KAYIT KULLANICININ "Ekle"siyle olur; okuma tek
 * başına hiçbir şey yazmaz.
 *
 * Görsel sunucuda saklanmaz (bkz. `services/saglik-ai.ts`).
 */

const UZUN_KENAR = 1568;

async function kucult(dosya: File): Promise<string> {
  const bitmap = await createImageBitmap(dosya);
  const oran = Math.min(1, UZUN_KENAR / Math.max(bitmap.width, bitmap.height));
  const tuval = document.createElement('canvas');
  tuval.width = Math.round(bitmap.width * oran);
  tuval.height = Math.round(bitmap.height * oran);
  const ctx = tuval.getContext('2d');
  if (!ctx) throw new Error('tuval yok');
  ctx.drawImage(bitmap, 0, 0, tuval.width, tuval.height);
  bitmap.close();
  // `data:image/jpeg;base64,` önekini at — eylem yalın base64 bekliyor.
  return tuval.toDataURL('image/jpeg', 0.85).split(',')[1] ?? '';
}

export function TartiIleKayit({ gun }: { gun: string }) {
  const girdi = useRef<HTMLInputElement>(null);
  const [durum, setDurum] = useState<'bos' | 'okunuyor' | 'hata'>('bos');
  const [hata, setHata] = useState('');
  const [oneri, setOneri] = useState<TartiOnerisi | null>(null);
  // Her okumada formu yeniden kur — varsayılanlar yalnızca ilk kurulumda okunur.
  const [surum, setSurum] = useState(0);

  const sec = async (dosya: File | undefined) => {
    if (!dosya) return;
    setDurum('okunuyor');
    setHata('');
    try {
      const data = await kucult(dosya);
      const sonuc = await tartiGorseliOkuAction({ data, mediaType: 'image/jpeg' });
      if (sonuc.ok) {
        setOneri(sonuc.data);
        setSurum((s) => s + 1);
        setDurum('bos');
      } else {
        setHata(sonuc.error.message);
        setDurum('hata');
      }
    } catch {
      setHata('Görsel açılamadı. PNG ya da JPEG bir ekran görüntüsü dene.');
      setDurum('hata');
    } finally {
      if (girdi.current) girdi.current.value = '';
    }
  };

  const okunuyor = durum === 'okunuyor';

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-card border-accent/30 bg-accent/5 flex flex-col gap-3 border p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="text-accent mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-body text-sm">
            Tartı uygulamasının ekran görüntüsünü yükle; değerleri okuyup formu doldurayım.
            Kaydetmeden önce kontrol et.
          </p>
        </div>
        <input
          ref={girdi}
          type="file"
          accept="image/*"
          className="sr-only"
          id="tarti-gorseli"
          onChange={(e) => void sec(e.target.files?.[0])}
          disabled={okunuyor}
        />
        <label
          htmlFor="tarti-gorseli"
          aria-disabled={okunuyor}
          className="focus-ring rounded-btn bg-accent flex min-h-12 cursor-pointer items-center justify-center gap-2 px-4 font-medium text-white active:opacity-80 aria-disabled:cursor-wait aria-disabled:opacity-70"
        >
          {okunuyor ? (
            <>
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
              Okunuyor…
            </>
          ) : (
            <>
              <ImageUp className="size-5" aria-hidden="true" />
              {oneri ? 'Başka görsel yükle' : 'Ekran görüntüsü yükle'}
            </>
          )}
        </label>
        <p role="status" className="text-sm">
          {durum === 'hata' && <span className="text-danger">{hata}</span>}
          {oneri && durum === 'bos' && (
            <span className="text-success">Değerler forma yazıldı — kontrol edip ekle.</span>
          )}
        </p>
      </section>

      <SaglikFormu key={surum} gun={gun} oneri={oneri ?? undefined} />
    </div>
  );
}
