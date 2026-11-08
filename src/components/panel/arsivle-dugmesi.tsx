'use client';

import { Archive, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button, buttonClasses } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-error';
import type { ApiResponse } from '@/types';

/**
 * ARŞİVLEME DESENİ — ADR-017: PANELDE SİLME YOK.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN "SİL" YAZMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kayıtlar silinmiyor, ARŞİVLENİYOR. Düğmenin üstünde "Sil" yazsaydı kullanıcı
 * geri dönüşü olmayan bir işlem yaptığını sanırdı — ve bu iki yönde de yanlış:
 * korkup arşivlemeyi kullanmaz ya da "nasıl olsa sildim" diye yanlış kayda
 * güvenir. Onay metni ne olduğunu AÇIKÇA söylüyor: kayıt listelerden çıkar,
 * geçmişte durur, geri alınabilir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ONAY NEDEN KALICI KATMAN (modal) DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Arşivleme GERİ ALINABİLİR bir işlem; ekranı karartan bir kalıcı katman
 * ağırlığıyla orantısız olurdu. Onay yerinde açılıyor: düğme, "Emin misin?"
 * satırına dönüşüyor. Odak otomatik olarak onay düğmesine geçiyor, ESC
 * vazgeçiyor — yani klavye kullanıcısı için modalin verdiği her şey var,
 * odak tuzağının maliyeti yok.
 */
export function ArsivleDugmesi({
  kayitAdi,
  arsivle,
  etiket = 'Arşivle',
  className,
}: {
  /** Onay metninde geçecek ad: "Rezervasyon paneli arşivlensin mi?" */
  kayitAdi: string;
  /** §7.2 zarfı döndüren çağrı. Fırlatırsa ağ hatası dalına düşer. */
  arsivle: () => Promise<ApiResponse<unknown>>;
  etiket?: string;
  className?: string;
}) {
  const [onayda, setOnayda] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const onayDugmesi = useRef<HTMLButtonElement>(null);

  /* Onay açılınca odak onay düğmesine — klavye kullanıcısı Tab'la aramasın. */
  useEffect(() => {
    if (onayda) onayDugmesi.current?.focus();
  }, [onayda]);

  useEffect(() => {
    if (!onayda) return;
    const tusla = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') setOnayda(false);
    };
    document.addEventListener('keydown', tusla);
    return () => document.removeEventListener('keydown', tusla);
  }, [onayda]);

  const onayla = async () => {
    setCalisiyor(true);
    setHata(null);
    try {
      const sonuc = await arsivle();
      if (sonuc.ok) {
        setOnayda(false);
      } else {
        setHata(sonuc.error.message);
      }
    } catch {
      setHata('Arşivlenemedi — bağlantı kurulamadı. Kayıt olduğu gibi duruyor.');
    } finally {
      setCalisiyor(false);
    }
  };

  if (!onayda) {
    return (
      <div className={className}>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOnayda(true)}>
          <Archive className="size-4" aria-hidden="true" />
          {etiket}
        </Button>
        {hata && <FormAlert className="mt-2">{hata}</FormAlert>}
      </div>
    );
  }

  return (
    <div
      /*
       * `role="group"` + `aria-label`: bu bir diyalog değil, satır içi bir onay.
       * `alertdialog` demek ekran okuyucuya odak tuzağı vaadi verirdi.
       */
      role="group"
      aria-label={`${kayitAdi} arşivleme onayı`}
      className={className}
    >
      <div className="border-line bg-elevated rounded-card flex flex-col gap-3 border p-3">
        <p className="text-body text-sm">
          <span className="text-primary font-medium">{kayitAdi}</span> arşivlensin mi? Kayıt
          listelerden çıkar ama <span className="text-primary font-medium">silinmez</span> —
          geçmişte durur ve geri alınabilir.
        </p>

        {hata && <FormAlert>{hata}</FormAlert>}

        <div className="flex flex-wrap gap-2">
          <button
            ref={onayDugmesi}
            type="button"
            disabled={calisiyor}
            onClick={() => void onayla()}
            className={buttonClasses({ variant: 'danger', size: 'sm' })}
          >
            {calisiyor ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Archive className="size-4" aria-hidden="true" />
            )}
            {calisiyor ? 'Arşivleniyor…' : 'Evet, arşivle'}
          </button>

          <Button type="button" variant="ghost" size="sm" onClick={() => setOnayda(false)}>
            Vazgeç
          </Button>
        </div>
      </div>
    </div>
  );
}
